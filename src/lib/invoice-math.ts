export type LineInput = {
  quantity: number;
  unitPriceCents: number;
};

export type InvoiceTotals = {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export function lineTotalCents(line: LineInput) {
  return Math.round(line.quantity * line.unitPriceCents);
}

export function invoiceTotals(lines: LineInput[], taxRatePercent: number): InvoiceTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
  const taxCents = Math.round(subtotalCents * (taxRatePercent / 100));
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}

export function asQuantity(value: { toString(): string } | number) {
  return typeof value === "number" ? value : Number(value.toString());
}
