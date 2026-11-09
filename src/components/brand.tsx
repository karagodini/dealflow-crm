import Link from "next/link";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="5" width="7" height="22" rx="1.5" fill="currentColor" />
      <rect x="12.5" y="11" width="7" height="16" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="22" y="16" width="7" height="11" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 ${light ? "text-sidebar-foreground" : "text-foreground"}`}
    >
      <Mark className={`size-6 ${light ? "text-primary" : "text-primary"}`} />
      <span className="font-serif text-xl tracking-tight">DealFlow</span>
    </Link>
  );
}
