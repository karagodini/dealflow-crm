export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "OVERDUE", "VOID"],
  OVERDUE: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus) {
  return TRANSITIONS[from].includes(to);
}

export function isOpenInvoice(status: InvoiceStatus) {
  return status === "SENT" || status === "OVERDUE";
}

export function isCollectible(status: InvoiceStatus) {
  return status === "SENT" || status === "OVERDUE" || status === "DRAFT";
}
