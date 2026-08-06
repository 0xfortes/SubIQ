"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ListFilters } from "../schemas";
import type { SubscriptionRow } from "../queries";
import { SubscriptionFormDialog } from "./subscription-form-dialog";
import { SubscriptionTable } from "./subscription-table";
import { SubscriptionsToolbar } from "./subscriptions-toolbar";

interface SubscriptionsViewProps {
  rows: SubscriptionRow[];
  categories: { id: string; name: string; slug: string; color: string }[];
  filters: ListFilters;
  /** Open the create dialog on mount (?new=1 from the topbar Add button). */
  openNew: boolean;
  /** User's IANA timezone — the "today" reference for renewal columns. */
  timeZone: string;
  /** Workspace default currency, pre-selected for new subscriptions. */
  defaultCurrency: string;
}

const STATUS_LABEL: Record<ListFilters["status"], string> = {
  all: "",
  active: "Active",
  trial: "Trial",
  paused: "Paused",
  archived: "Archived",
};

/** No search, no category, no status narrowing — a genuinely empty account. */
function isUnfiltered(filters: ListFilters): boolean {
  return !filters.q && !filters.category && filters.status === "all";
}

function emptyMessage(filters: ListFilters): string {
  if (filters.status === "archived" && !filters.q && !filters.category) {
    return "No archived subscriptions.";
  }
  if (isUnfiltered(filters)) {
    return "No subscriptions yet. Start tracking your recurring spend.";
  }
  const parts: string[] = [];
  if (filters.q) parts.push(`matching “${filters.q}”`);
  if (filters.status === "archived") parts.push("in the archive");
  else if (filters.status !== "all")
    parts.push(`with status ${STATUS_LABEL[filters.status]}`);
  if (filters.category) parts.push(`in this category`);
  return `No subscriptions ${parts.join(" ")}. Clear the search or switch filters.`;
}

export function SubscriptionsView({
  rows,
  categories,
  filters,
  openNew,
  timeZone,
  defaultCurrency,
}: SubscriptionsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(openNew);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);

  // ?new=1 must open the dialog even when we're ALREADY on this route: the
  // topbar link is then a soft navigation that never remounts this component,
  // so the initializer above doesn't run again. Adjusted during render rather
  // than in an effect (React's documented pattern for reacting to a prop
  // change) — an effect would render the closed dialog first, and deriving
  // `open` straight from the URL would keep it open until router.replace
  // round-trips on close. closeDialog strips the param, which is what lets a
  // second click re-open.
  const [lastOpenNew, setLastOpenNew] = useState(openNew);
  if (openNew !== lastOpenNew) {
    setLastOpenNew(openNew);
    if (openNew) setDialogOpen(true);
  }

  const categoryName = filters.category
    ? categories.find((c) => c.slug === filters.category)?.name
    : undefined;

  function closeDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      if (openNew) router.replace(pathname, { scroll: false });
    }
  }

  return (
    <section className="rounded-card border-line bg-surface border">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <h1 className="text-sm font-medium tracking-tight">
            {categoryName ? `Subscriptions — ${categoryName}` : "Subscriptions"}
          </h1>
          <p className="text-faint mt-0.5 text-[11px]">
            {rows.length} {rows.length === 1 ? "subscription" : "subscriptions"}
          </p>
        </div>
        <SubscriptionsToolbar
          q={filters.q}
          status={filters.status}
          sort={filters.sort}
        />
      </header>

      <SubscriptionTable
        rows={rows}
        onEdit={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
        emptyMessage={emptyMessage(filters)}
        // Only on a truly empty account — never alongside a filtered-empty
        // view, and never as a second copy of the topbar's Add button.
        onAdd={isUnfiltered(filters) ? () => setDialogOpen(true) : undefined}
        archived={filters.status === "archived"}
        timeZone={timeZone}
        defaultCurrency={defaultCurrency}
      />

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={closeDialog}
        categories={categories}
        subscription={editing}
        defaultCurrency={defaultCurrency}
      />
    </section>
  );
}
