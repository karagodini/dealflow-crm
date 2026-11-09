import Link from "next/link";

import { LoginForm } from "@/components/auth-forms";
import { Wordmark } from "@/components/brand";
import { GitHubSignIn } from "@/components/github-signin";
import { githubEnabled } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const github = githubEnabled();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Wordmark href="/" light />
        <div>
          <p className="font-serif text-4xl leading-tight">Pick up the studio where you left it.</p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
            Deals, tasks, and invoices stay with the workspace, not in a stack of threads.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">DealFlow</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <h1 className="font-serif text-3xl">Sign in</h1>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            New studio?{" "}
            <Link href="/register" className="text-foreground underline">
              Create a workspace
            </Link>
          </p>
          <LoginForm callbackUrl={params.callbackUrl} />
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
