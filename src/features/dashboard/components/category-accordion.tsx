"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryMark } from "@/components/ui/category-mark";
import type { AccordionCategory } from "../queries";

const OPEN_STATE_KEY = "subiq:accordion-open";
const FOLD_AFTER = 10;
/** Routes that understand ?category=; everything else scopes the dashboard. */
const SCOPED_ROUTES = ["/dashboard", "/subscriptions"];

// Persisted open-state, read via useSyncExternalStore so SSR renders
// collapsed and the client store hydrates without effect-driven setState.
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readOpenState(): string {
  return localStorage.getItem(OPEN_STATE_KEY) ?? "[]";
}

function writeOpenState(next: string[]) {
  try {
    localStorage.setItem(OPEN_STATE_KEY, JSON.stringify(next));
    // Same-tab writes don't emit "storage"; notify our own subscribers.
    window.dispatchEvent(new StorageEvent("storage", { key: OPEN_STATE_KEY }));
  } catch {
    // Private mode etc. — accordion still works, state just won't stick.
  }
}

export function CategoryAccordion({
  categories,
}: {
  categories: AccordionCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("category");
  const [showAll, setShowAll] = useState(false);

  const openJson = useSyncExternalStore(
    subscribeToStorage,
    readOpenState,
    () => "[]",
  );
  const open = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(openJson) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [openJson]);

  const persistOpen = writeOpenState;

  function navigate(slug: string | null) {
    const base = SCOPED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
      ? pathname
      : "/dashboard";
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("category", slug);
    else params.delete("category");
    router.push(params.size ? `${base}?${params.toString()}` : base, {
      scroll: false,
    });
  }

  function handleRowClick(slug: string) {
    if (selected === slug) {
      persistOpen(open.filter((s) => s !== slug));
      navigate(null);
    } else {
      if (!open.includes(slug)) persistOpen([...open, slug]);
      navigate(slug);
    }
  }

  const visible = showAll ? categories : categories.slice(0, FOLD_AFTER);

  if (categories.length === 0) return null;

  return (
    <div className="px-2">
      <div className="flex items-center justify-between px-2.5 pb-1.5">
        <h2 className="text-faint text-[10px] font-medium tracking-widest uppercase">
          Categories
        </h2>
        {selected ? (
          <button
            type="button"
            onClick={() => navigate(null)}
            className="text-accent focus-visible:outline-accent rounded-sm text-[10.5px] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Clear
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-px">
        {visible.map((category) => {
          const isSelected = selected === category.slug;
          const isOpen = open.includes(category.slug);
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => handleRowClick(category.slug)}
                aria-expanded={isOpen}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2.5 pl-2 text-left text-xs transition-colors duration-100",
                  "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2",
                  isSelected
                    ? "bg-accent-soft text-text"
                    : "text-muted hover:bg-wash hover:text-text",
                )}
              >
                {isSelected ? (
                  <span
                    aria-hidden
                    className="rounded-pill bg-accent absolute inset-y-1 left-0 w-0.5"
                  />
                ) : null}
                <ChevronRight
                  size={11}
                  aria-hidden
                  className={cn(
                    "text-faint shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                    isOpen && "rotate-90",
                  )}
                />
                <CategoryMark color={category.color} />
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                <span className="font-data text-faint text-[11px]">
                  {formatMoney(category.monthlyTotalMinor, category.currency)}
                </span>
              </button>

              {isOpen ? (
                <ul className="border-line my-0.5 ml-[17px] flex flex-col border-l pl-3">
                  {category.children.map((child) => (
                    <li
                      key={child.id}
                      className="flex items-baseline justify-between gap-2 py-1 text-[11.5px]"
                    >
                      <span className="text-muted min-w-0 truncate">
                        {child.name}
                      </span>
                      <span className="font-data text-faint shrink-0">
                        {formatMoney(child.monthlyMinor, category.currency)}/mo
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {categories.length > FOLD_AFTER ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-faint hover:bg-wash hover:text-muted focus-visible:outline-accent mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {showAll
            ? "Show fewer"
            : `Show ${categories.length - FOLD_AFTER} more`}
        </button>
      ) : null}
    </div>
  );
}
