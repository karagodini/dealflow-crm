import Link from "next/link";

import { PipelineChart, RevenueChart } from "@/components/charts";
import { PageHeader, StatusBadge } from "@/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  monthBuckets,
  monthlyPaidRevenue,
  openPipelineValue,
  outstandingCents,
  percentDelta,
  revenueBetween,
  winRate,
  pipelineByStage,
  type MoneyInvoice,
  type StageDeal,
} from "@/lib/analytics";
import { formatDate, formatRelative } from "@/lib/format";
import { asQuantity, invoiceTotals } from "@/lib/invoice-math";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/server/context";
import { syncOverdueInvoices } from "@/server/overdue";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireWorkspace();
  await syncOverdueInvoices(ctx.workspace.id);
  const [invoices, deals, tasks, activities] = await Promise.all([
    prisma.invoice.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { items: true, client: true },
    }),
    prisma.deal.findMany({
      where: { workspaceId: ctx.workspace.id },
      include: { stage: true, client: true },
    }),
    prisma.task.findMany({
      where: { workspaceId: ctx.workspace.id, status: { not: "DONE" } },
      orderBy: [{ dueDate: "asc" }],
      include: { assignee: true },
      take: 6,
    }),
    prisma.activity.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const money: MoneyInvoice[] = invoices.map((invoice) => ({
    status: invoice.status,
    paidAt: invoice.paidAt,
    totalCents: invoiceTotals(
      invoice.items.map((item) => ({
        quantity: asQuantity(item.quantity),
        unitPriceCents: item.unitPriceCents,
      })),
      Number(invoice.taxRate),
    ).totalCents,
  }));
  const stageDeals: StageDeal[] = deals.map((deal) => ({
    valueCents: deal.valueCents,
    won: deal.stage.isWon,
    lost: deal.stage.isLost,
    stageName: deal.stage.name,
    closedAt: deal.closedAt,
  }));
  const now = new Date();
  const buckets = monthBuckets(now, 6);
  const series = monthlyPaidRevenue(money, buckets);
  const currentStart = buckets[buckets.length - 1]?.start ?? now;
  const previousStart = buckets[buckets.length - 2]?.start ?? currentStart;
  const currentEnd = buckets[buckets.length - 1]?.end ?? now;
  const paidThisMonth = revenueBetween(money, currentStart, currentEnd);
  const paidLastMonth = revenueBetween(money, previousStart, currentStart);
  const delta = percentDelta(paidThisMonth, paidLastMonth);
  const rate = winRate(stageDeals.map((deal) => ({ won: deal.won, lost: deal.lost })));
  const overdue = invoices.filter((invoice) => invoice.status === "OVERDUE");

  return (
    <div>
      <PageHeader
        eyebrow={ctx.workspace.name}
        title="Dashboard"
        description="Revenue, open work, and what needs a reply."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Paid this month"
          value={formatMoney(paidThisMonth, ctx.workspace.currency)}
          hint={deltaHint(delta)}
        />
        <Stat
          label="Outstanding"
          value={formatMoney(outstandingCents(money), ctx.workspace.currency)}
          hint={`${overdue.length} overdue`}
        />
        <Stat
          label="Open pipeline"
          value={formatMoney(openPipelineValue(stageDeals), ctx.workspace.currency)}
          hint={`${deals.filter((deal) => !deal.stage.isWon && !deal.stage.isLost).length} deals`}
        />
        <Stat
          label="Win rate"
          value={rate === null ? "—" : `${Math.round(rate * 100)}%`}
          hint="Won against closed deals"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paid revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={series} currency={ctx.workspace.currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipelineByStage(stageDeals)} currency={ctx.workspace.currency} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Due soon</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks.</p>
            ) : null}
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.assignee?.name ?? "Unassigned"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {task.dueDate ? formatDate(task.dueDate) : "No date"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 text-sm">
                <p>{activity.summary}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelative(activity.createdAt)}
                </span>
              </div>
            ))}
            {overdue.length > 0 ? (
              <div className="border-t border-border pt-3">
                {overdue.slice(0, 3).map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span>
                      {invoice.number} · {invoice.client.name}
                    </span>
                    <StatusBadge value="OVERDUE" />
                  </Link>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-3xl tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function deltaHint(delta: number | null) {
  if (delta === null) return "No paid invoices last month";
  const percent = Math.round(delta * 100);
  if (percent === 0) return "Same as last month";
  return percent > 0 ? `${percent}% above last month` : `${Math.abs(percent)}% below last month`;
}
