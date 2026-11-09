"use server";

import { formatDate, labelize } from "@/lib/format";
import { completeChat, getAiConfig } from "@/lib/ai";
import { asQuantity, invoiceTotals } from "@/lib/invoice-math";
import { formatMoney } from "@/lib/money";
import { buildDraftPrompt, buildSummaryPrompt, type ClientBrief } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { draftSchema } from "@/lib/validators";
import type { ActionState } from "@/server/action-state";
import { requireWorkspace } from "@/server/context";

async function loadBrief(workspaceId: string, clientId: string, studio: string, currency: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId },
    include: {
      contacts: { orderBy: { name: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 12, include: { author: true } },
      deals: { orderBy: { updatedAt: "desc" }, take: 8, include: { stage: true } },
      invoices: { orderBy: { issueDate: "desc" }, take: 8, include: { items: true } },
      tasks: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!client) return null;
  const brief: ClientBrief = {
    studio,
    currency,
    clientName: client.name,
    company: client.company,
    status: labelize(client.status),
    email: client.email,
    website: client.website,
    contacts: client.contacts.map((contact) => ({
      name: contact.name,
      title: contact.title,
      email: contact.email,
    })),
    notes: client.notes.map((note) => ({
      at: formatDate(note.createdAt),
      author: note.author.name ?? "Team",
      body: note.body,
    })),
    deals: client.deals.map((deal) => ({
      title: deal.title,
      stage: deal.stage.name,
      value: formatMoney(deal.valueCents, currency),
      description: deal.description,
    })),
    invoices: client.invoices.map((invoice) => {
      const totals = invoiceTotals(
        invoice.items.map((item) => ({
          quantity: asQuantity(item.quantity),
          unitPriceCents: item.unitPriceCents,
        })),
        Number(invoice.taxRate),
      );
      return {
        number: invoice.number,
        status: labelize(invoice.status),
        total: formatMoney(totals.totalCents, currency),
        due: formatDate(invoice.dueDate),
      };
    }),
    tasks: client.tasks.map((task) => ({
      title: task.title,
      status: labelize(task.status),
      due: task.dueDate ? formatDate(task.dueDate) : null,
    })),
  };
  return brief;
}

export async function summarizeClient(clientId: string): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!getAiConfig()) return { error: "Drafting is off until AI_API_KEY is set." };
  const brief = await loadBrief(
    ctx.workspace.id,
    clientId,
    ctx.workspace.name,
    ctx.workspace.currency,
  );
  if (!brief) return { error: "That client is not in this workspace." };
  try {
    const prompt = buildSummaryPrompt(brief);
    const text = await completeChat([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]);
    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Drafting failed.";
    return { error: message };
  }
}

export async function draftForClient(
  clientId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspace();
  if (!getAiConfig()) return { error: "Drafting is off until AI_API_KEY is set." };
  const parsed = draftSchema.safeParse({
    request: formData.get("request"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const brief = await loadBrief(
    ctx.workspace.id,
    clientId,
    ctx.workspace.name,
    ctx.workspace.currency,
  );
  if (!brief) return { error: "That client is not in this workspace." };
  try {
    const prompt = buildDraftPrompt(brief, parsed.data.request, parsed.data.intent);
    const text = await completeChat([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]);
    return { text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Drafting failed.";
    return { error: message };
  }
}
