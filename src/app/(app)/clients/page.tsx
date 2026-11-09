import Link from "next/link";

import { ClientDialog } from "@/components/record-forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const ctx = await requireWorkspace();
  const clients = await prisma.client.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { deals: true, invoices: true } } },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        description="Everyone the studio is selling to or working with."
        action={<ClientDialog />}
      />
      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="Add the first company or person. Deals and invoices hang off this record."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Deals</TableHead>
                <TableHead>Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                    {client.company ? (
                      <p className="text-xs text-muted-foreground">{client.company}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={client.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                  <TableCell>{client._count.deals}</TableCell>
                  <TableCell>{client._count.invoices}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
