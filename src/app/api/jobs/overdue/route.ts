import { syncOverdueInvoices } from "@/server/overdue";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return new Response(null, { status: 404 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const updated = await syncOverdueInvoices();
  return Response.json({ updated });
}
