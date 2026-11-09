import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceEditor } from "@/components/invoice-editor";
import { PageHeader, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, toDateInput } from "@/lib/format";
import { asQuantity, invoiceTotals } from "@/lib/invoice-math";
import { formatMoney } from "@/lib/money";
import { canTransitionInvoice } from "@/lib/invoice-status";
import { prisma } from "@/lib/prisma";
import { setInvoiceStatus } from "@/server/actions/invoices";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const invoice = await prisma.invoice.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { client: true, items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();
  const [clients, deals] = await Promise.all([
    prisma.client.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { name: "asc" } }),
    prisma.deal.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { title: "asc" } }),
  ]);
  const totals = invoiceTotals(
    invoice.items.map((item) => ({
      quantity: asQuantity(item.quantity),
      unitPriceCents: item.unitPriceCents,
    })),
    Number(invoice.taxRate),
  );
  const transitions = (["SENT", "PAID", "VOID"] as const).filter((status) =>
    canTransitionInvoice(invoice.status, status),
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={invoice.client.name}
        title={invoice.number}
        description={`Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        action={<StatusBadge value={invoice.status} />}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/api/invoices/${invoice.id}/pdf`}>Download PDF</Link>
        </Button>
        {transitions.map((status) => (
          <form key={status} action={setInvoiceStatus.bind(null, invoice.id, status)}>
            <Button type="submit" variant={status === "VOID" ? "ghost" : "default"}>
              {status === "SENT" ? "Mark sent" : status === "PAID" ? "Mark paid" : "Void"}
            </Button>
          </form>
        ))}
      </div>
      {invoice.status === "DRAFT" ? (
        <InvoiceEditor
          mode="edit"
          invoiceId={invoice.id}
          currency={ctx.workspace.currency}
          clients={clients.map((client) => ({ id: client.id, label: client.name }))}
          deals={deals.map((deal) => ({ id: deal.id, label: deal.title }))}
          defaults={{
            clientId: invoice.clientId,
            dealId: invoice.dealId ?? "",
            issueDate: toDateInput(invoice.issueDate),
            dueDate: toDateInput(invoice.dueDate),
            taxRate: Number(invoice.taxRate).toString(),
            notes: invoice.notes ?? "",
            items: invoice.items.map((item) => ({
              description: item.description,
              quantity: asQuantity(item.quantity).toString(),
              unitPrice: (item.unitPriceCents / 100).toFixed(2),
            })),
          }}
        />
      ) : (
        <Card>
          <CardContent className="grid gap-4 pt-4">
            {invoice.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <div>
                  <p>{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {asQuantity(item.quantity)} ×{" "}
                    {formatMoney(item.unitPriceCents, ctx.workspace.currency)}
                  </p>
                </div>
                <p className="tabular-nums">
                  {formatMoney(
                    Math.round(asQuantity(item.quantity) * item.unitPriceCents),
                    ctx.workspace.currency,
                  )}
                </p>
              </div>
            ))}
            <div className="border-t border-border pt-3 text-right">
              <p className="text-sm text-muted-foreground">
                Tax {formatMoney(totals.taxCents, ctx.workspace.currency)}
              </p>
              <p className="font-serif text-3xl tabular-nums">
                {formatMoney(totals.totalCents, ctx.workspace.currency)}
              </p>
            </div>
            {invoice.notes ? (
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
