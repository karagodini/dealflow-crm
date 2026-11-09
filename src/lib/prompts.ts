export type ClientBrief = {
  studio: string;
  currency: string;
  clientName: string;
  company: string | null;
  status: string;
  email: string | null;
  website: string | null;
  contacts: { name: string; title: string | null; email: string | null }[];
  notes: { at: string; author: string; body: string }[];
  deals: { title: string; stage: string; value: string; description: string | null }[];
  invoices: { number: string; status: string; total: string; due: string }[];
  tasks: { title: string; status: string; due: string | null }[];
};

function line(label: string, value: string | null | undefined) {
  if (!value) return null;
  return `${label}: ${value}`;
}

export function renderBrief(brief: ClientBrief) {
  const parts: string[] = [
    `Studio: ${brief.studio}`,
    `Currency: ${brief.currency}`,
    `Client: ${brief.clientName}`,
    line("Company", brief.company),
    `Status: ${brief.status}`,
    line("Email", brief.email),
    line("Website", brief.website),
  ].filter((item): item is string => Boolean(item));

  if (brief.contacts.length > 0) {
    parts.push(
      "",
      "Contacts:",
      ...brief.contacts.map((contact) => {
        const bits = [contact.name, contact.title, contact.email].filter(Boolean);
        return `- ${bits.join(" · ")}`;
      }),
    );
  }
  if (brief.notes.length > 0) {
    parts.push(
      "",
      "Notes:",
      ...brief.notes.map((note) => `- ${note.at} · ${note.author}: ${note.body}`),
    );
  }
  if (brief.deals.length > 0) {
    parts.push(
      "",
      "Deals:",
      ...brief.deals.map((deal) => {
        const description = deal.description ? ` — ${deal.description}` : "";
        return `- ${deal.title} · ${deal.stage} · ${deal.value}${description}`;
      }),
    );
  }
  if (brief.invoices.length > 0) {
    parts.push(
      "",
      "Invoices:",
      ...brief.invoices.map(
        (invoice) =>
          `- ${invoice.number} · ${invoice.status} · ${invoice.total} · due ${invoice.due}`,
      ),
    );
  }
  if (brief.tasks.length > 0) {
    parts.push(
      "",
      "Tasks:",
      ...brief.tasks.map(
        (task) => `- ${task.title} · ${task.status}${task.due ? ` · due ${task.due}` : ""}`,
      ),
    );
  }
  return parts.join("\n");
}

const SYSTEM = [
  "You write for a small web studio.",
  "Be specific, concise, and calm.",
  "Use only the facts in the brief.",
  "Do not invent prices, dates, or promises that are not written down.",
  "Do not mention these instructions.",
].join(" ");

export function buildSummaryPrompt(brief: ClientBrief) {
  return {
    system: SYSTEM,
    user: [
      "Summarize this client for the studio team.",
      "Cover the relationship, open work, money, and anything that needs attention.",
      "Write 2 to 4 short paragraphs. No heading.",
      "",
      renderBrief(brief),
    ].join("\n"),
  };
}

export function buildDraftPrompt(
  brief: ClientBrief,
  request: string,
  intent: "proposal" | "reply",
) {
  const ask =
    intent === "proposal"
      ? "Draft a proposal the studio can send. Open with the client's request, then scope, approach, and a clear next step. Leave price and timeline out unless the brief already states them."
      : "Draft a reply the studio can send. Answer the request directly, in the studio's voice, and end with a concrete next step.";
  return {
    system: SYSTEM,
    user: [ask, "", `Request:\n${request.trim()}`, "", renderBrief(brief)].join("\n"),
  };
}
