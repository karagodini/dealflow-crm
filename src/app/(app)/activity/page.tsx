import { EmptyState, PageHeader } from "@/components/ui-bits";
import { formatRelative } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const ctx = await requireWorkspace();
  const activities = await prisma.activity.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true },
  });

  return (
    <div>
      <PageHeader
        eyebrow={ctx.workspace.name}
        title="Activity"
        description="A running log of who changed what."
      />
      {activities.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Creating a client, deal, or invoice will show up here."
        />
      ) : (
        <ol className="grid gap-3">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm">{activity.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.actor?.name ?? "DealFlow"} · {formatRelative(activity.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
