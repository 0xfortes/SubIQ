"use client";

import { useState, useOptimistic, useTransition } from "react";
import { MoreHorizontal, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import { convertMinor, formatMoney } from "@/lib/money";
import { formatDay, todayInZone } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  archiveSubscriptionsAction,
  deleteSubscriptionsAction,
  duplicateSubscriptionAction,
  restoreSubscriptionsAction,
  toggleFavoriteAction,
} from "../actions";
import { cycleSuffix } from "@/lib/recurrence";
import type { SubscriptionRow } from "../queries";
import { ServiceAvatar } from "@/components/ui/service-avatar";
import { CategoryMark } from "@/components/ui/category-mark";
import { StatusPill } from "./status-pill";

interface SubscriptionTableProps {
  rows: SubscriptionRow[];
  onEdit: (row: SubscriptionRow) => void;
  emptyMessage: string;
  /** Archived view: per-row Restore replaces favorite/menu/selection. */
  archived?: boolean;
  /** User's IANA timezone — the "today" reference for the renewal column. */
  timeZone?: string;
  /** Workspace base currency — every Cost is converted into it for display. */
  defaultCurrency: string;
}

type OptimisticPatch =
  | { kind: "favorite"; id: string; isFavorite: boolean }
  | { kind: "remove"; id: string }
  | { kind: "remove-many"; ids: string[] };

/** Matches subscriptionIdsSchema's cap — bulk actions reject more. */
const BULK_LIMIT = 100;

export function SubscriptionTable({
  rows,
  onEdit,
  emptyMessage,
  archived = false,
  timeZone = "UTC",
  defaultCurrency,
}: SubscriptionTableProps) {
  const [, startTransition] = useTransition();
  // Renewal dates are calendar days (formatted in UTC); the zoned "today"
  // only fixes which year is elided around New Year.
  const todayStart = todayInZone(timeZone);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [optimisticRows, applyPatch] = useOptimistic(
    rows,
    (current: SubscriptionRow[], patch: OptimisticPatch) => {
      if (patch.kind === "remove") {
        return current.filter((row) => row.id !== patch.id);
      }
      if (patch.kind === "remove-many") {
        const removing = new Set(patch.ids);
        return current.filter((row) => !removing.has(row.id));
      }
      return current.map((row) =>
        row.id === patch.id ? { ...row, isFavorite: patch.isFavorite } : row,
      );
    },
  );

  // Intersect with visible rows so selections self-prune when rows vanish
  // (archive elsewhere, filter change, revalidation).
  const visibleSelected = new Set(
    optimisticRows.filter((row) => selected.has(row.id)).map((row) => row.id),
  );
  const allSelected =
    optimisticRows.length > 0 && visibleSelected.size === optimisticRows.length;
  const headerState: boolean | "indeterminate" = allSelected
    ? true
    : visibleSelected.size > 0
      ? "indeterminate"
      : false;
  const overLimit = visibleSelected.size > BULK_LIMIT;

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(
      checked ? new Set(optimisticRows.map((row) => row.id)) : new Set(),
    );
  }

  function handleFavorite(row: SubscriptionRow) {
    startTransition(async () => {
      applyPatch({
        kind: "favorite",
        id: row.id,
        isFavorite: !row.isFavorite,
      });
      const result = await toggleFavoriteAction({
        id: row.id,
        isFavorite: !row.isFavorite,
      });
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleArchive(row: SubscriptionRow) {
    startTransition(async () => {
      applyPatch({ kind: "remove", id: row.id });
      const result = await archiveSubscriptionsAction({ ids: [row.id] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast(`Archived ${row.name}`, {
        action: {
          label: "Undo",
          onClick: () => restoreSubscriptionsAction({ ids: [row.id] }),
        },
      });
    });
  }

  function handleBulkArchive() {
    const ids = [...visibleSelected];
    setSelected(new Set());
    startTransition(async () => {
      applyPatch({ kind: "remove-many", ids });
      const result = await archiveSubscriptionsAction({ ids });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast(
        `Archived ${ids.length} ${ids.length === 1 ? "subscription" : "subscriptions"}`,
        {
          action: {
            label: "Undo",
            onClick: () => restoreSubscriptionsAction({ ids }),
          },
        },
      );
    });
  }

  function handleRestore(row: SubscriptionRow) {
    startTransition(async () => {
      applyPatch({ kind: "remove", id: row.id });
      const result = await restoreSubscriptionsAction({ ids: [row.id] });
      if (result.ok) toast.success(`Restored ${row.name}`);
      else toast.error(result.error);
    });
  }

  function handleDuplicate(row: SubscriptionRow) {
    startTransition(async () => {
      const result = await duplicateSubscriptionAction({ id: row.id });
      if (result.ok) toast.success(`Duplicated ${row.name}`);
      else toast.error(result.error);
    });
  }

  // Hard delete is irreversible, so it routes through a confirm dialog rather
  // than the optimistic + undo pattern archive uses.
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

  function confirmDelete() {
    if (!pendingDelete) return;
    const { ids, label } = pendingDelete;
    setPendingDelete(null);
    setSelected(new Set());
    startTransition(async () => {
      applyPatch(
        ids.length === 1
          ? { kind: "remove", id: ids[0]! }
          : { kind: "remove-many", ids },
      );
      const result = await deleteSubscriptionsAction({ ids });
      if (result.ok) toast.success(`Deleted ${label}`);
      else toast.error(result.error);
    });
  }

  if (optimisticRows.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-muted text-[13px]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {visibleSelected.size > 0 ? (
        <div className="border-line bg-surface-2 flex flex-wrap items-center gap-2 border-t px-4 py-2">
          <span className="font-data text-muted text-xs">
            {visibleSelected.size} selected
          </span>
          {overLimit ? (
            <span className="text-faint text-[11px]">
              {BULK_LIMIT} max per action
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={overLimit}
              onClick={handleBulkArchive}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={overLimit}
              onClick={() =>
                setPendingDelete({
                  ids: [...visibleSelected],
                  label: `${visibleSelected.size} subscription${visibleSelected.size === 1 ? "" : "s"}`,
                })
              }
              className="text-rose hover:text-rose"
            >
              Delete
            </Button>
          </div>
        </div>
      ) : null}

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-faint text-left text-[10.5px] tracking-wide uppercase">
            {!archived ? (
              <th scope="col" className="w-8 py-2 pl-4">
                <Checkbox
                  checked={headerState}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="Select all subscriptions"
                />
              </th>
            ) : null}
            <th scope="col" className="px-4 py-2 font-medium">
              Service
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium md:table-cell"
            >
              Category
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Cost
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium md:table-cell"
            >
              Next renewal
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="w-10 px-2 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {optimisticRows.map((row) => (
            <tr
              key={row.id}
              className="border-line hover:bg-wash border-t transition-colors duration-100"
            >
              {!archived ? (
                <td className="w-8 py-2.5 pl-4">
                  <Checkbox
                    checked={visibleSelected.has(row.id)}
                    onCheckedChange={(checked) =>
                      toggleRow(row.id, checked === true)
                    }
                    aria-label={`Select ${row.name}`}
                  />
                </td>
              ) : null}
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <ServiceAvatar name={row.name} color={row.color} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text truncate font-medium">
                        {row.name}
                      </span>
                      {!archived ? (
                        <button
                          type="button"
                          onClick={() => handleFavorite(row)}
                          aria-label={
                            row.isFavorite
                              ? `Remove ${row.name} from favorites`
                              : `Add ${row.name} to favorites`
                          }
                          aria-pressed={row.isFavorite}
                          className="focus-visible:outline-accent rounded-sm p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          <Star
                            size={12}
                            aria-hidden
                            className={cn(
                              "transition-colors duration-100",
                              row.isFavorite
                                ? "fill-amber text-amber"
                                : "text-faint hover:text-muted",
                            )}
                          />
                        </button>
                      ) : null}
                    </div>
                    {row.vendor ? (
                      <p className="text-faint truncate text-[11px]">
                        {row.vendor}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="hidden px-3 py-2.5 md:table-cell">
                {row.category ? (
                  <span className="text-muted flex items-center gap-1.5">
                    <CategoryMark color={row.category.color} />
                    {row.category.name}
                  </span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="font-data text-text">
                  {formatMoney(
                    convertMinor(
                      row.amountMinor,
                      row.currency,
                      defaultCurrency,
                    ),
                    defaultCurrency,
                  )}
                </span>
                <span className="font-data text-faint text-[11px]">
                  {cycleSuffix(row.interval, row.intervalCount)}
                </span>
              </td>
              <td className="hidden px-3 py-2.5 md:table-cell">
                <span className="font-data text-muted">
                  {formatDay(row.nextRenewalAt, todayStart)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <StatusPill status={row.status} />
              </td>
              <td className="px-2 py-2.5">
                {archived ? (
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(row)}
                      aria-label={`Restore ${row.name}`}
                    >
                      <RotateCcw
                        size={12}
                        aria-hidden
                        data-icon="inline-start"
                      />
                      Restore
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`More actions for ${row.name}`}
                        >
                          <MoreHorizontal size={14} aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() =>
                            setPendingDelete({ ids: [row.id], label: row.name })
                          }
                        >
                          Delete permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${row.name}`}
                      >
                        <MoreHorizontal size={14} aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(row)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDuplicate(row)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleArchive(row)}>
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          setPendingDelete({ ids: [row.id], label: row.name })
                        }
                      >
                        Delete permanently
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently removing{" "}
              <span className="text-text font-medium">
                {pendingDelete?.label}
              </span>{" "}
              also deletes its reminder history, and can&apos;t be undone. To
              keep it recoverable, archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" size="sm" onClick={confirmDelete}>
                Delete permanently
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
