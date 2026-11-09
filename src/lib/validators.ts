import { z } from "zod";

import { supportedCurrencies } from "@/lib/money";

const currency = z.enum(supportedCurrencies());

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(160),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include a letter.")
    .regex(/[0-9]/, "Include a number.")
    .max(128),
  workspaceName: z.string().trim().min(2, "Name the workspace.").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  callbackUrl: z.string().optional(),
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter a client name.").max(120),
  company: z.string().trim().max(120).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]).optional(),
  phone: z.string().trim().max(40).optional(),
  website: z
    .union([z.literal(""), z.string().trim().url("Enter a full URL, including https://.")])
    .optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter a contact name.").max(120),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]).optional(),
  phone: z.string().trim().max(40).optional(),
  title: z.string().trim().max(80).optional(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(2, "Write a note.").max(4000),
});

export const dealSchema = z.object({
  title: z.string().trim().min(2, "Name the deal.").max(140),
  clientId: z.string().trim().min(1, "Choose a client."),
  stageId: z.string().trim().min(1, "Choose a stage."),
  value: z.string().trim().min(1, "Enter a value."),
  expectedClose: z.string().trim().optional(),
  description: z.string().trim().max(4000).optional(),
  ownerId: z.string().trim().optional(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Name the task.").max(160),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  dueDate: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  assigneeId: z.string().trim().optional(),
});

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(2, "Describe the line.").max(200),
  quantity: z.coerce.number().positive("Quantity must be greater than zero.").max(100000),
  unitPrice: z.string().trim().min(1, "Enter a rate."),
});

export const invoiceSchema = z.object({
  clientId: z.string().trim().min(1, "Choose a client."),
  dealId: z.string().trim().optional(),
  issueDate: z.string().trim().min(1, "Choose an issue date."),
  dueDate: z.string().trim().min(1, "Choose a due date."),
  taxRate: z.coerce.number().min(0, "Tax cannot be negative.").max(100, "Tax cannot exceed 100."),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(invoiceItemSchema).min(1, "Add a line item.").max(40),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Name the workspace.").max(80),
  currency,
  invoicePrefix: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters.")
    .max(8)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, or hyphens."),
});

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(["ADMIN", "MEMBER"]),
});

export const telegramSchema = z.object({
  telegramChatId: z.string().trim().max(32).optional(),
  telegramNotify: z.boolean(),
});

export const draftSchema = z.object({
  request: z.string().trim().min(8, "Add a bit more about what they asked.").max(4000),
  intent: z.enum(["proposal", "reply"]),
});

export function blankToUndefined(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function safeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function readItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
