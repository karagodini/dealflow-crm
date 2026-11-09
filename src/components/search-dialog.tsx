"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SearchHit } from "@/lib/search";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { results: SearchHit[] };
      setResults(payload.results);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search the workspace"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search clients, deals, invoices, tasks"
        />
        <CommandList>
          <CommandEmpty>
            {query.trim().length < 2 ? "Type at least two characters." : "Nothing matches."}
          </CommandEmpty>
          <CommandGroup>
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.id}`}
                value={`${result.type}-${result.id}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(result.href);
                }}
              >
                <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  {result.type}
                </span>
                <span className="truncate">{result.title}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {result.subtitle}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
