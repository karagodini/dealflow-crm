import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma, WorkspaceRole } from "@prisma/client";

import { slugify, withSlugSuffix } from "@/lib/slug";
import { DEFAULT_STAGES } from "@/lib/stages";

export async function provisionWorkspace(
  tx: Prisma.TransactionClient,
  input: { userId: string; name: string; role?: WorkspaceRole },
) {
  let slug = slugify(input.name);
  const taken = await tx.workspace.findUnique({ where: { slug } });
  if (taken) slug = withSlugSuffix(slug, randomBytes(2).toString("hex"));

  const workspace = await tx.workspace.create({
    data: {
      name: input.name.trim(),
      slug,
      members: {
        create: { userId: input.userId, role: input.role ?? "OWNER" },
      },
      stages: {
        create: DEFAULT_STAGES.map((stage, position) => ({
          name: stage.name,
          color: stage.color,
          isWon: stage.isWon,
          isLost: stage.isLost,
          position,
        })),
      },
    },
  });

  return workspace;
}

export async function claimInvites(tx: Prisma.TransactionClient, userId: string, email: string) {
  const invites = await tx.invite.findMany({ where: { email } });
  for (const invite of invites) {
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      update: {},
      create: { workspaceId: invite.workspaceId, userId, role: invite.role },
    });
    await tx.invite.delete({ where: { id: invite.id } });
  }
}
