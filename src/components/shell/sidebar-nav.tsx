"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLine,
  LayoutDashboard,
  Repeat,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SidebarNav({ insightCount }: { insightCount?: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 px-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-100",
              "focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2",
              active
                ? "bg-accent-soft text-text"
                : "text-muted hover:bg-wash hover:text-text",
            )}
          >
            <Icon size={15} strokeWidth={1.75} aria-hidden />
            <span className="flex-1">{label}</span>
            {href === "/insights" && insightCount ? (
              <span className="font-data rounded-pill bg-surface-2 text-muted px-1.5 py-px text-[10px]">
                {insightCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
