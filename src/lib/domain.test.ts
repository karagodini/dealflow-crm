import { describe, expect, it } from "vitest";

import {
  monthBuckets,
  monthlyPaidRevenue,
  openPipelineValue,
  percentDelta,
  winRate,
} from "@/lib/analytics";
import { invoiceTotals, lineTotalCents } from "@/lib/invoice-math";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { canTransitionInvoice } from "@/lib/invoice-status";
import { dollarsToCents, formatMoney, formatMoneyPlain } from "@/lib/money";
import { shouldMarkOverdue } from "@/lib/overdue";
import { canChangeRole, canRemoveMember } from "@/lib/permissions";
import { closedAtForMove, insertAt, validateStages } from "@/lib/pipeline-rules";
import { buildDraftPrompt, buildSummaryPrompt, type ClientBrief } from "@/lib/prompts";
import { normalizeSearchQuery, searchReady } from "@/lib/search";
import { slugify } from "@/lib/slug";

const brief: ClientBrief = {
  studio: "Harbor & Pine",
  currency: "USD",
  clientName: "Linden Bakery",
  company: null,
  status: "Active",
  email: "elena@lindenbakery.com",
  website: null,
  contacts: [],
  notes: [
    {
      at: "Nov 1, 2026",
      author: "Mara Ellison",
      body: "Wants seasonal ordering before the holidays.",
    },
  ],
  deals: [{ title: "Seasonal site", stage: "Proposal", value: "$18,400.00", description: null }],
  invoices: [],
  tasks: [],
};

describe("invoice math", () => {
  it("rounds line totals and tax from the subtotal", () => {
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 10000 })).toBe(15000);
    expect(lineTotalCents({ quantity: 1.1, unitPriceCents: 333 })).toBe(366);
    expect(
      invoiceTotals(
        [
          { quantity: 2, unitPriceCents: 15000 },
          { quantity: 1, unitPriceCents: 5000 },
        ],
        8.25,
      ),
    ).toEqual({
      subtotalCents: 35000,
      taxCents: 2888,
      totalCents: 37888,
    });
  });

  it("allows a zero tax rate", () => {
    expect(invoiceTotals([{ quantity: 1, unitPriceCents: 100 }], 0).totalCents).toBe(100);
  });
});

describe("invoice status", () => {
  it("follows the billing lifecycle", () => {
    expect(canTransitionInvoice("DRAFT", "SENT")).toBe(true);
    expect(canTransitionInvoice("SENT", "PAID")).toBe(true);
    expect(canTransitionInvoice("SENT", "OVERDUE")).toBe(true);
    expect(canTransitionInvoice("OVERDUE", "PAID")).toBe(true);
    expect(canTransitionInvoice("PAID", "VOID")).toBe(false);
    expect(canTransitionInvoice("VOID", "SENT")).toBe(false);
    expect(canTransitionInvoice("DRAFT", "PAID")).toBe(false);
  });
});

describe("overdue", () => {
  it("marks sent invoices the day after they are due", () => {
    const due = new Date("2026-11-08T12:00:00.000Z");
    expect(shouldMarkOverdue("SENT", due, new Date("2026-11-08T20:00:00.000Z"))).toBe(false);
    expect(shouldMarkOverdue("SENT", due, new Date("2026-11-09T01:00:00.000Z"))).toBe(true);
    expect(shouldMarkOverdue("DRAFT", due, new Date("2026-11-10T00:00:00.000Z"))).toBe(false);
    expect(shouldMarkOverdue("PAID", due, new Date("2026-11-10T00:00:00.000Z"))).toBe(false);
  });
});

describe("money", () => {
  it("parses dollar input into cents", () => {
    expect(dollarsToCents("4800")).toBe(480000);
    expect(dollarsToCents("1,250.50")).toBe(125050);
    expect(dollarsToCents("12.5")).toBe(1250);
    expect(dollarsToCents("12.345")).toBeNull();
    expect(dollarsToCents("-4")).toBeNull();
  });

  it("formats currency for the interface and for PDFs", () => {
    expect(formatMoney(123450, "USD")).toBe("$1,234.50");
    expect(formatMoneyPlain(123450, "EUR")).toBe("EUR 1,234.50");
  });
});

describe("analytics", () => {
  const now = new Date("2026-11-09T12:00:00.000Z");

  it("sums paid revenue into month buckets", () => {
    const buckets = monthBuckets(now, 3);
    const series = monthlyPaidRevenue(
      [
        { status: "PAID", totalCents: 10000, paidAt: new Date("2026-09-15T12:00:00.000Z") },
        { status: "PAID", totalCents: 25000, paidAt: new Date("2026-11-02T12:00:00.000Z") },
        { status: "SENT", totalCents: 999, paidAt: null },
      ],
      buckets,
    );
    expect(series.map((point) => point.paidCents)).toEqual([10000, 0, 25000]);
  });

  it("ignores won and lost deals in open pipeline value", () => {
    expect(
      openPipelineValue([
        { valueCents: 100, won: false, lost: false, stageName: "Lead", closedAt: null },
        { valueCents: 50, won: true, lost: false, stageName: "Won", closedAt: now },
      ]),
    ).toBe(100);
  });

  it("returns null win rate when nothing has closed", () => {
    expect(winRate([{ won: false, lost: false }])).toBeNull();
    expect(
      winRate([
        { won: true, lost: false },
        { won: false, lost: true },
      ]),
    ).toBe(0.5);
  });

  it("handles a month with no prior revenue", () => {
    expect(percentDelta(100, 0)).toBeNull();
    expect(percentDelta(150, 100)).toBe(0.5);
  });
});

describe("permissions", () => {
  it("keeps the last owner in place", () => {
    expect(canRemoveMember({ actor: "OWNER", target: "OWNER", ownerCount: 1, isSelf: true })).toBe(
      false,
    );
    expect(
      canRemoveMember({ actor: "ADMIN", target: "MEMBER", ownerCount: 1, isSelf: false }),
    ).toBe(true);
    expect(canRemoveMember({ actor: "ADMIN", target: "OWNER", ownerCount: 2, isSelf: false })).toBe(
      false,
    );
    expect(canChangeRole({ actor: "OWNER", target: "MEMBER", next: "ADMIN", ownerCount: 1 })).toBe(
      true,
    );
    expect(canChangeRole({ actor: "ADMIN", target: "MEMBER", next: "ADMIN", ownerCount: 1 })).toBe(
      false,
    );
    expect(canChangeRole({ actor: "OWNER", target: "OWNER", next: "MEMBER", ownerCount: 1 })).toBe(
      false,
    );
  });
});

describe("pipeline rules", () => {
  const base = [
    { name: "Lead", color: "#112233", isWon: false, isLost: false },
    { name: "Won", color: "#112233", isWon: true, isLost: false },
    { name: "Lost", color: "#112233", isWon: false, isLost: true },
  ];

  it("requires a won stage and a lost stage", () => {
    expect(validateStages(base)).toBeNull();
    expect(
      validateStages(base.map((stage) => ({ ...stage, isWon: false, isLost: false }))),
    ).toMatch(/won/);
    expect(validateStages([{ ...base[0]!, name: "A" }])).toMatch(/two stages/);
  });

  it("clears the close date when a deal returns to an open stage", () => {
    const now = new Date("2026-11-09T00:00:00.000Z");
    const closed = new Date("2026-10-01T00:00:00.000Z");
    expect(closedAtForMove({ isWon: true, isLost: false }, null, now)).toEqual(now);
    expect(closedAtForMove({ isWon: true, isLost: false }, closed, now)).toEqual(closed);
    expect(closedAtForMove({ isWon: false, isLost: false }, closed, now)).toBeNull();
  });

  it("inserts a card at a clamped index", () => {
    expect(insertAt(["a", "b"], "c", 1)).toEqual(["a", "c", "b"]);
    expect(insertAt(["a"], "c", 9)).toEqual(["a", "c"]);
  });
});

describe("prompts and search", () => {
  it("includes known facts and skips empty fields", () => {
    const summary = buildSummaryPrompt(brief);
    expect(summary.user).toContain("Linden Bakery");
    expect(summary.user).toContain("seasonal ordering");
    expect(summary.user).not.toContain("Website:");
    const proposal = buildDraftPrompt(brief, "Can you rebuild the menu?", "proposal");
    expect(proposal.user).toContain("Can you rebuild the menu?");
    expect(proposal.user).toContain("Harbor & Pine");
  });

  it("normalizes search text", () => {
    expect(normalizeSearchQuery("  linden   bakery  ")).toBe("linden bakery");
    expect(searchReady("a")).toBe(false);
    expect(searchReady("li")).toBe(true);
    expect(slugify("Harbor & Pine")).toBe("harbor-pine");
  });
});

describe("invoice pdf", () => {
  it("renders a one-page document", async () => {
    const bytes = await renderInvoicePdf({
      studio: "Harbor & Pine",
      number: "INV-1042",
      status: "Sent",
      issueDate: "Nov 1, 2026",
      dueDate: "Nov 15, 2026",
      clientName: "Linden Bakery",
      clientEmail: "elena@lindenbakery.com",
      notes: "Thank you for the project.",
      items: [
        {
          description: "Design and build",
          quantity: "1",
          unitPrice: "USD 4,800.00",
          total: "USD 4,800.00",
        },
      ],
      subtotal: "USD 4,800.00",
      taxLabel: "Tax 0%",
      tax: "USD 0.00",
      total: "USD 4,800.00",
    });
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
  });
});
