"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/shell/command-palette";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Overview",
  subscriptions: "Subscriptions",
  analytics: "Analytics",
  insights: "Insights",
  settings: "Settings",
};

export function Topbar({
  categories,
  subs,
  mobileNav,
}: {
  categories: { slug: string; name: string; color: string }[];
  subs: { id: string; name: string }[];
  mobileNav?: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = SECTION_LABELS[pathname.split("/")[1] ?? ""] ?? "Overview";
  const scopeSlug = searchParams.get("category");
  const scope = scopeSlug
    ? categories.find((c) => c.slug === scopeSlug)?.name
    : undefined;

  return (
    <header className="border-line bg-bg/90 sticky top-0 z-10 border-b backdrop-blur-sm">
      <div className="max-w-content mx-auto flex h-12 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {mobileNav}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs"
          >
            {/* Breadcrumb root — conventionally clickable, and below 760px
                (sidebar hidden) this is the only way home. Accessible name is
                the visible text, deliberately distinct from the sidebar's
                "SubIQ home" so the two never collide. */}
            <Link
              href="/"
              className="text-faint hover:text-muted focus-visible:outline-accent rounded-sm transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              SubIQ
            </Link>
            <span className="text-faint">/</span>
            <span className={scope ? "text-muted" : "text-text"}>
              {section}
            </span>
            {scope ? (
              <>
                <span className="text-faint">/</span>
                <span className="text-text">{scope}</span>
              </>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CommandPalette subs={subs} categories={categories} />
          <Button asChild size="sm">
            <Link href="/subscriptions?new=1">
              <Plus size={14} aria-hidden data-icon="inline-start" />
              Add subscription
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
