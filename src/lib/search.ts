export type SearchHit = {
  type: "client" | "deal" | "invoice" | "task";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export function normalizeSearchQuery(input: string) {
  return input.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function searchReady(query: string) {
  return normalizeSearchQuery(query).length >= 2;
}
