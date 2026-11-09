"use client";

import { useActionState } from "react";

import { Field, FormError, SubmitButton } from "@/components/ui-bits";
import { Input } from "@/components/ui/input";
import { login, register } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(login, {});
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(register, {});
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state.error} />
      <Field label="Your name" htmlFor="name" error={state.fieldErrors?.name?.[0]}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field
        label="Workspace name"
        htmlFor="workspaceName"
        error={state.fieldErrors?.workspaceName?.[0]}
      >
        <Input id="workspaceName" name="workspaceName" autoComplete="organization" required />
      </Field>
      <p className="text-xs text-muted-foreground">
        At least 8 characters, with a letter and a number.
      </p>
      <SubmitButton pendingLabel="Creating workspace…">Create workspace</SubmitButton>
    </form>
  );
}
