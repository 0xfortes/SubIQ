"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SORT_OPTIONS,
  STATUS_FILTERS,
  type SortOption,
  type StatusFilter,
} from "../schemas";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  active: "Active",
  trial: "Trial",
  paused: "Paused",
  archived: "Archived",
};

const SORT_LABELS: Record<SortOption, string> = {
  renewal: "Renewal date",
  name: "Name",
  cost: "Cost",
};

const DEFAULT_SORT: SortOption = "renewal";

const SEARCH_DEBOUNCE_MS = 250;

/** Search + status chips + sort. All filter state lives in the URL. */
export function SubscriptionsToolbar({
  q,
  status,
  sort,
}: {
  q?: string;
  status: StatusFilter;
  sort: SortOption;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(q ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    router.replace(
      params.size ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false },
    );
  }

  useEffect(() => () => clearTimeout(debounce.current), []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search
          size={13}
          aria-hidden
          className="text-faint pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
        />
        <input
          type="search"
          value={search}
          placeholder="Search subscriptions"
          aria-label="Search subscriptions"
          onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            clearTimeout(debounce.current);
            debounce.current = setTimeout(() => {
              pushParams((params) => {
                if (value) params.set("q", value);
                else params.delete("q");
              });
            }, SEARCH_DEBOUNCE_MS);
          }}
          className="border-line text-text placeholder:text-faint hover:border-line-strong focus-visible:outline-accent h-8 w-56 rounded-md border bg-transparent pr-2.5 pl-8 text-[13px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </div>
      <div
        role="group"
        aria-label="Filter by status"
        className="flex items-center gap-1"
      >
        {STATUS_FILTERS.map((value) => (
          <Fragment key={value}>
            {value === "archived" ? (
              // Lifecycle filter, not a status — visually set apart.
              <span aria-hidden className="bg-line mx-0.5 h-4 w-px" />
            ) : null}
            <button
              type="button"
              aria-pressed={status === value}
              onClick={() =>
                pushParams((params) => {
                  if (value === "all") params.delete("status");
                  else params.set("status", value);
                })
              }
              className={cn(
                "h-7 rounded-md px-2.5 text-xs transition-colors duration-100",
                "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2",
                status === value
                  ? "bg-accent-soft text-text"
                  : "text-muted hover:bg-wash hover:text-text",
              )}
            >
              {STATUS_LABELS[value]}
            </button>
          </Fragment>
        ))}
      </div>
      <Select
        value={sort}
        onValueChange={(value) =>
          pushParams((params) => {
            if (value === DEFAULT_SORT) params.delete("sort");
            else params.set("sort", value);
          })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label="Sort subscriptions"
          className="border-line text-muted hover:border-line-strong gap-1 text-xs"
        >
          <ArrowUpDown size={12} aria-hidden className="text-faint" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {SORT_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
