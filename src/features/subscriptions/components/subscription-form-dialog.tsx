"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import { formatDay } from "@/lib/dates";
import {
  currencySymbol,
  formatMoney,
  formatMoneyInput,
  monthlyEquivalentMinor,
  parseMoneyInput,
  SUPPORTED_CURRENCIES,
} from "@/lib/money";
import { computeNextRenewalAt } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceIcon } from "@/components/ui/service-icon";
import { createSubscriptionAction, updateSubscriptionAction } from "../actions";
import { CATEGORY_NAME_MAX } from "../schemas";
import type { SubscriptionRow } from "../queries";

/**
 * The subscription composer.
 *
 * Design intent (DESIGN.md → "Form dialog"): this dialog creates a record the
 * app already renders elsewhere, so it shows you that record being built
 * rather than presenting a grid of equal-weight inputs. Three tiers of
 * hierarchy — identity (who), amount (how much), details (everything else) —
 * with the real brand registry and the real recurrence engine doing the work,
 * so the preview can never disagree with what gets saved.
 */

/** The three cadences that cover almost every subscription, plus an escape. */
const CYCLE_PRESETS = [
  { value: "MONTH", label: "Monthly" },
  { value: "YEAR", label: "Yearly" },
  { value: "WEEK", label: "Weekly" },
  { value: "custom", label: "Custom" },
] as const satisfies readonly SegmentedOption<string>[];

type CyclePreset = (typeof CYCLE_PRESETS)[number]["value"];

const INTERVAL_UNIT_LABELS: Record<BillingInterval, string> = {
  [BillingInterval.WEEK]: "weeks",
  [BillingInterval.MONTH]: "months",
  [BillingInterval.YEAR]: "years",
};

const STATUS_OPTIONS = [
  { value: SubscriptionStatus.ACTIVE, label: "Active" },
  { value: SubscriptionStatus.TRIAL, label: "Trial" },
  { value: SubscriptionStatus.PAUSED, label: "Paused" },
  { value: SubscriptionStatus.CANCELLED, label: "Cancelled" },
] as const satisfies readonly SegmentedOption<SubscriptionStatus>[];

/**
 * Sentinel for the "Other…" option. Radix Select needs a non-empty value, and
 * a UUID-shaped id can never collide with it.
 */
const OTHER_CATEGORY = "__other__";

interface FormValues {
  name: string;
  vendor: string;
  categoryId: string;
  categoryName: string;
  amount: string;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  anchorDate: string;
  status: SubscriptionStatus;
  trialEndsAt: string;
  url: string;
  notes: string;
}

interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  /** Present = edit mode. */
  subscription?: SubscriptionRow | null;
  /** Workspace default, pre-selected for new subscriptions. */
  defaultCurrency: string;
}

function toDateInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function initialValues(
  subscription: SubscriptionRow | null | undefined,
  defaultCurrency: string,
): FormValues {
  if (!subscription) {
    return {
      name: "",
      vendor: "",
      categoryId: "",
      categoryName: "",
      amount: "",
      currency: defaultCurrency,
      interval: BillingInterval.MONTH,
      intervalCount: 1,
      anchorDate: toDateInput(new Date()),
      status: SubscriptionStatus.ACTIVE,
      trialEndsAt: "",
      url: "",
      notes: "",
    };
  }
  return {
    name: subscription.name,
    vendor: subscription.vendor ?? "",
    categoryId: subscription.categoryId ?? "",
    categoryName: "",
    amount: formatMoneyInput(subscription.amountMinor, subscription.currency),
    currency: subscription.currency,
    interval: subscription.interval,
    intervalCount: subscription.intervalCount,
    anchorDate: toDateInput(subscription.anchorDate),
    status: subscription.status,
    trialEndsAt: toDateInput(subscription.trialEndsAt),
    url: subscription.url ?? "",
    notes: subscription.notes ?? "",
  };
}

/**
 * A row in the details list. Inline by default (label left, control right) —
 * `stacked` puts the control on its own full-width line beneath the label,
 * for controls too wide to sit in the right rail.
 */
function DetailRow({
  label,
  htmlFor,
  children,
  stacked = false,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-line border-t px-5",
        stacked
          ? "flex flex-col gap-2 py-3"
          : "flex min-h-11 items-center justify-between gap-3",
      )}
    >
      <Label
        htmlFor={htmlFor}
        className="text-muted shrink-0 text-[12.5px] font-normal"
      >
        {label}
      </Label>
      <div
        className={cn(
          "flex min-w-0 items-center gap-2",
          stacked && "w-full [&>*]:w-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Native date input, styled to sit flush in a row. Kept native on purpose: it
 * is fully keyboard operable, opens the OS picker on mobile, and costs no
 * dependency — a hand-rolled calendar would be a worse a11y story. Only the
 * browser's own indicator glyph is retinted to match the palette.
 */
const DATE_INPUT_CLASS = cn(
  "font-data hover:bg-wash focus-visible:outline-accent rounded-md bg-transparent py-1 pr-1.5 pl-2 text-[12.5px] outline-none focus-visible:outline-2 focus-visible:outline-offset-1",
  "[&::-webkit-calendar-picker-indicator]:ml-1.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:hover:opacity-100",
);

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  categories,
  subscription,
  defaultCurrency,
}: SubscriptionFormDialogProps) {
  const defaults = useMemo(
    () => initialValues(subscription, defaultCurrency),
    [subscription, defaultCurrency],
  );
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaults });

  const editing = Boolean(subscription);
  // Optional fields start hidden, but stay open when editing a record that
  // already has them — hiding existing data would be a trap.
  const [extrasOpen, setExtrasOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(defaults);
    setExtrasOpen(Boolean(defaults.notes || defaults.url));
  }, [open, defaults, reset]);

  const name = watch("name");
  const amount = watch("amount");
  const currency = watch("currency");
  const interval = watch("interval");
  const intervalCount = watch("intervalCount");
  const anchorDate = watch("anchorDate");
  const status = watch("status");
  const categoryChoice = watch("categoryId");
  const namingCategory = categoryChoice === OTHER_CATEGORY;

  // A non-1 count can't be expressed by the presets, so it selects "Custom".
  const cyclePreset: CyclePreset =
    Number(intervalCount) === 1 ? interval : "custom";

  function selectCycle(next: CyclePreset) {
    if (next === "custom") {
      // Seed a value the presets can't express, so the control stays on
      // Custom instead of snapping back to the preset the user just left.
      setValue("intervalCount", Math.max(2, Number(intervalCount) || 2));
      return;
    }
    setValue("interval", next);
    setValue("intervalCount", 1);
  }

  /**
   * The live summary. Uses the same recurrence engine and money helpers the
   * server and the rest of the app use, so what it promises is what gets
   * stored. Renewal dates are calendar days — formatted in UTC, never the
   * profile timezone (see lib/dates.ts).
   */
  const summary = useMemo(() => {
    const amountMinor = parseMoneyInput(amount ?? "", currency);
    if (amountMinor === null || !anchorDate) return null;
    const anchor = new Date(`${anchorDate}T00:00:00.000Z`);
    if (Number.isNaN(anchor.getTime())) return null;

    const count = Number(intervalCount) || 1;
    const next = computeNextRenewalAt(anchor, interval, count, new Date());
    return {
      renews: formatDay(next, new Date()),
      monthly: formatMoney(
        monthlyEquivalentMinor(amountMinor, interval, count),
        currency,
      ),
    };
  }, [amount, currency, anchorDate, interval, intervalCount]);

  async function onSubmit(values: FormValues) {
    const amountMinor = parseMoneyInput(values.amount, values.currency);
    if (amountMinor === null) {
      setError("amount", {
        message: `Enter a valid ${values.currency} amount`,
      });
      return;
    }
    // The two category fields are mutually exclusive — the server rejects
    // both at once, so send exactly the one the user answered with.
    const namedCategory = values.categoryId === OTHER_CATEGORY;
    const payload = {
      name: values.name,
      vendor: values.vendor || undefined,
      categoryId: namedCategory ? undefined : values.categoryId || undefined,
      categoryName: namedCategory ? values.categoryName : undefined,
      amountMinor,
      currency: values.currency,
      interval: values.interval,
      intervalCount: Number(values.intervalCount),
      anchorDate: values.anchorDate,
      status: values.status,
      trialEndsAt:
        values.status === SubscriptionStatus.TRIAL && values.trialEndsAt
          ? values.trialEndsAt
          : undefined,
      url: values.url || undefined,
      notes: values.notes || undefined,
    };

    const result = editing
      ? await updateSubscriptionAction({ ...payload, id: subscription!.id })
      : await createSubscriptionAction(payload);

    if (result.ok) {
      toast.success(editing ? `Saved ${values.name}` : `Added ${values.name}`);
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  const trimmedName = name?.trim() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "border-line bg-surface rounded-card gap-0 overflow-hidden border p-0 ring-0 sm:max-w-[480px]",
          // Modals keep a centered origin (they aren't anchored to a trigger)
          // and enter from scale(0.97), never from nothing.
          "data-open:zoom-in-95 duration-200 ease-[var(--ease-out-strong)]",
        )}
      >
        {/* The dialog is titled by the service name itself, so the a11y title
            and description stay available without competing visually. */}
        <DialogTitle className="sr-only">
          {editing ? `Edit ${subscription?.name}` : "Add subscription"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {editing
            ? "Changes recompute the next renewal date."
            : "Track a recurring charge and its renewal."}
        </DialogDescription>

        {/* min-w-0: DialogContent is a grid, and a grid item's default
            min-width:auto would let the form refuse to shrink below its
            content width — clipping controls on narrow viewports. */}
        <form className="min-w-0" onSubmit={handleSubmit(onSubmit)}>
          {/* ── Identity ─────────────────────────────────────────────── */}
          <div className="flex items-start gap-3.5 px-5 pt-5 pb-4">
            {trimmedName ? (
              <ServiceIcon
                // Remount on identity change so the pop animation replays
                // when a name first resolves to a real brand.
                key={trimmedName.toLowerCase()}
                name={trimmedName}
                size="lg"
                className="brand-pop mt-0.5"
              />
            ) : (
              <span
                aria-hidden
                className="border-line text-faint mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-dashed"
              >
                <Plus size={16} strokeWidth={1.75} />
              </span>
            )}

            <div className="min-w-0 flex-1">
              <Label htmlFor="sub-name" className="sr-only">
                Service
              </Label>
              <input
                id="sub-name"
                autoComplete="off"
                placeholder="Netflix"
                aria-invalid={Boolean(errors.name)}
                className="placeholder:text-faint w-full bg-transparent text-[20px] font-medium tracking-[-0.01em] outline-none"
                {...register("name", { required: "Name is required" })}
              />
              <Label htmlFor="sub-vendor" className="sr-only">
                Provider
              </Label>
              <input
                id="sub-vendor"
                autoComplete="off"
                placeholder="Add a provider"
                className="text-muted placeholder:text-faint/70 mt-0.5 w-full bg-transparent text-[12.5px] outline-none"
                {...register("vendor")}
              />
              {errors.name ? (
                <p role="alert" className="text-rose mt-1 text-xs">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Amount ───────────────────────────────────────────────── */}
          <div className="border-line flex flex-col gap-3 border-t px-5 py-4">
            <div className="flex items-end justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span
                  aria-hidden
                  className="font-data text-faint text-[19px] leading-none"
                >
                  {currencySymbol(currency)}
                </span>
                <Label htmlFor="sub-amount" className="sr-only">
                  Cost
                </Label>
                <input
                  id="sub-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.amount)}
                  className="font-data placeholder:text-faint/50 w-full min-w-0 bg-transparent text-[30px] leading-none tracking-[-0.02em] outline-none"
                  {...register("amount", { required: "Cost is required" })}
                />
              </div>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      size="sm"
                      aria-label="Currency"
                      className="border-line text-muted hover:border-line-strong font-data shrink-0 text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {errors.amount ? (
              <p role="alert" className="text-rose text-xs">
                {errors.amount.message}
              </p>
            ) : null}

            <SegmentedControl
              label="Billing cycle"
              value={cyclePreset}
              onValueChange={selectCycle}
              options={CYCLE_PRESETS}
            />

            {cyclePreset === "custom" ? (
              <div className="flex items-center gap-2">
                <span className="text-muted text-[12.5px]">Every</span>
                <Input
                  type="number"
                  min={1}
                  max={36}
                  aria-label="Interval count"
                  className="font-data h-8 w-16 shrink-0"
                  {...register("intervalCount", {
                    valueAsNumber: true,
                    min: 1,
                    max: 36,
                  })}
                />
                <Controller
                  control={control}
                  name="interval"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        size="sm"
                        aria-label="Billing interval"
                        className="border-line min-w-0 flex-1 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(BillingInterval).map((value) => (
                          <SelectItem key={value} value={value}>
                            {INTERVAL_UNIT_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ) : null}
          </div>

          {/* ── Details ──────────────────────────────────────────────── */}
          <DetailRow label="Category" htmlFor="sub-category">
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                // Controlled with "" for "no category" — passing undefined
                // would make the field uncontrolled until first pick, which
                // React warns about the moment a user selects one.
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="sub-category"
                    size="sm"
                    aria-label="Category"
                    className="hover:bg-wash h-7 border-transparent px-2 text-[12.5px]"
                  >
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_CATEGORY}>Other…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </DetailRow>

          {namingCategory ? (
            <div className="border-line flex flex-col gap-1.5 border-t px-5 py-3">
              <Label htmlFor="sub-category-name" className="text-[12.5px]">
                New category
              </Label>
              <Input
                id="sub-category-name"
                placeholder="Streaming"
                autoFocus
                maxLength={CATEGORY_NAME_MAX}
                aria-invalid={Boolean(errors.categoryName)}
                className="h-8"
                {...register("categoryName", {
                  required: "Name the new category",
                })}
              />
              {errors.categoryName ? (
                <p role="alert" className="text-rose text-xs">
                  {errors.categoryName.message}
                </p>
              ) : (
                <p className="text-faint text-[11px]">
                  Reuses an existing category if the name already matches one.
                </p>
              )}
            </div>
          ) : null}

          <DetailRow label="First bill" htmlFor="sub-anchor">
            <input
              id="sub-anchor"
              type="date"
              className={DATE_INPUT_CLASS}
              {...register("anchorDate", { required: true })}
            />
          </DetailRow>

          {/* Stacked: four status labels can't fit the right rail without
              clipping, and a squeezed control reads cheap. */}
          <DetailRow label="Status" stacked>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <SegmentedControl
                  label="Status"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={STATUS_OPTIONS}
                />
              )}
            />
          </DetailRow>

          {status === SubscriptionStatus.TRIAL ? (
            <DetailRow label="Trial ends" htmlFor="sub-trial-ends">
              <input
                id="sub-trial-ends"
                type="date"
                className={DATE_INPUT_CLASS}
                {...register("trialEndsAt")}
              />
            </DetailRow>
          ) : null}

          {/* ── Optional extras (progressive disclosure) ─────────────── */}
          {extrasOpen ? (
            <div className="border-line flex flex-col gap-3 border-t px-5 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-notes" className="text-muted text-[12.5px]">
                  Notes
                </Label>
                <Input
                  id="sub-notes"
                  placeholder="Shared with family"
                  className="h-8"
                  {...register("notes")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-url" className="text-muted text-[12.5px]">
                  Website
                </Label>
                <Input
                  id="sub-url"
                  type="url"
                  inputMode="url"
                  placeholder="https://netflix.com"
                  aria-invalid={Boolean(errors.url)}
                  className="h-8"
                  {...register("url")}
                />
                {errors.url ? (
                  <p role="alert" className="text-rose text-xs">
                    {errors.url.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="border-line border-t px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExtrasOpen(true)}
              >
                <Plus size={13} aria-hidden data-icon="inline-start" />
                Add note or link
              </Button>
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────────────── */}
          {/* Wraps on narrow viewports so the summary never squeezes the
              actions off-screen; the actions stay right-aligned either way. */}
          <div className="border-line bg-surface-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-5 py-3.5">
            <p
              aria-live="polite"
              className="text-muted min-w-0 truncate text-[11.5px]"
            >
              {summary ? (
                <>
                  Renews{" "}
                  <span className="font-data text-text">{summary.renews}</span>
                  <span className="text-faint"> · </span>
                  <span className="font-data text-text">{summary.monthly}</span>
                  <span className="text-faint">/mo</span>
                </>
              ) : (
                <span className="text-faint">
                  Add a cost to see the renewal
                </span>
              )}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Add subscription"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
