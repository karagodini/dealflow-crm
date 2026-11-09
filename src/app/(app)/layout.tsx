import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/server/context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireWorkspace();
  return (
    <AppShell
      userName={ctx.user.name ?? ctx.user.email ?? "Member"}
      workspaceId={ctx.workspace.id}
      workspaceName={ctx.workspace.name}
      memberships={ctx.memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        role: membership.role,
      }))}
    >
      {children}
    </AppShell>
  );
}
