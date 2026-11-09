"use client";

import { useActionState, useState } from "react";

import { Field, FormError, SubmitButton, controlClass } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addContact, addNote, createClient, updateClient } from "@/server/actions/clients";
import { createDeal, updateDeal } from "@/server/actions/deals";
import { createTask } from "@/server/actions/tasks";

type Option = { id: string; label: string };

export function ClientDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createClient, {});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>A company or person the studio is talking to.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <FormError message={state.error} />
          <Field label="Name" htmlFor="client-name" error={state.fieldErrors?.name?.[0]}>
            <Input id="client-name" name="name" required />
          </Field>
          <Field label="Company" htmlFor="client-company" error={state.fieldErrors?.company?.[0]}>
            <Input id="client-company" name="company" />
          </Field>
          <Field label="Email" htmlFor="client-email" error={state.fieldErrors?.email?.[0]}>
            <Input id="client-email" name="email" type="email" />
          </Field>
          <Field label="Phone" htmlFor="client-phone">
            <Input id="client-phone" name="phone" />
          </Field>
          <Field label="Website" htmlFor="client-website" error={state.fieldErrors?.website?.[0]}>
            <Input id="client-website" name="website" />
          </Field>
          <Field label="Status" htmlFor="client-status">
            <select id="client-status" name="status" className={controlClass} defaultValue="LEAD">
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <SubmitButton>Add client</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditClientForm({
  client,
}: {
  client: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    status: string;
  };
}) {
  const [state, action] = useActionState(updateClient.bind(null, client.id), {});
  return (
    <form action={action} className="grid gap-3">
      <FormError message={state.error} />
      <Field label="Name" htmlFor="edit-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="edit-name" name="name" defaultValue={client.name} required />
      </Field>
      <Field label="Company" htmlFor="edit-company">
        <Input id="edit-company" name="company" defaultValue={client.company ?? ""} />
      </Field>
      <Field label="Email" htmlFor="edit-email" error={state.fieldErrors?.email?.[0]}>
        <Input id="edit-email" name="email" type="email" defaultValue={client.email ?? ""} />
      </Field>
      <Field label="Phone" htmlFor="edit-phone">
        <Input id="edit-phone" name="phone" defaultValue={client.phone ?? ""} />
      </Field>
      <Field label="Website" htmlFor="edit-website" error={state.fieldErrors?.website?.[0]}>
        <Input id="edit-website" name="website" defaultValue={client.website ?? ""} />
      </Field>
      <Field label="Status" htmlFor="edit-status">
        <select
          id="edit-status"
          name="status"
          className={controlClass}
          defaultValue={client.status}
        >
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </Field>
      <SubmitButton>Save client</SubmitButton>
    </form>
  );
}

export function NoteForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(addNote.bind(null, clientId), {});
  return (
    <form action={action} className="grid gap-2">
      <FormError message={state.error} />
      <Field label="Note" htmlFor="note-body" error={state.fieldErrors?.body?.[0]}>
        <Textarea id="note-body" name="body" rows={4} />
      </Field>
      <SubmitButton>Add note</SubmitButton>
    </form>
  );
}

export function ContactForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(addContact.bind(null, clientId), {});
  return (
    <form action={action} className="grid gap-2">
      <FormError message={state.error} />
      <Field label="Contact name" htmlFor="contact-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="contact-name" name="name" required />
      </Field>
      <Field label="Title" htmlFor="contact-title">
        <Input id="contact-title" name="title" />
      </Field>
      <Field label="Email" htmlFor="contact-email" error={state.fieldErrors?.email?.[0]}>
        <Input id="contact-email" name="email" type="email" />
      </Field>
      <SubmitButton variant="outline">Add contact</SubmitButton>
    </form>
  );
}

export function DealDialog({
  clients,
  stages,
  members,
}: {
  clients: Option[];
  stages: Option[];
  members: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createDeal, {});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New deal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Put a piece of work on the pipeline.</DialogDescription>
        </DialogHeader>
        <DealFields
          state={state}
          action={action}
          clients={clients}
          stages={stages}
          members={members}
          submit="Open deal"
        />
      </DialogContent>
    </Dialog>
  );
}

export function DealEditor({
  deal,
  clients,
  stages,
  members,
}: {
  deal: {
    id: string;
    title: string;
    value: string;
    clientId: string;
    stageId: string;
    ownerId: string;
    expectedClose: string;
    description: string;
  };
  clients: Option[];
  stages: Option[];
  members: Option[];
}) {
  const [state, action] = useActionState(updateDeal.bind(null, deal.id), {});
  return (
    <DealFields
      state={state}
      action={action}
      clients={clients}
      stages={stages}
      members={members}
      deal={deal}
      submit="Save deal"
    />
  );
}

function DealFields({
  state,
  action,
  clients,
  stages,
  members,
  deal,
  submit,
}: {
  state: { error?: string; fieldErrors?: Record<string, string[] | undefined> };
  action: (payload: FormData) => void;
  clients: Option[];
  stages: Option[];
  members: Option[];
  deal?: {
    title: string;
    value: string;
    clientId: string;
    stageId: string;
    ownerId: string;
    expectedClose: string;
    description: string;
  };
  submit: string;
}) {
  return (
    <form action={action} className="grid gap-3">
      <FormError message={state.error} />
      <Field label="Title" htmlFor="deal-title" error={state.fieldErrors?.title?.[0]}>
        <Input id="deal-title" name="title" defaultValue={deal?.title} required />
      </Field>
      <Field label="Client" htmlFor="deal-client" error={state.fieldErrors?.clientId?.[0]}>
        <select
          id="deal-client"
          name="clientId"
          className={controlClass}
          defaultValue={deal?.clientId}
          required
        >
          <option value="">Choose a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stage" htmlFor="deal-stage">
        <select
          id="deal-stage"
          name="stageId"
          className={controlClass}
          defaultValue={deal?.stageId ?? stages[0]?.id}
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Value" htmlFor="deal-value" error={state.fieldErrors?.value?.[0]}>
        <Input
          id="deal-value"
          name="value"
          inputMode="decimal"
          defaultValue={deal?.value ?? "0"}
          required
        />
      </Field>
      <Field label="Owner" htmlFor="deal-owner">
        <select
          id="deal-owner"
          name="ownerId"
          className={controlClass}
          defaultValue={deal?.ownerId ?? ""}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Expected close" htmlFor="deal-close">
        <Input
          id="deal-close"
          name="expectedClose"
          type="date"
          defaultValue={deal?.expectedClose}
        />
      </Field>
      <Field label="Description" htmlFor="deal-description">
        <Textarea
          id="deal-description"
          name="description"
          rows={4}
          defaultValue={deal?.description}
        />
      </Field>
      <SubmitButton>{submit}</SubmitButton>
    </form>
  );
}

export function TaskDialog({
  clients,
  deals,
  members,
}: {
  clients: Option[];
  deals: Option[];
  members: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createTask, {});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Something the studio still has to do.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-3">
          <FormError message={state.error} />
          <Field label="Title" htmlFor="task-title" error={state.fieldErrors?.title?.[0]}>
            <Input id="task-title" name="title" required />
          </Field>
          <Field label="Due date" htmlFor="task-due">
            <Input id="task-due" name="dueDate" type="date" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority" htmlFor="task-priority">
              <select
                id="task-priority"
                name="priority"
                className={controlClass}
                defaultValue="NORMAL"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="Status" htmlFor="task-status">
              <select id="task-status" name="status" className={controlClass} defaultValue="OPEN">
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </Field>
          </div>
          <Field label="Assignee" htmlFor="task-assignee">
            <select id="task-assignee" name="assigneeId" className={controlClass} defaultValue="">
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client" htmlFor="task-client">
            <select id="task-client" name="clientId" className={controlClass} defaultValue="">
              <option value="">None</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deal" htmlFor="task-deal">
            <select id="task-deal" name="dealId" className={controlClass} defaultValue="">
              <option value="">None</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Details" htmlFor="task-details">
            <Textarea id="task-details" name="description" rows={3} />
          </Field>
          <SubmitButton>Add task</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
