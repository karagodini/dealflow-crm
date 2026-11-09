"use server";

import { revalidatePath } from "next/cache";

import { parseDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { blankToUndefined, taskSchema } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { recordActivity } from "@/server/activity";
import { requireWorkspace } from "@/server/context";

function refreshTasks() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

async function linkedIds(
  workspaceId: string,
  input: { clientId?: string; dealId?: string; assigneeId?: string },
) {
  if (input.clientId) {
    const client = await prisma.client.findFirst({ where: { id: input.clientId, workspaceId } });
    if (!client) return { error: "Choose a client from this workspace." as const };
  }
  if (input.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: input.dealId, workspaceId } });
    if (!deal) return { error: "Choose a deal from this workspace." as const };
  }
  if (input.assigneeId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: input.assigneeId },
    });
    if (!member) return { error: "Choose someone on the team." as const };
  }
  return { error: null };
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: blankToUndefined(formData.get("description")),
    status: formData.get("status") || "OPEN",
    priority: formData.get("priority") || "NORMAL",
    dueDate: blankToUndefined(formData.get("dueDate")),
    clientId: blankToUndefined(formData.get("clientId")),
    dealId: blankToUndefined(formData.get("dealId")),
    assigneeId: blankToUndefined(formData.get("assigneeId")),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const due = parsed.data.dueDate ? parseDateInput(parsed.data.dueDate) : null;
  if (parsed.data.dueDate && !due) return { fieldErrors: { dueDate: ["Choose a valid date."] } };
  const links = await linkedIds(ctx.workspace.id, parsed.data);
  if (links.error) return { error: links.error };

  const task = await prisma.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: due,
      clientId: parsed.data.clientId || null,
      dealId: parsed.data.dealId || null,
      assigneeId: parsed.data.assigneeId || null,
      completedAt: parsed.data.status === "DONE" ? new Date() : null,
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "task.created",
    summary: `${ctx.user.name ?? "Someone"} added the task “${task.title}”.`,
    entityType: "task",
    entityId: task.id,
  });
  refreshTasks();
  return {};
}

export async function setTaskStatus(taskId: string, status: "OPEN" | "IN_PROGRESS" | "DONE") {
  const ctx = await requireWorkspace();
  const task = await prisma.task.findFirst({
    where: { id: taskId, workspaceId: ctx.workspace.id },
  });
  if (!task) return;
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status,
      completedAt: status === "DONE" ? (task.completedAt ?? new Date()) : null,
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "task.updated",
    summary:
      status === "DONE"
        ? `${ctx.user.name ?? "Someone"} finished “${task.title}”.`
        : `${ctx.user.name ?? "Someone"} moved “${task.title}” to ${status === "IN_PROGRESS" ? "in progress" : "open"}.`,
    entityType: "task",
    entityId: task.id,
  });
  refreshTasks();
}
