"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

/** ≤760px replacement for the sidebar: same nav + category accordion. */
export function MobileNav({
  insightCount,
  categories,
}: {
  insightCount?: number;
  categories?: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Derived open state: remember the URL the drawer was opened at, so any
  // in-drawer navigation closes it without effect-driven setState.
  const url = `${pathname}?${searchParams.toString()}`;
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const open = openedUrl === url;

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenedUrl(next ? url : null)}>
      <SheetTrigger
        aria-label="Open navigation"
        className="text-muted hover:bg-wash hover:text-text focus-visible:outline-accent rounded-md p-1.5 transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
      >
        <Menu size={16} aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-sidebar bg-surface p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-left text-[13px] font-medium tracking-tight">
            SubIQ
          </SheetTitle>
        </SheetHeader>
        <SidebarNav insightCount={insightCount} />
        {categories ? (
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
            {categories}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
