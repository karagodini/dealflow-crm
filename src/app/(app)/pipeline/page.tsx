import { DealBoard } from "@/components/deal-board";
import { DealDialog } from "@/components/record-forms";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const ctx = await requireWorkspace();
  const [stages, deals, clients, members] = await Promise.all([
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
    }),
    prisma.deal.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { client: true, owner: true },
      orderBy: { position: "asc" },
    }),
    prisma.client.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { name: "asc" } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Drag a card when the conversation moves. Stages are configured in settings."
        action={
          <DealDialog
            clients={clients.map((client) => ({ id: client.id, label: client.name }))}
            stages={stages.map((stage) => ({ id: stage.id, label: stage.name }))}
            members={members.map((member) => ({
              id: member.userId,
              label: member.user.name ?? member.user.email ?? "Member",
            }))}
          />
        }
      />
      {clients.length === 0 ? (
        <EmptyState
          title="Add a client first"
          body="Deals belong to a client. Create one, then open the first deal."
        />
      ) : (
        <DealBoard
          key={deals.map((deal) => `${deal.id}:${deal.stageId}:${deal.position}`).join("|")}
          currency={ctx.workspace.currency}
          stages={stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            color: stage.color,
            isWon: stage.isWon,
            isLost: stage.isLost,
          }))}
          deals={deals.map((deal) => ({
            id: deal.id,
            title: deal.title,
            valueCents: deal.valueCents,
            clientName: deal.client.name,
            ownerName: deal.owner?.name ?? null,
            stageId: deal.stageId,
          }))}
        />
      )}
    </div>
  );
}
