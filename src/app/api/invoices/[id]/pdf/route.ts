import { formatDate } from "@/lib/format";
import { asQuantity, invoiceTotals, lineTotalCents } from "@/lib/invoice-math";
import { formatMoneyPlain } from "@/lib/money";
import { labelize } from "@/lib/format";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/server/context";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workspaceContext = await getWorkspaceContext();
  if (!workspaceContext) return new Response("Sign in required", { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: workspaceContext.workspace.id },
    include: { client: true, items: { orderBy: { position: "asc" } }, workspace: true },
  });
  if (!invoice) return new Response("Not found", { status: 404 });

  const currency = invoice.workspace.currency;
  const totals = invoiceTotals(
    invoice.items.map((item) => ({
      quantity: asQuantity(item.quantity),
      unitPriceCents: item.unitPriceCents,
    })),
    Number(invoice.taxRate),
  );
  const bytes = await renderInvoicePdf({
    studio: invoice.workspace.name,
    number: invoice.number,
    status: labelize(invoice.status),
    issueDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    notes: invoice.notes,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: asQuantity(item.quantity).toString(),
      unitPrice: formatMoneyPlain(item.unitPriceCents, currency),
      total: formatMoneyPlain(
        lineTotalCents({
          quantity: asQuantity(item.quantity),
          unitPriceCents: item.unitPriceCents,
        }),
        currency,
      ),
    })),
    subtotal: formatMoneyPlain(totals.subtotalCents, currency),
    taxLabel: `Tax ${Number(invoice.taxRate)}%`,
    tax: formatMoneyPlain(totals.taxCents, currency),
    total: formatMoneyPlain(totals.totalCents, currency),
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
