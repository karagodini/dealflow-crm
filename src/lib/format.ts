const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const LABELS: Record<string, string> = {
  IN_PROGRESS: "In progress",
  OPEN: "Open",
  DONE: "Done",
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
  LEAD: "Lead",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function labelize(value: string) {
  return LABELS[value] ?? value.toLowerCase().replaceAll("_", " ");
}

export function formatDate(date: Date) {
  const month = MONTHS[date.getUTCMonth()];
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatRelative(date: Date, now = new Date()) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatDate(date);
}

export function parseDateInput(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInput(date: Date | null | undefined) {
  if (!date) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
