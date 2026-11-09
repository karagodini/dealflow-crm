"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field, FormError, SubmitButton, controlClass } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGE_COLORS } from "@/lib/stages";
import type { StageDraft } from "@/lib/pipeline-rules";
import {
  inviteMember,
  removeMember,
  saveStages,
  updateMemberRole,
  updateTelegram,
  updateWorkspace,
} from "@/server/actions/workspace";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  self: boolean;
};
type Invite = { id: string; email: string; role: string };

export function SettingsScreen({
  canManage,
  canEditPipeline,
  isOwner,
  workspace,
  members,
  invites,
  stages,
  ai,
  telegramReady,
}: {
  canManage: boolean;
  canEditPipeline: boolean;
  isOwner: boolean;
  workspace: {
    name: string;
    currency: string;
    invoicePrefix: string;
    telegramChatId: string;
    telegramNotify: boolean;
  };
  members: Member[];
  invites: Invite[];
  stages: StageDraft[];
  ai: { enabled: boolean; model: string | null; baseUrl: string | null };
  telegramReady: boolean;
}) {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-6 max-w-xl">
        <WorkspaceForm workspace={workspace} canManage={canManage} />
        <div className="mt-8 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">Drafting</h2>
          {ai.enabled ? (
            <p className="mt-2 text-muted-foreground">
              Connected to {ai.baseUrl} with model {ai.model}.
            </p>
          ) : (
            <p className="mt-2 text-muted-foreground">
              Off. Set AI_API_KEY to draft proposals and summarize a client. AI_BASE_URL and
              AI_MODEL choose the provider.
            </p>
          )}
        </div>
      </TabsContent>
      <TabsContent value="team" className="mt-6 grid gap-6">
        <TeamList members={members} invites={invites} isOwner={isOwner} canManage={canManage} />
      </TabsContent>
      <TabsContent value="pipeline" className="mt-6">
        <StageEditor initial={stages} canEdit={canEditPipeline} />
      </TabsContent>
      <TabsContent value="notifications" className="mt-6 max-w-xl">
        <TelegramForm workspace={workspace} canManage={canManage} telegramReady={telegramReady} />
      </TabsContent>
    </Tabs>
  );
}

function WorkspaceForm({
  workspace,
  canManage,
}: {
  workspace: { name: string; currency: string; invoicePrefix: string };
  canManage: boolean;
}) {
  const [state, action] = useActionState(updateWorkspace, {});
  return (
    <form action={action} className="grid gap-3">
      <FormError message={state.error} />
      <Field label="Workspace name" htmlFor="ws-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="ws-name" name="name" defaultValue={workspace.name} disabled={!canManage} />
      </Field>
      <Field label="Currency" htmlFor="ws-currency">
        <select
          id="ws-currency"
          name="currency"
          className={controlClass}
          defaultValue={workspace.currency}
          disabled={!canManage}
        >
          {["USD", "EUR", "GBP", "CAD", "AUD"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Invoice prefix"
        htmlFor="ws-prefix"
        error={state.fieldErrors?.invoicePrefix?.[0]}
      >
        <Input
          id="ws-prefix"
          name="invoicePrefix"
          defaultValue={workspace.invoicePrefix}
          disabled={!canManage}
        />
      </Field>
      {canManage ? <SubmitButton>Save workspace</SubmitButton> : null}
    </form>
  );
}

function TeamList({
  members,
  invites,
  isOwner,
  canManage,
}: {
  members: Member[];
  invites: Invite[];
  isOwner: boolean;
  canManage: boolean;
}) {
  const [state, action] = useActionState(inviteMember, {});
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-6">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <select
                  aria-label={`Role for ${member.name}`}
                  className={controlClass + " w-32"}
                  defaultValue={member.role}
                  disabled={pending}
                  onChange={(event) => {
                    const role = event.target.value as Member["role"];
                    startTransition(async () => {
                      const result = await updateMemberRole(member.id, role);
                      if (result.error) toast.error(result.error);
                    });
                  }}
                >
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
              ) : (
                <span className="text-sm text-muted-foreground">{member.role.toLowerCase()}</span>
              )}
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await removeMember(member.id);
                      if (result.error) toast.error(result.error);
                    });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {invites.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-medium">Waiting on an account</h2>
          <ul className="text-sm text-muted-foreground">
            {invites.map((invite) => (
              <li key={invite.id}>
                {invite.email} · {invite.role.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {canManage ? (
        <form action={action} className="grid max-w-xl gap-3">
          <FormError message={state.error} />
          <Field label="Email" htmlFor="invite-email" error={state.fieldErrors?.email?.[0]}>
            <Input id="invite-email" name="email" type="email" required />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <select id="invite-role" name="role" className={controlClass} defaultValue="MEMBER">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
          <SubmitButton>Invite</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

function StageEditor({ initial, canEdit }: { initial: StageDraft[]; canEdit: boolean }) {
  const [rows, setRows] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid max-w-3xl gap-3">
      {rows.map((row, index) => (
        <div
          key={row.id ?? `new-${index}`}
          className="grid items-center gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_120px_auto_auto_auto]"
        >
          <Input
            aria-label={`Stage ${index + 1} name`}
            value={row.name}
            disabled={!canEdit}
            onChange={(event) =>
              setRows((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, name: event.target.value } : item,
                ),
              )
            }
          />
          <Input
            aria-label={`Stage ${index + 1} color`}
            type="color"
            value={row.color}
            disabled={!canEdit}
            onChange={(event) =>
              setRows((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, color: event.target.value } : item,
                ),
              )
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.isWon}
              disabled={!canEdit}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          isWon: event.target.checked,
                          isLost: event.target.checked ? false : item.isLost,
                        }
                      : item,
                  ),
                )
              }
            />
            Won
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.isLost}
              disabled={!canEdit}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          isLost: event.target.checked,
                          isWon: event.target.checked ? false : item.isWon,
                        }
                      : item,
                  ),
                )
              }
            />
            Lost
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canEdit || index === 0}
              onClick={() => setRows((current) => swap(current, index, index - 1))}
            >
              Up
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canEdit || index === rows.length - 1}
              onClick={() => setRows((current) => swap(current, index, index + 1))}
            >
              Down
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canEdit}
              onClick={() =>
                setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      {canEdit ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  name: "New stage",
                  color: STAGE_COLORS[current.length % STAGE_COLORS.length] ?? "#1e4d6b",
                  isWon: false,
                  isLost: false,
                },
              ])
            }
          >
            Add stage
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await saveStages(rows);
                if (result.error) toast.error(result.error);
                else toast.success("Pipeline saved");
              });
            }}
          >
            {pending ? "Saving…" : "Save pipeline"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Owners and admins can reshape the pipeline.</p>
      )}
    </div>
  );
}

function swap<T>(items: T[], from: number, to: number) {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

function TelegramForm({
  workspace,
  canManage,
  telegramReady,
}: {
  workspace: { telegramChatId: string; telegramNotify: boolean };
  canManage: boolean;
  telegramReady: boolean;
}) {
  const [state, action] = useActionState(updateTelegram, {});
  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {telegramReady
          ? "The bot token is configured. Deal stage changes and newly overdue invoices can post to a chat."
          : "Add TELEGRAM_BOT_TOKEN on the server to send messages. You can still save a chat id for later."}
      </p>
      <FormError message={state.error} />
      <Field label="Telegram chat id" htmlFor="tg-chat">
        <Input
          id="tg-chat"
          name="telegramChatId"
          defaultValue={workspace.telegramChatId}
          disabled={!canManage}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="telegramNotify"
          defaultChecked={workspace.telegramNotify}
          disabled={!canManage}
        />
        Notify this chat
      </label>
      {canManage ? <SubmitButton>Save notifications</SubmitButton> : null}
    </form>
  );
}
