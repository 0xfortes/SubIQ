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
import { updateNameAction, updateTimezoneAction } from "../actions";

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
  const [nameInput, setNameInput] = useState(name ?? "");
  const [savedName, setSavedName] = useState(name ?? "");
  const [namePending, startNameTransition] = useTransition();

  const [selected, setSelected] = useState(timezone);
  const [saved, setSaved] = useState(timezone);
  const [pending, startTransition] = useTransition();

  function saveName() {
    startNameTransition(async () => {
      const result = await updateNameAction({ name: nameInput });
      if (result.ok) {
        // Mirror the server's normalization (empty → null) so the dirty check
        // settles and a subsequent save stays disabled.
        setSavedName(result.data.name ?? "");
        setNameInput(result.data.name ?? "");
        toast.success("Name updated");
      } else {
        toast.error(result.error);
      }
    });
  }

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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-name">Name</Label>
        <Input
          id="settings-name"
          value={nameInput}
          onChange={(event) => setNameInput(event.target.value)}
          placeholder="Your name"
          maxLength={80}
          autoComplete="name"
          className="w-full sm:w-72"
        />
        <p className="text-faint text-[11px]">
          Shown in your welcome greeting. Leave blank to remove it.
        </p>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            aria-label="Save name"
            onClick={saveName}
            disabled={namePending || nameInput.trim() === savedName}
          >
            {namePending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
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
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            aria-label="Save timezone"
            onClick={save}
            disabled={pending || selected === saved}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
