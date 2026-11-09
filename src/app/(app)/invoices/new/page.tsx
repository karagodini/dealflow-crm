import { InvoiceEditor } from "@/components/invoice-editor";
import { PageHeader } from "@/components/ui-bits";
import { toDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const ctx = await requireWorkspace();
  const [clients, deals] = await Promise.all([
    prisma.client.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { name: "asc" } }),
    prisma.deal.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { title: "asc" } }),
  ]);
  const today = new Date();
  const due = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  return (
    <div>
      <PageHeader
        eyebrow="Money"
        title="New invoice"
        description="A draft stays private until you mark it sent."
      />
      <InvoiceEditor
        mode="create"
        currency={ctx.workspace.currency}
        clients={clients.map((client) => ({ id: client.id, label: client.name }))}
        deals={deals.map((deal) => ({ id: deal.id, label: deal.title }))}
        defaults={{
          clientId: "",
          dealId: "",
          issueDate: toDateInput(today),
          dueDate: toDateInput(due),
          taxRate: "0",
          notes: "",
          items: [{ description: "", quantity: "1", unitPrice: "" }],
        }}
      />
    </div>
  );
}
