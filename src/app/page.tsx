import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const preview = [
  {
    name: "Lead",
    cards: ["Wholesale ordering", "Annual report microsite"],
  },
  {
    name: "Proposal",
    cards: ["Seasonal site and ordering"],
  },
  {
    name: "Negotiation",
    cards: ["Practice site and project index"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Create a workspace</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-primary uppercase">
            For independent studios
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
            The operating desk for clients, deals, and invoices.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            DealFlow keeps the work of a small web studio in one place: who you are talking to, what
            is on the table, what is due, and what has been paid.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Open a workspace</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between px-1">
            <p className="font-serif text-lg">Pipeline</p>
            <p className="text-xs text-muted-foreground">Harbor & Pine</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {preview.map((column) => (
              <div key={column.name} className="rounded-xl bg-muted/70 p-2">
                <p className="px-1 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {column.name}
                </p>
                <div className="grid gap-2">
                  {column.cards.map((card) => (
                    <div
                      key={card}
                      className="rounded-lg bg-background px-3 py-3 text-sm shadow-sm"
                    >
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {[
          [
            "A pipeline you can reshape",
            "Stages match how your studio actually sells. Drag a deal when the conversation moves.",
          ],
          [
            "Clients with a memory",
            "Contacts, notes, deals, and invoices stay on the same record, ready to summarize.",
          ],
          [
            "Invoices that leave the building",
            "Line items, tax, status, and a PDF your client can file.",
          ],
        ].map(([title, body]) => (
          <article key={title} className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
