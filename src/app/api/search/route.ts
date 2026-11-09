import { NextResponse } from "next/server";

import { normalizeSearchQuery, searchReady, type SearchHit } from "@/lib/search";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/server/context";

export async function GET(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ results: [] }, { status: 401 });
  const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (!searchReady(query)) return NextResponse.json({ results: [] satisfies SearchHit[] });

  const where = { contains: query, mode: "insensitive" as const };
  const [clients, deals, invoices, tasks] = await Promise.all([
    prisma.client.findMany({
      where: {
        workspaceId: context.workspace.id,
        OR: [{ name: where }, { company: where }, { email: where }],
      },
      take: 6,
    }),
    prisma.deal.findMany({
      where: { workspaceId: context.workspace.id, title: where },
      include: { client: true },
      take: 6,
    }),
    prisma.invoice.findMany({
      where: {
        workspaceId: context.workspace.id,
        OR: [{ number: where }, { client: { name: where } }],
      },
      include: { client: true },
      take: 6,
    }),
    prisma.task.findMany({
      where: { workspaceId: context.workspace.id, title: where },
      take: 6,
    }),
  ]);

  const results: SearchHit[] = [
    ...clients.map((client) => ({
      type: "client" as const,
      id: client.id,
      title: client.name,
      subtitle: client.company ?? client.email ?? "Client",
      href: `/clients/${client.id}`,
    })),
    ...deals.map((deal) => ({
      type: "deal" as const,
      id: deal.id,
      title: deal.title,
      subtitle: deal.client.name,
      href: `/deals/${deal.id}`,
    })),
    ...invoices.map((invoice) => ({
      type: "invoice" as const,
      id: invoice.id,
      title: invoice.number,
      subtitle: invoice.client.name,
      href: `/invoices/${invoice.id}`,
    })),
    ...tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      subtitle: "Task",
      href: "/tasks",
    })),
  ];

  return NextResponse.json({ results });
}
