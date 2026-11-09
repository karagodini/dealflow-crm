export const DEFAULT_STAGES = [
  { name: "Lead", color: "#8d6a45", isWon: false, isLost: false },
  { name: "Qualified", color: "#1e4d6b", isWon: false, isLost: false },
  { name: "Proposal", color: "#c4622d", isWon: false, isLost: false },
  { name: "Negotiation", color: "#8d3f16", isWon: false, isLost: false },
  { name: "Won", color: "#1f7a4d", isWon: true, isLost: false },
  { name: "Lost", color: "#a33b32", isWon: false, isLost: true },
] as const;

export const STAGE_COLORS = [
  "#8d6a45",
  "#1e4d6b",
  "#c4622d",
  "#8d3f16",
  "#1f7a4d",
  "#a33b32",
  "#3f5c4b",
  "#6b4c7a",
];
