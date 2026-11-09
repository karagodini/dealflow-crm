"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseDateInput } from "@/lib/format";
import { canTransitionInvoice, type InvoiceStatus } from "@/lib/invoice-status";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { blankToUndefined, invoiceSchema, readItems } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { recordActivity } from "@/server/activity";
import { requireWorkspace } from "@/server/context";

function refreshInvoice(id?: string) {
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  if (id) revalidatePath(`/invoices/${id}`);
}

async function allocateNumber(workspaceId: string) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { nextInvoiceNumber: { increment: 1 } },
  });
  const issued = workspace.nextInvoiceNumber - 1;
  return `${workspace.invoicePrefix}-${String(issued).padStart(4, "0")}`;
}

function parseInvoice(formData: FormData) {
  return invoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    dealId: blankToUndefined(formData.get("dealId")),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    taxRate: formData.get("taxRate") || "0",
    notes: blankToUndefined(formData.get("notes")),
    items: readItems(formData.get("items")),
  });
}

function pricedItems(items: { description: string; quantity: number; unitPrice: string }[]) {
  const priced = [];
  for (const item of items) {
    const unitPriceCents = dollarsToCents(item.unitPrice);
    if (unitPriceCents === null)
      return { error: "Enter rates like 150 or 150.00." as const, items: [] };
    priced.push({
      description: item.description,
      quantity: item.quantity,
      unitPriceCents,
    });
  }
  return { error: null, items: priced };
}

export async function createInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const parsed = parseInvoice(formData);
  if (!parsed.success)
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: parsed.error.issues[0]?.message,
    };
  const issueDate = parseDateInput(parsed.data.issueDate);
  const dueDate = parseDateInput(parsed.data.dueDate);
  if (!issueDate || !dueDate) return { error: "Choose valid dates." };
  if (dueDate.getTime() < issueDate.getTime())
    return { error: "Due date cannot be before the issue date." };
  const priced = pricedItems(parsed.data.items);
  if (priced.error || !priced.items) return { error: priced.error ?? "Check the line items." };

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, workspaceId: ctx.workspace.id },
  });
  if (!client) return { error: "Choose a client from this workspace." };
  if (parsed.data.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: parsed.data.dealId, workspaceId: ctx.workspace.id },
    });
    if (!deal) return { error: "Choose a deal from this workspace." };
  }

  const number = await allocateNumber(ctx.workspace.id);
  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: ctx.workspace.id,
      clientId: client.id,
      dealId: parsed.data.dealId || null,
      number,
      issueDate,
      dueDate,
      taxRate: parsed.data.taxRate,
      notes: parsed.data.notes || null,
      items: {
        create: priced.items.map((item, position) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          position,
        })),
      },
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "invoice.created",
    summary: `${ctx.user.name ?? "Someone"} drafted ${invoice.number} for ${client.name}.`,
    entityType: "invoice",
    entityId: invoice.id,
  });
  refreshInvoice(invoice.id);
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoice(
  invoiceId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: ctx.workspace.id },
  });
  if (!invoice) return { error: "That invoice is not in this workspace." };
  if (invoice.status !== "DRAFT") return { error: "Only drafts can be edited." };

  const parsed = parseInvoice(formData);
  if (!parsed.success)
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: parsed.error.issues[0]?.message,
    };
  const issueDate = parseDateInput(parsed.data.issueDate);
  const dueDate = parseDateInput(parsed.data.dueDate);
  if (!issueDate || !dueDate) return { error: "Choose valid dates." };
  if (dueDate.getTime() < issueDate.getTime())
    return { error: "Due date cannot be before the issue date." };
  const priced = pricedItems(parsed.data.items);
  if (priced.error || !priced.items) return { error: priced.error ?? "Check the line items." };

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, workspaceId: ctx.workspace.id },
  });
  if (!client) return { error: "Choose a client from this workspace." };

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        clientId: client.id,
        dealId: parsed.data.dealId || null,
        issueDate,
        dueDate,
        taxRate: parsed.data.taxRate,
        notes: parsed.data.notes || null,
        items: {
          create: priced.items.map((item, position) => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position,
          })),
        },
      },
    }),
  ]);
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "invoice.updated",
    summary: `${ctx.user.name ?? "Someone"} updated ${invoice.number}.`,
    entityType: "invoice",
    entityId: invoice.id,
  });
  refreshInvoice(invoice.id);
  return {};
}

export async function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  const ctx = await requireWorkspace();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: ctx.workspace.id },
  });
  if (!invoice) return;
  if (!canTransitionInvoice(invoice.status, status)) return;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : invoice.paidAt,
    },
  });
  await recordActivity({
    workspaceId: ctx.workspace.id,
    actorId: ctx.user.id,
    type: "invoice.status",
    summary: `${ctx.user.name ?? "Someone"} marked ${invoice.number} ${status.toLowerCase()}.`,
    entityType: "invoice",
    entityId: invoice.id,
  });
  refreshInvoice(invoice.id);
}
