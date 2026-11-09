import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionWorkspace } from "@/server/workspace";

export const WORKSPACE_COOKIE = "df_workspace";

export async function setWorkspaceCookie(workspaceId: string) {
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.AUTH_URL?.startsWith("https://") ?? false,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getWorkspaceContext() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  let memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true, user: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    const name = user.name ? `${user.name}'s studio` : "Studio";
    await prisma.$transaction(async (tx) => {
      const existing = await tx.workspaceMember.findFirst({ where: { userId } });
      if (existing) return;
      await provisionWorkspace(tx, { userId, name });
    });
    memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true, user: true },
      orderBy: { createdAt: "asc" },
    });
  }

  const preferred = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const current = memberships.find((member) => member.workspaceId === preferred) ?? memberships[0];
  if (!current) return null;

  return {
    user: current.user,
    membership: current,
    workspace: current.workspace,
    memberships,
  };
}

export async function requireWorkspace() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  return context;
}

export type WorkspaceContext = NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>>;
