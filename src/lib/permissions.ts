export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageTeam(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canConfigurePipeline(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canRemoveMember(input: {
  actor: WorkspaceRole;
  target: WorkspaceRole;
  ownerCount: number;
  isSelf: boolean;
}) {
  if (!canManageTeam(input.actor)) return false;
  if (input.target === "OWNER" && input.ownerCount <= 1) return false;
  if (input.actor === "ADMIN" && input.target === "OWNER") return false;
  if (input.isSelf && input.target === "OWNER" && input.ownerCount <= 1) return false;
  return true;
}

export function canChangeRole(input: {
  actor: WorkspaceRole;
  target: WorkspaceRole;
  next: WorkspaceRole;
  ownerCount: number;
}) {
  if (input.actor !== "OWNER") return false;
  if (input.target === input.next) return true;
  if (input.target === "OWNER" && input.next !== "OWNER" && input.ownerCount <= 1) return false;
  return true;
}
