"use client";

import { useActionState, useState, useTransition } from "react";

import { Field, FormError, SubmitButton } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { draftForClient, summarizeClient } from "@/server/actions/drafts";

export function AiPanel({ clientId, enabled }: { clientId: string; enabled: boolean }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftState, draftAction] = useActionState(draftForClient.bind(null, clientId), {});

  if (!enabled) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card p-4">
        <h2 className="font-serif text-xl">Drafting</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Drafting stays off until <span className="font-medium text-foreground">AI_API_KEY</span>{" "}
          is set. Point <span className="font-medium text-foreground">AI_BASE_URL</span> and{" "}
          <span className="font-medium text-foreground">AI_MODEL</span> at any OpenAI-compatible
          provider, then restart the server.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl">Drafting</h2>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setSummaryError(null);
            startTransition(async () => {
              const result = await summarizeClient(clientId);
              if (result.error) setSummaryError(result.error);
              if (result.text) setSummary(result.text);
            });
          }}
        >
          {pending ? "Summarizing…" : "Summarize history"}
        </Button>
      </div>
      {summaryError ? <p className="mt-3 text-sm text-destructive">{summaryError}</p> : null}
      {summary ? <p className="mt-3 text-sm whitespace-pre-wrap">{summary}</p> : null}
      <form action={draftAction} className="mt-4 grid gap-3">
        <FormError message={draftState.error} />
        <Field
          label="What did they ask?"
          htmlFor="draft-request"
          error={draftState.fieldErrors?.request?.[0]}
        >
          <Textarea id="draft-request" name="request" rows={4} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="intent" value="reply" variant="outline">
            Draft reply
          </Button>
          <SubmitButton pendingLabel="Drafting…">Draft proposal</SubmitButton>
          <input type="hidden" name="intent" value="proposal" />
        </div>
      </form>
      {draftState.text ? (
        <p className="mt-4 text-sm whitespace-pre-wrap">{draftState.text}</p>
      ) : null}
    </section>
  );
}
