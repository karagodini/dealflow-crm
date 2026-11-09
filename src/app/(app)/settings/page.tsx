import { SettingsScreen } from "@/components/settings-screen";
import { PageHeader } from "@/components/ui-bits";
import { getAiConfig } from "@/lib/ai";
import { canConfigurePipeline, canManageWorkspace } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { telegramConfigured } from "@/lib/telegram";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const [members, invites, stages] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
    }),
  ]);
  const ai = getAiConfig();

  return (
    <div>
      <PageHeader
        eyebrow={ctx.workspace.name}
        title="Settings"
        description="Workspace, team, pipeline, and notifications."
      />
      <SettingsScreen
        canManage={canManageWorkspace(ctx.membership.role)}
        canEditPipeline={canConfigurePipeline(ctx.membership.role)}
        isOwner={ctx.membership.role === "OWNER"}
        workspace={{
          name: ctx.workspace.name,
          currency: ctx.workspace.currency,
          invoicePrefix: ctx.workspace.invoicePrefix,
          telegramChatId: ctx.workspace.telegramChatId ?? "",
          telegramNotify: ctx.workspace.telegramNotify,
        }}
        members={members.map((member) => ({
          id: member.id,
          name: member.user.name ?? "Member",
          email: member.user.email ?? "",
          role: member.role,
          self: member.userId === ctx.user.id,
        }))}
        invites={invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
        }))}
        stages={stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
          isWon: stage.isWon,
          isLost: stage.isLost,
        }))}
        ai={{ enabled: Boolean(ai), model: ai?.model ?? null, baseUrl: ai?.baseUrl ?? null }}
        telegramReady={telegramConfigured()}
      />
    </div>
  );
}
