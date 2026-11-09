import { notFound } from "next/navigation";

import { DealEditor } from "@/components/record-forms";
import { PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { toDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteDeal } from "@/server/actions/deals";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Deal" };

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const deal = await prisma.deal.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { client: true, stage: true, owner: true },
  });
  if (!deal) notFound();
  const [clients, stages, members] = await Promise.all([
    prisma.client.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { name: "asc" } }),
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: true },
    }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div>
        <PageHeader eyebrow={deal.client.name} title={deal.title} description={deal.stage.name} />
        <Card>
          <CardHeader>
            <CardTitle>Deal</CardTitle>
          </CardHeader>
          <CardContent>
            <DealEditor
              deal={{
                id: deal.id,
                title: deal.title,
                value: (deal.valueCents / 100).toFixed(2),
                clientId: deal.clientId,
                stageId: deal.stageId,
                ownerId: deal.ownerId ?? "",
                expectedClose: toDateInput(deal.expectedClose),
                description: deal.description ?? "",
              }}
              clients={clients.map((client) => ({ id: client.id, label: client.name }))}
              stages={stages.map((stage) => ({ id: stage.id, label: stage.name }))}
              members={members.map((member) => ({
                id: member.userId,
                label: member.user.name ?? member.user.email ?? "Member",
              }))}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Value</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-serif text-3xl tabular-nums">
            {formatMoney(deal.valueCents, ctx.workspace.currency)}
          </p>
          <form action={deleteDeal.bind(null, deal.id)} className="mt-6">
            <Button type="submit" variant="destructive">
              Remove deal
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
