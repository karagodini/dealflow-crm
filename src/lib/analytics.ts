export type MoneyInvoice = {
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  totalCents: number;
  paidAt: Date | null;
};

export type StageDeal = {
  valueCents: number;
  won: boolean;
  lost: boolean;
  stageName: string;
  closedAt: Date | null;
};

export type MonthBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthBuckets(now: Date, count = 6): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({ key, label: MONTHS[start.getUTCMonth()] ?? "", start, end });
  }
  return buckets;
}

export function monthlyPaidRevenue(invoices: MoneyInvoice[], buckets: MonthBucket[]) {
  return buckets.map((bucket) => {
    const paidCents = invoices.reduce((sum, invoice) => {
      if (invoice.status !== "PAID" || !invoice.paidAt) return sum;
      const paid = invoice.paidAt.getTime();
      if (paid >= bucket.start.getTime() && paid < bucket.end.getTime()) {
        return sum + invoice.totalCents;
      }
      return sum;
    }, 0);
    return { key: bucket.key, label: bucket.label, paidCents };
  });
}

export function revenueBetween(invoices: MoneyInvoice[], start: Date, end: Date) {
  return invoices.reduce((sum, invoice) => {
    if (invoice.status !== "PAID" || !invoice.paidAt) return sum;
    const paid = invoice.paidAt.getTime();
    if (paid >= start.getTime() && paid < end.getTime()) return sum + invoice.totalCents;
    return sum;
  }, 0);
}

export function outstandingCents(invoices: MoneyInvoice[]) {
  return invoices.reduce((sum, invoice) => {
    if (invoice.status === "SENT" || invoice.status === "OVERDUE") return sum + invoice.totalCents;
    return sum;
  }, 0);
}

export function openPipelineValue(deals: StageDeal[]) {
  return deals.reduce((sum, deal) => (deal.won || deal.lost ? sum : sum + deal.valueCents), 0);
}

export function winRate(deals: { won: boolean; lost: boolean }[]) {
  const closed = deals.filter((deal) => deal.won || deal.lost);
  if (closed.length === 0) return null;
  return closed.filter((deal) => deal.won).length / closed.length;
}

export function pipelineByStage(deals: StageDeal[]) {
  const totals = new Map<string, number>();
  for (const deal of deals) {
    if (deal.won || deal.lost) continue;
    totals.set(deal.stageName, (totals.get(deal.stageName) ?? 0) + deal.valueCents);
  }
  return Array.from(totals, ([stage, valueCents]) => ({ stage, valueCents }));
}

export function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}
