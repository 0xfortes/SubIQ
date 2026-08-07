"use client";

import { RadioGroup } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * A row of mutually exclusive options with a sliding indicator — the calm
 * alternative to a dropdown when there are 2–4 choices and the labels are
 * short. One click instead of open-then-pick, and every option stays visible.
 *
 * Built on Radix RadioGroup so arrow-key navigation, roving tabindex, and the
 * radiogroup/radio semantics come for free — a row of buttons would need all
 * of that hand-written and would still read wrong to a screen reader.
 *
 * The indicator is one absolutely-positioned element translated by whole
 * multiples of its own width, so it needs no measurement and stays correct at
 * any container width. It's a CSS transition rather than a keyframe animation
 * so rapid clicks retarget smoothly from wherever the indicator currently is.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  /** Accessible name for the group — required, it has no visible legend. */
  label: string;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      aria-label={label}
      orientation="horizontal"
      className={cn(
        "border-line bg-surface-2 relative grid h-8 rounded-md border p-0.5",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {/* Indicator. Sized to one column, moved by whole multiples of itself. */}
      <span
        aria-hidden
        className="bg-accent-soft pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-[5px] transition-transform duration-200 ease-[var(--ease-out-strong)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "focus-visible:outline-accent relative z-10 rounded-[5px] text-xs whitespace-nowrap transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1",
            option.value === value
              ? "text-text"
              : "text-muted hover:text-text cursor-pointer",
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
