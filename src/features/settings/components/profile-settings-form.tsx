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
import { listTimeZones } from "@/lib/dates";
import { updateTimezoneAction } from "../actions";

const TIMEZONES = listTimeZones();

export function ProfileSettingsForm({
  email,
  name,
  timezone,
}: {
  email: string;
  name: string | null;
  timezone: string;
}) {
  const [selected, setSelected] = useState(timezone);
  const [saved, setSaved] = useState(timezone);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateTimezoneAction({ timezone: selected });
      if (result.ok) {
        setSaved(result.data.timezone);
        toast.success("Timezone updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <span className="text-muted text-xs">Email</span>
        <span className="text-[13px]">{email}</span>
      </div>
      {name ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted text-xs">Name</span>
          <span className="text-[13px]">{name}</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-timezone">Timezone</Label>
        <Select value={selected} onValueChange={setSelected}>
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
          Sets which day counts as today for renewal countdowns. Renewal dates
          themselves don&apos;t shift.
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
