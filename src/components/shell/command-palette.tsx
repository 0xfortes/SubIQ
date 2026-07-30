"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryMark } from "@/components/ui/category-mark";
import {
  ChartLine,
  LayoutDashboard,
  Plus,
  Repeat,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function CommandPalette({
  subs,
  categories,
}: {
  subs: { id: string; name: string }[];
  categories: { slug: string; name: string; color: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.isComposing || e.repeat) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(url: string) {
    setOpen(false);
    router.push(url);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          aria-label="Open command palette"
          className="border-line text-faint hover:border-line-strong hover:text-muted focus-visible:outline-accent flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors duration-100 select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px"
        >
          <Search size={12} aria-hidden />
          <span>Search</span>
          <kbd className="font-data hidden text-[10px] sm:inline">⌘K</kbd>
        </button>
      }
    >
      {/* Radix unmounts content on close, so cmdk's query resets for free. */}
      <Command loop label="Command palette">
        <CommandInput placeholder="Search or jump to…" autoFocus />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Go to">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} onSelect={() => run(href)}>
                <Icon size={15} strokeWidth={1.75} aria-hidden />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run("/subscriptions?new=1")}>
              <Plus size={15} strokeWidth={1.75} aria-hidden />
              Add subscription
            </CommandItem>
          </CommandGroup>
          {subs.length > 0 ? (
            <CommandGroup heading="Subscriptions">
              {subs.map((sub) => (
                <CommandItem
                  key={sub.id}
                  value={sub.name}
                  onSelect={() =>
                    run(`/subscriptions?q=${encodeURIComponent(sub.name)}`)
                  }
                >
                  <Repeat size={15} strokeWidth={1.75} aria-hidden />
                  {sub.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {categories.length > 0 ? (
            <CommandGroup heading="Categories">
              {categories.map((category) => (
                <CommandItem
                  key={category.slug}
                  value={category.name}
                  onSelect={() => run(`/dashboard?category=${category.slug}`)}
                >
                  <CategoryMark color={category.color} />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
