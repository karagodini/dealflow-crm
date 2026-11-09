"use server";

import { revalidatePath } from "next/cache";

import {
  canChangeRole,
  canConfigurePipeline,
  canManageTeam,
  canManageWorkspace,
  canRemoveMember,
} from "@/lib/permissions";
import { validateStages, type StageDraft } from "@/lib/pipeline-rules";
import { prisma } from "@/lib/prisma";
import { inviteSchema, telegramSchema, workspaceSchema } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { recordActivity } from "@/server/activity";
import { requireWorkspace, setWorkspaceCookie } from "@/server/context";

function refreshSettings() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
}

export async function switchWorkspace(workspaceId: string) {
  const ctx = await requireWorkspace();
  const membership = ctx.memberships.find((item) => item.workspaceId === workspaceId);
  if (!membership) return;
  await setWorkspaceCookie(workspaceId);
  revalidatePath("/", "layout");
}

export async function updateWorkspace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!canManageWorkspace(ctx.membership.role))
    return { error: "You cannot change workspace settings." };
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
    invoicePrefix: formData.get("invoicePrefix"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      name: parsed.data.name,
      currency: parsed.data.currency,
      invoicePrefix: parsed.data.invoicePrefix.toUpperCase(),
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "workspace.updated",
    summary: `${ctx.user.name ?? "Someone"} updated workspace settings.`,
  });
  refreshSettings();
  return {};
}

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!canManageTeam(ctx.membership.role)) return { error: "You cannot invite people." };
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") || "MEMBER",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspace.id, userId: user.id } },
    });
    if (existing) return { error: "That person is already on the team." };
    await prisma.workspaceMember.create({
      data: { workspaceId: ctx.workspace.id, userId: user.id, role: parsed.data.role },
    });
  } else {
    await prisma.invite.upsert({
      where: { workspaceId_email: { workspaceId: ctx.workspace.id, email } },
      update: { role: parsed.data.role },
      create: { workspaceId: ctx.workspace.id, email, role: parsed.data.role },
    });
  }
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "member.invited",
    summary: `${ctx.user.name ?? "Someone"} invited ${email} as ${parsed.data.role.toLowerCase()}.`,
  });
  refreshSettings();
  return {};
}

export async function updateMemberRole(
  memberId: string,
  role: "OWNER" | "ADMIN" | "MEMBER",
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ctx.workspace.id },
    include: { user: true },
  });
  if (!member) return { error: "That person is not on the team." };
  const ownerCount = await prisma.workspaceMember.count({
    where: { workspaceId: ctx.workspace.id, role: "OWNER" },
  });
  if (!canChangeRole({ actor: ctx.membership.role, target: member.role, next: role, ownerCount })) {
    return { error: "That role change is not allowed." };
  }
  await prisma.workspaceMember.update({ where: { id: member.id }, data: { role } });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "member.updated",
    summary: `${ctx.user.name ?? "Someone"} set ${member.user.name ?? member.user.email} to ${role.toLowerCase()}.`,
  });
  refreshSettings();
  return {};
}

export async function removeMember(memberId: string): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ctx.workspace.id },
    include: { user: true },
  });
  if (!member) return { error: "That person is not on the team." };
  const ownerCount = await prisma.workspaceMember.count({
    where: { workspaceId: ctx.workspace.id, role: "OWNER" },
  });
  if (
    !canRemoveMember({
      actor: ctx.membership.role,
      target: member.role,
      ownerCount,
      isSelf: member.userId === ctx.user.id,
    })
  ) {
    return { error: "That person cannot be removed." };
  }
  await prisma.workspaceMember.delete({ where: { id: member.id } });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "member.updated",
    summary: `${ctx.user.name ?? "Someone"} removed ${member.user.name ?? member.user.email}.`,
  });
  refreshSettings();
  return {};
}

export async function saveStages(stages: StageDraft[]): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!canConfigurePipeline(ctx.membership.role))
    return { error: "You cannot change the pipeline." };
  const problem = validateStages(stages);
  if (problem) return { error: problem };

  const existing = await prisma.pipelineStage.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { deals: true } } },
  });
  const incomingIds = new Set(stages.map((stage) => stage.id).filter(Boolean));
  const removing = existing.filter((stage) => !incomingIds.has(stage.id));
  const blocked = removing.find((stage) => stage._count.deals > 0);
  if (blocked) return { error: `Move deals out of “${blocked.name}” before removing it.` };

  await prisma.$transaction(async (tx) => {
    if (removing.length > 0) {
      await tx.pipelineStage.deleteMany({
        where: { id: { in: removing.map((stage) => stage.id) } },
      });
    }
    for (const [position, stage] of stages.entries()) {
      const slot = 1000 + position;
      if (stage.id && existing.some((item) => item.id === stage.id)) {
        await tx.pipelineStage.update({
          where: { id: stage.id },
          data: {
            name: stage.name.trim(),
            color: stage.color,
            isWon: stage.isWon,
            isLost: stage.isLost,
            position: slot,
          },
        });
      } else {
        await tx.pipelineStage.create({
          data: {
            workspaceId: ctx.workspace.id,
            name: stage.name.trim(),
            color: stage.color,
            isWon: stage.isWon,
            isLost: stage.isLost,
            position: slot,
          },
        });
      }
    }
    const saved = await tx.pipelineStage.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { position: "asc" },
    });
    for (const [position, stage] of saved.entries()) {
      await tx.pipelineStage.update({ where: { id: stage.id }, data: { position } });
    }
  });

  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "stage.updated",
    summary: `${ctx.user.name ?? "Someone"} updated the pipeline.`,
  });
  refreshSettings();
  return {};
}

export async function updateTelegram(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!canManageWorkspace(ctx.membership.role))
    return { error: "You cannot change notifications." };
  const parsed = telegramSchema.safeParse({
    telegramChatId: formData.get("telegramChatId")?.toString() ?? "",
    telegramNotify: formData.get("telegramNotify") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const chatId = parsed.data.telegramChatId?.trim() || null;
  if (parsed.data.telegramNotify && !chatId) {
    return { error: "Add a Telegram chat id before turning notifications on." };
  }
  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: { telegramChatId: chatId, telegramNotify: parsed.data.telegramNotify },
  });
  refreshSettings();
  return {};
}
