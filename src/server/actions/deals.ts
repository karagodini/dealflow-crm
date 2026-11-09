"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dollarsToCents, formatMoney } from "@/lib/money";
import { closedAtForMove, insertAt } from "@/lib/pipeline-rules";
import { prisma } from "@/lib/prisma";
import { blankToUndefined, dealSchema } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { recordActivity } from "@/server/activity";
import { requireWorkspace } from "@/server/context";
import { dealMovedMessage, moneyLine, notifyWorkspace } from "@/server/notify";

function refreshDeals(id?: string) {
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  revalidatePath("/clients");
  if (id) revalidatePath(`/deals/${id}`);
}

async function assertClient(workspaceId: string, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, workspaceId } });
}

async function assertStage(workspaceId: string, stageId: string) {
  return prisma.pipelineStage.findFirst({ where: { id: stageId, workspaceId } });
}

async function assertOwner(workspaceId: string, ownerId: string | undefined) {
  if (!ownerId) return null;
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: ownerId },
    include: { user: true },
  });
  return member?.user ?? null;
}

export async function createDeal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    stageId: formData.get("stageId"),
    value: formData.get("value"),
    expectedClose: blankToUndefined(formData.get("expectedClose")),
    description: blankToUndefined(formData.get("description")),
    ownerId: blankToUndefined(formData.get("ownerId")),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const cents = dollarsToCents(parsed.data.value);
  if (cents === null) return { fieldErrors: { value: ["Enter a value like 4800 or 4800.50."] } };

  const client = await assertClient(ctx.workspace.id, parsed.data.clientId);
  const stage = await assertStage(ctx.workspace.id, parsed.data.stageId);
  if (!client || !stage) return { error: "Choose a client and stage from this workspace." };
  const owner = await assertOwner(ctx.workspace.id, parsed.data.ownerId);
  if (parsed.data.ownerId && !owner) return { error: "That owner is not on the team." };

  const last = await prisma.deal.findFirst({
    where: { workspaceId: ctx.workspace.id, stageId: stage.id },
    orderBy: { position: "desc" },
  });
  const now = new Date();
  const deal = await prisma.deal.create({
    data: {
      workspaceId: ctx.workspace.id,
      clientId: client.id,
      stageId: stage.id,
      ownerId: owner?.id,
      title: parsed.data.title,
      valueCents: cents,
      description: parsed.data.description || null,
      expectedClose: parsed.data.expectedClose
        ? new Date(`${parsed.data.expectedClose}T12:00:00.000Z`)
        : null,
      position: (last?.position ?? -1) + 1,
      closedAt: closedAtForMove(stage, null, now),
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "deal.created",
    summary: `${ctx.user.name ?? "Someone"} opened “${deal.title}” with ${client.name}.`,
    entityType: "deal",
    entityId: deal.id,
  });
  refreshDeals(deal.id);
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(
  dealId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, workspaceId: ctx.workspace.id },
    include: { stage: true, client: true },
  });
  if (!deal) return { error: "That deal is not in this workspace." };

  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId") || deal.clientId,
    stageId: formData.get("stageId") || deal.stageId,
    value: formData.get("value"),
    expectedClose: blankToUndefined(formData.get("expectedClose")),
    description: blankToUndefined(formData.get("description")),
    ownerId: blankToUndefined(formData.get("ownerId")),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const cents = dollarsToCents(parsed.data.value);
  if (cents === null) return { fieldErrors: { value: ["Enter a value like 4800 or 4800.50."] } };

  const client = await assertClient(ctx.workspace.id, parsed.data.clientId);
  const stage = await assertStage(ctx.workspace.id, parsed.data.stageId);
  if (!client || !stage) return { error: "Choose a client and stage from this workspace." };
  const owner = await assertOwner(ctx.workspace.id, parsed.data.ownerId);
  if (parsed.data.ownerId && !owner) return { error: "That owner is not on the team." };

  const stageChanged = stage.id !== deal.stageId;
  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      title: parsed.data.title,
      clientId: client.id,
      stageId: stage.id,
      ownerId: owner?.id ?? null,
      valueCents: cents,
      description: parsed.data.description || null,
      expectedClose: parsed.data.expectedClose
        ? new Date(`${parsed.data.expectedClose}T12:00:00.000Z`)
        : null,
      closedAt: stageChanged ? closedAtForMove(stage, deal.closedAt, new Date()) : deal.closedAt,
    },
  });

  if (stageChanged) {
    await recordActivity({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      type: "deal.moved",
      summary: `${ctx.user.name ?? "Someone"} moved “${parsed.data.title}” from ${deal.stage.name} to ${stage.name}.`,
      entityType: "deal",
      entityId: deal.id,
    });
    await notifyWorkspace(
      ctx.workspace,
      dealMovedMessage({
        title: parsed.data.title,
        client: client.name,
        from: deal.stage.name,
        to: stage.name,
        value: moneyLine(cents, ctx.workspace.currency),
      }),
    );
  } else {
    await recordActivity({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      type: "deal.updated",
      summary: `${ctx.user.name ?? "Someone"} updated “${parsed.data.title}”.`,
      entityType: "deal",
      entityId: deal.id,
    });
  }
  refreshDeals(deal.id);
  return {};
}

export async function moveDeal(
  dealId: string,
  stageId: string,
  index: number,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, workspaceId: ctx.workspace.id },
    include: { stage: true, client: true },
  });
  const stage = await assertStage(ctx.workspace.id, stageId);
  if (!deal || !stage) return { error: "That move is not available." };
  if (!Number.isInteger(index)) return { error: "That move is not available." };

  const siblings = await prisma.deal.findMany({
    where: { workspaceId: ctx.workspace.id, stageId: stage.id, NOT: { id: deal.id } },
    orderBy: { position: "asc" },
  });
  const ordered = insertAt(siblings, deal, index);
  const now = new Date();
  const stageChanged = deal.stageId !== stage.id;

  await prisma.$transaction(
    ordered.map((item, position) =>
      prisma.deal.update({
        where: { id: item.id },
        data: {
          position,
          ...(item.id === deal.id
            ? { stageId: stage.id, closedAt: closedAtForMove(stage, deal.closedAt, now) }
            : {}),
        },
      }),
    ),
  );

  if (stageChanged) {
    await recordActivity({
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      type: "deal.moved",
      summary: `${ctx.user.name ?? "Someone"} moved “${deal.title}” from ${deal.stage.name} to ${stage.name}.`,
      entityType: "deal",
      entityId: deal.id,
    });
    await notifyWorkspace(
      ctx.workspace,
      dealMovedMessage({
        title: deal.title,
        client: deal.client.name,
        from: deal.stage.name,
        to: stage.name,
        value: formatMoney(deal.valueCents, ctx.workspace.currency),
      }),
    );
  }
  refreshDeals(deal.id);
  return {};
}

export async function deleteDeal(dealId: string) {
  const ctx = await requireWorkspace();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, workspaceId: ctx.workspace.id },
  });
  if (!deal) return;
  await prisma.deal.delete({ where: { id: deal.id } });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "deal.deleted",
    summary: `${ctx.user.name ?? "Someone"} removed “${deal.title}”.`,
    entityType: "deal",
    entityId: deal.id,
  });
  refreshDeals();
  redirect("/pipeline");
}
