import Link from "next/link";
import { notFound } from "next/navigation";

import { AiPanel } from "@/components/ai-panel";
import { ContactForm, EditClientForm, NoteForm } from "@/components/record-forms";
import { PageHeader, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiConfig } from "@/lib/ai";
import { formatDate, formatRelative } from "@/lib/format";
import { asQuantity, invoiceTotals } from "@/lib/invoice-math";
import { formatMoney } from "@/lib/money";
import { canManageWorkspace } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteClient } from "@/server/actions/clients";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const client = await prisma.client.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      deals: { include: { stage: true }, orderBy: { updatedAt: "desc" } },
      invoices: { include: { items: true }, orderBy: { issueDate: "desc" } },
      tasks: { where: { status: { not: "DONE" } }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!client) notFound();

  return (
    <div>
      <PageHeader
        eyebrow="Client"
        title={client.name}
        description={
          [client.company, client.email, client.website].filter(Boolean).join(" · ") ||
          "No contact details yet."
        }
        action={<StatusBadge value={client.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <EditClientForm client={client} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <NoteForm clientId={client.id} />
              {client.notes.map((note) => (
                <article key={note.id} className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">
                    {note.author.name ?? "Team"} · {formatRelative(note.createdAt)}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{note.body}</p>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6">
          <AiPanel clientId={client.id} enabled={Boolean(getAiConfig())} />
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {client.contacts.map((contact) => (
                <div key={contact.id}>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[contact.title, contact.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
              <ContactForm clientId={client.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {client.deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between gap-3 hover:underline"
                >
                  <span>{deal.title}</span>
                  <span className="text-muted-foreground">{deal.stage.name}</span>
                </Link>
              ))}
              {client.deals.length === 0 ? (
                <p className="text-muted-foreground">No deals yet.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {client.invoices.map((invoice) => {
                const total = invoiceTotals(
                  invoice.items.map((item) => ({
                    quantity: asQuantity(item.quantity),
                    unitPriceCents: item.unitPriceCents,
                  })),
                  Number(invoice.taxRate),
                ).totalCents;
                return (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{invoice.number}</span>
                    <span className="tabular-nums">
                      {formatMoney(total, ctx.workspace.currency)}
                    </span>
                  </Link>
                );
              })}
              {client.invoices.length === 0 ? (
                <p className="text-muted-foreground">No invoices yet.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open tasks</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {client.tasks.map((task) => (
                <div key={task.id} className="flex justify-between gap-3">
                  <span>{task.title}</span>
                  <span className="text-muted-foreground">
                    {task.dueDate ? formatDate(task.dueDate) : ""}
                  </span>
                </div>
              ))}
              {client.tasks.length === 0 ? (
                <p className="text-muted-foreground">Nothing open.</p>
              ) : null}
            </CardContent>
          </Card>
          {canManageWorkspace(ctx.membership.role) ? (
            <form action={deleteClient.bind(null, client.id)}>
              <Button type="submit" variant="destructive">
                Remove client
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
