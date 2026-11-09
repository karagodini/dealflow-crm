"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageWorkspace } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { blankToUndefined, clientSchema, contactSchema, noteSchema } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { recordActivity } from "@/server/activity";
import { requireWorkspace } from "@/server/context";

function refreshClient(id?: string) {
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  if (id) revalidatePath(`/clients/${id}`);
}

export async function createClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: blankToUndefined(formData.get("company")) ?? "",
    email: blankToUndefined(formData.get("email")) ?? "",
    phone: blankToUndefined(formData.get("phone")) ?? "",
    website: blankToUndefined(formData.get("website")) ?? "",
    status: formData.get("status") || "LEAD",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const client = await prisma.client.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      status: parsed.data.status,
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "client.created",
    summary: `${ctx.user.name ?? "Someone"} added ${client.name}.`,
    entityType: "client",
    entityId: client.id,
  });
  refreshClient(client.id);
  redirect(`/clients/${client.id}`);
}

export async function updateClient(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const existing = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspace.id },
  });
  if (!existing) return { error: "That client is not in this workspace." };

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    company: blankToUndefined(formData.get("company")) ?? "",
    email: blankToUndefined(formData.get("email")) ?? "",
    phone: blankToUndefined(formData.get("phone")) ?? "",
    website: blankToUndefined(formData.get("website")) ?? "",
    status: formData.get("status") || existing.status,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.client.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      status: parsed.data.status,
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "client.updated",
    summary: `${ctx.user.name ?? "Someone"} updated ${parsed.data.name}.`,
    entityType: "client",
    entityId: existing.id,
  });
  refreshClient(existing.id);
  return {};
}

export async function deleteClient(clientId: string) {
  const ctx = await requireWorkspace();
  if (!canManageWorkspace(ctx.membership.role)) return;
  const existing = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspace.id },
  });
  if (!existing) return;
  await prisma.client.delete({ where: { id: existing.id } });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "client.deleted",
    summary: `${ctx.user.name ?? "Someone"} removed ${existing.name}.`,
    entityType: "client",
    entityId: existing.id,
  });
  refreshClient();
  redirect("/clients");
}

export async function addNote(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspace.id },
  });
  if (!client) return { error: "That client is not in this workspace." };
  const parsed = noteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await prisma.note.create({
    data: { clientId: client.id, authorId: ctx.user.id, body: parsed.data.body },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "note.added",
    summary: `${ctx.user.name ?? "Someone"} noted something on ${client.name}.`,
    entityType: "client",
    entityId: client.id,
  });
  refreshClient(client.id);
  return {};
}

export async function addContact(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: ctx.workspace.id },
  });
  if (!client) return { error: "That client is not in this workspace." };
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: blankToUndefined(formData.get("email")) ?? "",
    phone: blankToUndefined(formData.get("phone")) ?? "",
    title: blankToUndefined(formData.get("title")) ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await prisma.contact.create({
    data: {
      clientId: client.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      title: parsed.data.title || null,
    },
  });
  refreshClient(client.id);
  return {};
}
