import Link from "next/link";

import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { asQuantity, invoiceTotals } from "@/lib/invoice-math";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";
import { syncOverdueInvoices } from "@/server/overdue";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const ctx = await requireWorkspace();
  await syncOverdueInvoices(ctx.workspace.id);
  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { client: true, items: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="Invoices"
        description="Drafts, sent bills, and what is still outstanding."
        action={
          <Button asChild>
            <Link href="/invoices/new">New invoice</Link>
          </Button>
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Create a draft when a piece of work is ready to bill."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const total = invoiceTotals(
                  invoice.items.map((item) => ({
                    quantity: asQuantity(item.quantity),
                    unitPriceCents: item.unitPriceCents,
                  })),
                  Number(invoice.taxRate),
                ).totalCents;
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.client.name}</TableCell>
                    <TableCell>
                      <StatusBadge value={invoice.status} />
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(total, ctx.workspace.currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
