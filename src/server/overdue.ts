import "server-only";

import { invoiceTotals, asQuantity } from "@/lib/invoice-math";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { shouldMarkOverdue } from "@/lib/overdue";
import { recordActivity } from "@/server/activity";
import { moneyLine, notifyWorkspace, overdueMessage } from "@/server/notify";

export async function syncOverdueInvoices(workspaceId?: string) {
  const invoices = await prisma.invoice.findMany({
    where: { status: "SENT", ...(workspaceId ? { workspaceId } : {}) },
    include: { client: true, items: true, workspace: true },
  });

  let updated = 0;
  for (const invoice of invoices) {
    if (!shouldMarkOverdue("SENT", invoice.dueDate)) continue;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "OVERDUE" },
    });
    const totals = invoiceTotals(
      invoice.items.map((item) => ({
        quantity: asQuantity(item.quantity),
        unitPriceCents: item.unitPriceCents,
      })),
      Number(invoice.taxRate),
    );
    await recordActivity({
      workspaceId: invoice.workspaceId,
      type: "invoice.status",
      summary: `Invoice ${invoice.number} for ${invoice.client.name} is overdue.`,
      entityType: "invoice",
      entityId: invoice.id,
    });
    if (invoice.workspace.telegramNotify && !invoice.overdueNotifiedAt) {
      await notifyWorkspace(
        invoice.workspace,
        overdueMessage({
          number: invoice.number,
          client: invoice.client.name,
          total: moneyLine(totals.totalCents, invoice.workspace.currency),
          due: formatDate(invoice.dueDate),
        }),
      );
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { overdueNotifiedAt: new Date() },
      });
    }
    updated += 1;
  }
  return updated;
}
