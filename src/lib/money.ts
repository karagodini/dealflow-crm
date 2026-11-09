const CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export function supportedCurrencies() {
  return ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
}

export function normalizeCurrency(value: string | null | undefined) {
  const code = (value ?? "USD").toUpperCase();
  return CURRENCIES.has(code) ? code : "USD";
}

export function dollarsToCents(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [dollars, fraction = ""] = normalized.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return cents;
}

export function formatMoney(cents: number, currency = "USD") {
  const code = normalizeCurrency(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
  }).format(cents / 100);
}

export function formatMoneyPlain(cents: number, currency = "USD") {
  const code = normalizeCurrency(currency);
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(cents));
  const dollars = Math.floor(absolute / 100).toString();
  const fraction = String(absolute % 100).padStart(2, "0");
  const grouped = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${code} ${grouped}.${fraction}`;
}
