"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  CheckSquare,
  Kanban,
  LayoutDashboard,
  Menu,
  Receipt,
  Search,
  Settings,
  Users,
} from "lucide-react";

import { Mark } from "@/components/brand";
import { SearchDialog } from "@/components/search-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { initials } from "@/lib/format";
import { signOutAction } from "@/server/actions/auth";
import { switchWorkspace } from "@/server/actions/workspace";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

type Membership = { workspaceId: string; workspaceName: string; role: string };

export function AppShell({
  userName,
  workspaceId,
  workspaceName,
  memberships,
  children,
}: {
  userName: string;
  workspaceId: string;
  workspaceName: string;
  memberships: Membership[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nav = (
    <nav className="grid gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-sidebar text-sidebar-foreground md:flex md:flex-col md:px-4 md:py-5">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-1">
          <Mark className="size-6 text-[color:var(--primary)]" />
          <span className="font-serif text-xl tracking-tight">DealFlow</span>
        </Link>
        {nav}
        <div className="mt-auto px-1 pt-6 text-xs text-sidebar-foreground/60">{workspaceName}</div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-8 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm text-muted-foreground md:max-w-md"
          >
            <Search className="size-4" />
            Search the workspace
            <span className="ml-auto hidden text-xs md:inline">⌘K</span>
          </button>
          {memberships.length > 1 ? (
            <select
              aria-label="Workspace"
              className="h-8 max-w-40 rounded-lg border border-input bg-transparent px-2 text-sm"
              value={workspaceId}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value;
                startTransition(async () => {
                  await switchWorkspace(next);
                  router.refresh();
                });
              }}
            >
              {memberships.map((membership) => (
                <option key={membership.workspaceId} value={membership.workspaceId}>
                  {membership.workspaceName}
                </option>
              ))}
            </select>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="rounded-full" aria-label="Account menu">
                <Avatar>
                  <AvatarFallback>{initials(userName)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  startTransition(() => signOutAction());
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar text-sidebar-foreground">
          <SheetTitle className="font-serif text-xl">DealFlow</SheetTitle>
          <div className="mt-6">{nav}</div>
        </SheetContent>
      </Sheet>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
