import type { InvoiceStatus } from "@/lib/invoice-status";

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function shouldMarkOverdue(status: InvoiceStatus, dueDate: Date, now = new Date()) {
  if (status !== "SENT") return false;
  return dueDate.getTime() < startOfUtcDay(now).getTime();
}
