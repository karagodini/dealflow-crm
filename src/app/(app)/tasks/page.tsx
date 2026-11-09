import Link from "next/link";

import { TaskDialog } from "@/components/record-forms";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { setTaskStatus } from "@/server/actions/tasks";
import { requireWorkspace } from "@/server/context";

export const metadata = { title: "Tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const ctx = await requireWorkspace();
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      ...(filter === "done"
        ? { status: "DONE" }
        : filter === "open"
          ? { status: { not: "DONE" } }
          : {}),
      ...(filter === "overdue"
        ? {
            status: { not: "DONE" },
            dueDate: {
              lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
            },
          }
        : {}),
    },
    include: { assignee: true, client: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const [clients, deals, members] = await Promise.all([
    prisma.client.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { name: "asc" } }),
    prisma.deal.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { title: "asc" } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { user: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Work"
        title="Tasks"
        description="What the studio still owes the week."
        action={
          <TaskDialog
            clients={clients.map((client) => ({ id: client.id, label: client.name }))}
            deals={deals.map((deal) => ({ id: deal.id, label: deal.title }))}
            members={members.map((member) => ({
              id: member.userId,
              label: member.user.name ?? member.user.email ?? "Member",
            }))}
          />
        }
      />
      <div className="mb-4 flex gap-2 text-sm">
        {[
          ["", "All"],
          ["open", "Open"],
          ["overdue", "Overdue"],
          ["done", "Done"],
        ].map(([value, label]) => (
          <Link
            key={label}
            href={value ? `/tasks?filter=${value}` : "/tasks"}
            className={`rounded-full px-3 py-1 ${filter === value || (!filter && value === "") ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {tasks.length === 0 ? (
        <EmptyState title="Nothing in this view" body="Add a task, or switch the filter." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    task.client?.name,
                    task.assignee?.name,
                    task.dueDate ? formatDate(task.dueDate) : "No due date",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={task.priority} />
                <StatusBadge value={task.status} />
                {task.status !== "DONE" ? (
                  <form action={setTaskStatus.bind(null, task.id, "DONE")}>
                    <Button type="submit" size="sm" variant="outline">
                      Mark done
                    </Button>
                  </form>
                ) : (
                  <form action={setTaskStatus.bind(null, task.id, "OPEN")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Reopen
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
