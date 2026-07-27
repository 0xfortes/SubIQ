import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/features/auth";
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
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <div className="bg-accent text-on-accent flex size-6 items-center justify-center rounded-md text-[11px] font-semibold">
          S
        </div>
        <span className="text-[13px] font-medium tracking-tight">SubIQ</span>
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
