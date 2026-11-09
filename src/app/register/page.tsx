import Link from "next/link";

import { RegisterForm } from "@/components/auth-forms";
import { Wordmark } from "@/components/brand";
import { GitHubSignIn } from "@/components/github-signin";
import { githubEnabled } from "@/lib/auth";

export const metadata = { title: "Create a workspace" };

export default function RegisterPage() {
  const github = githubEnabled();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Wordmark href="/" light />
        <div>
          <p className="font-serif text-4xl leading-tight">
            A desk for the studio, not another inbox.
          </p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
            You will be the owner. Invite the rest of the team once the pipeline is in place.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">DealFlow</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <h1 className="font-serif text-3xl">Create a workspace</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            Already have one?{" "}
            <Link href="/login" className="text-foreground underline">
              Sign in
            </Link>
          </p>
          <RegisterForm />
          {github ? (
            <div className="mt-4 grid gap-3">
              <p className="text-center text-xs text-muted-foreground">or</p>
              <GitHubSignIn />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
