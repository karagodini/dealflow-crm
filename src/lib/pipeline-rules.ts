export type StageDraft = {
  id?: string;
  name: string;
  color: string;
  isWon: boolean;
  isLost: boolean;
};

export function validateStages(stages: StageDraft[]) {
  if (stages.length < 2) return "Keep at least two stages.";
  if (stages.length > 12) return "Twelve stages is the limit.";
  const names = new Set<string>();
  let won = 0;
  let lost = 0;
  for (const stage of stages) {
    const name = stage.name.trim();
    if (name.length < 2 || name.length > 40) return "Stage names need 2 to 40 characters.";
    const key = name.toLowerCase();
    if (names.has(key)) return "Stage names need to be unique.";
    names.add(key);
    if (stage.isWon && stage.isLost) return "A stage cannot be both won and lost.";
    if (!/^#[0-9a-fA-F]{6}$/.test(stage.color)) return "Use a hex color for each stage.";
    if (stage.isWon) won += 1;
    if (stage.isLost) lost += 1;
  }
  if (won < 1 || lost < 1) return "Mark one stage as won and one as lost.";
  return null;
}

export function closedAtForMove(
  stage: { isWon: boolean; isLost: boolean },
  current: Date | null,
  now: Date,
) {
  if (stage.isWon || stage.isLost) return current ?? now;
  return null;
}

export function insertAt<T>(items: T[], item: T, index: number) {
  const next = items.slice();
  const clamped = Math.max(0, Math.min(index, next.length));
  next.splice(clamped, 0, item);
  return next;
}
