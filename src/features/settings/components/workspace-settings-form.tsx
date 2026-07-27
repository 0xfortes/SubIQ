"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { updateDefaultCurrencyAction } from "../actions";

export function WorkspaceSettingsForm({
  workspaceName,
  defaultCurrency,
}: {
  workspaceName: string;
  defaultCurrency: string;
}) {
  const [selected, setSelected] = useState(defaultCurrency);
  const [saved, setSaved] = useState(defaultCurrency);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateDefaultCurrencyAction({ currency: selected });
      if (result.ok) {
        setSaved(result.data.defaultCurrency);
        toast.success("Default currency updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <span className="text-muted text-xs">Workspace</span>
        <span className="text-[13px]">{workspaceName}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-currency">Default currency</Label>
        <Select value={selected} onValueChange={setSelected}>
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
          Subscriptions in other currencies are excluded from totals.
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={save}
          disabled={pending || selected === saved}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
