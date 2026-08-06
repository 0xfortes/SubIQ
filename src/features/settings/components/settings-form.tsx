"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTimeZones } from "@/lib/dates";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { updateSettingsAction } from "../actions";

const TIMEZONES = listTimeZones();

interface SettingsValues {
  name: string;
  timezone: string;
  currency: string;
}

/**
 * Every setting on the page, saved by one button. The cards stay as separate
 * sections because they group different *subjects* (you vs. your workspace),
 * but they are one form: the Save is enabled by any change and writes them
 * together.
 */
export function SettingsForm({
  email,
  name,
  timezone,
  workspaceName,
  defaultCurrency,
}: {
  email: string;
  name: string | null;
  timezone: string;
  workspaceName: string;
  defaultCurrency: string;
}) {
  const initial: SettingsValues = {
    name: name ?? "",
    timezone,
    currency: defaultCurrency,
  };
  const [values, setValues] = useState(initial);
  // The last state the server confirmed — the baseline the dirty check and a
  // failed save both fall back to.
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof SettingsValues>(
    key: K,
    value: SettingsValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const dirty =
    values.name.trim() !== saved.name ||
    values.timezone !== saved.timezone ||
    values.currency !== saved.currency;

  function save() {
    startTransition(async () => {
      const result = await updateSettingsAction(values);
      if (result.ok) {
        // Mirror the server's normalization (empty name → null) so the dirty
        // check settles and a second save stays disabled.
        const next = {
          name: result.data.name ?? "",
          timezone: result.data.timezone,
          currency: result.data.defaultCurrency,
        };
        setValues(next);
        setSaved(next);
        toast.success("Settings saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <section className="rounded-card border-line bg-surface border p-5">
        <h1 className="text-sm font-medium tracking-tight">Profile</h1>
        <p className="text-muted mt-0.5 text-xs">
          How dates are shown to you across the app.
        </p>

        <div className="mt-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-xs">Email</span>
            <span className="text-[13px]">{email}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-name">Name</Label>
            <Input
              id="settings-name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Your name"
              maxLength={80}
              autoComplete="name"
              className="w-full sm:w-72"
            />
            <p className="text-faint text-[11px]">
              Shown in your welcome greeting. Leave blank to remove it.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-timezone">Timezone</Label>
            <Select
              value={values.timezone}
              onValueChange={(value) => set("timezone", value)}
            >
              <SelectTrigger id="settings-timezone" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-faint text-[11px]">
              Sets which day counts as today for renewal countdowns. Renewal
              dates themselves don&apos;t shift.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card border-line bg-surface border p-5">
        <h2 className="text-sm font-medium tracking-tight">Workspace</h2>
        <p className="text-muted mt-0.5 text-xs">
          Defaults for totals, insights, and new subscriptions.
        </p>

        <div className="mt-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-xs">Workspace</span>
            <span className="text-[13px]">{workspaceName}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-currency">Default currency</Label>
            <Select
              value={values.currency}
              onValueChange={(value) => set("currency", value)}
            >
              <SelectTrigger id="settings-currency" className="w-full sm:w-40">
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
            <p className="text-faint text-[11px]">
              Totals and insights are recalculated in the new currency.
              Subscriptions in other currencies are converted at current rates.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <p aria-live="polite" className="text-faint text-[11px]">
          {dirty ? "Unsaved changes" : null}
        </p>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
