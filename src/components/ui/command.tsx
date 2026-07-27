"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Search } from "lucide-react";
import { Dialog, DialogPortal, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex w-full flex-col overflow-hidden", className)}
      {...props}
    />
  );
}

/**
 * Palette shell. Deliberately NOT built on DialogOverlay/DialogContent:
 * those carry entrance animations, and DESIGN.md forbids animating
 * keyboard-initiated surfaces — the palette must appear instantly.
 */
function CommandDialog({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered via DialogTrigger so focus returns to it on close. */
  trigger?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Content className="bg-popover text-popover-foreground ring-foreground/10 fixed top-[20%] left-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl p-0 text-sm ring-1 outline-none">
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="border-line flex h-10 items-center gap-2 border-b px-3">
      <Search size={14} aria-hidden className="text-faint shrink-0" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          // The only focusable element inside the framed surface — the
          // frame itself is the focus affordance, so no ring here.
          "text-text placeholder:text-faint w-full bg-transparent text-[13px] outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[330px] overflow-y-auto overscroll-contain p-1.5",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("text-muted py-6 text-center text-xs", className)}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "[&_[cmdk-group-heading]]:text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:uppercase",
        className,
      )}
      {...props}
    />
  );
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        // Selected = the Enter target → accent (DESIGN.md: accent means
        // selection). No transitions: keyboard-driven, per motion rules.
        "text-muted data-[selected=true]:bg-accent-soft data-[selected=true]:text-text flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] select-none",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
};
