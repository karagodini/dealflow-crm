import "server-only";

import { prisma } from "@/lib/prisma";

export async function recordActivity(input: {
  workspaceId: string;
  actorId?: string | null;
  type: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  createdAt?: Date;
}) {
  await prisma.activity.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId ?? null,
      type: input.type,
      summary: input.summary,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: input.createdAt,
    },
  });
}
