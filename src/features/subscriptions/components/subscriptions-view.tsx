"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function emptyMessage(filters: ListFilters): string {
  if (filters.status === "archived" && !filters.q && !filters.category) {
    return "No archived subscriptions.";
  }
  const parts: string[] = [];
  if (filters.q) parts.push(`matching “${filters.q}”`);
  if (filters.status === "archived") parts.push("in the archive");
  else if (filters.status !== "all")
    parts.push(`with status ${STATUS_LABEL[filters.status]}`);
  if (filters.category) parts.push(`in this category`);
  if (parts.length === 0) {
    return "No subscriptions yet. Add your first to start tracking renewals.";
  }
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
        <div className="flex items-center gap-2">
          <SubscriptionsToolbar
            q={filters.q}
            status={filters.status}
            sort={filters.sort}
          />
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} aria-hidden data-icon="inline-start" />
            Add subscription
          </Button>
        </div>
      </header>

      <SubscriptionTable
        rows={rows}
        onEdit={(row) => {
          setEditing(row);
          setDialogOpen(true);
        }}
        emptyMessage={emptyMessage(filters)}
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
