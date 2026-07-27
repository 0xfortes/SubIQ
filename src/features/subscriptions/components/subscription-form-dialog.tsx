"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { BillingInterval, SubscriptionStatus } from "@/generated/prisma/enums";
import {
  formatMoneyInput,
  parseMoneyInput,
  SUPPORTED_CURRENCIES,
} from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubscriptionAction, updateSubscriptionAction } from "../actions";
import type { SubscriptionRow } from "../queries";

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  [BillingInterval.WEEK]: "week(s)",
  [BillingInterval.MONTH]: "month(s)",
  [BillingInterval.YEAR]: "year(s)",
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: "Active",
  [SubscriptionStatus.TRIAL]: "Trial",
  [SubscriptionStatus.PAUSED]: "Paused",
  [SubscriptionStatus.CANCELLED]: "Cancelled",
};

interface FormValues {
  name: string;
  vendor: string;
  categoryId: string;
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaults });

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const status = watch("status");
  const editing = Boolean(subscription);

  async function onSubmit(values: FormValues) {
    const amountMinor = parseMoneyInput(values.amount, values.currency);
    if (amountMinor === null) {
      setError("amount", {
        message: `Enter a valid ${values.currency} amount`,
      });
      return;
    }
    const payload = {
      name: values.name,
      vendor: values.vendor || undefined,
      categoryId: values.categoryId || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${subscription?.name}` : "Add subscription"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes recompute the next renewal date."
              : "Track a recurring charge and its renewal."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-name">Service</Label>
              <Input
                id="sub-name"
                placeholder="Netflix"
                aria-invalid={Boolean(errors.name)}
                {...register("name", { required: "Name is required" })}
              />
              {errors.name ? (
                <p role="alert" className="text-rose text-xs">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-vendor">Provider (optional)</Label>
              <Input
                id="sub-vendor"
                placeholder="Netflix Inc."
                {...register("vendor")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-amount">Cost</Label>
              <div className="flex gap-1.5">
                <Input
                  id="sub-amount"
                  inputMode="decimal"
                  placeholder="12.99"
                  className="min-w-0 flex-1"
                  aria-invalid={Boolean(errors.amount)}
                  {...register("amount", { required: "Cost is required" })}
                />
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        aria-label="Currency"
                        className="w-[76px] shrink-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="sub-category" className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-interval-count">Bills every</Label>
              <div className="flex gap-1.5">
                <Input
                  id="sub-interval-count"
                  type="number"
                  min={1}
                  max={36}
                  className="w-16 shrink-0"
                  aria-label="Interval count"
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
                        aria-label="Billing interval"
                        className="min-w-0 flex-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(BillingInterval).map((value) => (
                          <SelectItem key={value} value={value}>
                            {INTERVAL_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-anchor">First bill date</Label>
              <Input
                id="sub-anchor"
                type="date"
                {...register("anchorDate", { required: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sub-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="sub-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SubscriptionStatus).map((value) => (
                        <SelectItem key={value} value={value}>
                          {STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {status === SubscriptionStatus.TRIAL ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sub-trial-ends">Trial ends</Label>
                <Input
                  id="sub-trial-ends"
                  type="date"
                  {...register("trialEndsAt")}
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-notes">Notes (optional)</Label>
            <Input
              id="sub-notes"
              placeholder="Shared with family"
              {...register("notes")}
            />
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add subscription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
