import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/features/auth";
import { BrandMark } from "@/components/ui/brand-mark";
import { SidebarNav } from "./sidebar-nav";

interface SidebarProps {
  email: string | null;
  insightCount?: number;
  /** Category accordion slot — provided by the dashboard feature. */
  categories?: ReactNode;
}

export function Sidebar({ email, insightCount, categories }: SidebarProps) {
  return (
    <aside className="w-sidebar border-line bg-surface sticky top-0 hidden h-screen shrink-0 flex-col border-r md:flex">
      <div className="px-2 pt-3 pb-2">
        {/* The way back out of the app. Relative href on purpose — never the
            production domain, which would break dev and preview deploys and
            turn a same-origin navigation into a cross-origin one. `/` serves
            the authenticated overview when signed in, the marketing landing
            when not. aria-label wins over the descendant content, so the name
            is "SubIQ home" rather than BrandMark's label plus the text. */}
        <Link
          href="/"
          aria-label="SubIQ home"
          className="hover:bg-wash focus-visible:outline-accent flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <BrandMark size={22} className="text-accent" />
          <span className="text-[13px] font-medium tracking-tight">SubIQ</span>
        </Link>
      </div>

      <SidebarNav insightCount={insightCount} />

      {categories ? (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">{categories}</div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="border-line border-t px-4 py-3">
        <form
          action={signOutAction}
          className="flex items-center justify-between gap-2"
        >
          <div className="min-w-0">
            <p className="text-muted truncate text-[11px]">{email}</p>
            <p className="text-faint text-[10px]">Personal workspace</p>
          </div>
          <button
            type="submit"
            aria-label="Sign out"
            className="text-faint hover:bg-wash hover:text-text focus-visible:outline-accent rounded-md p-1.5 transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <LogOut size={14} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}
