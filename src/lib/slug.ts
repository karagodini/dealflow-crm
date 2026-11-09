export function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "studio";
}

export function withSlugSuffix(base: string, suffix: string) {
  const trimmed = base.slice(0, Math.max(1, 48 - suffix.length - 1));
  return `${trimmed}-${suffix}`;
}
