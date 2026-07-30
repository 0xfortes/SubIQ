import Link from "next/link";
import type { ReactNode } from "react";

/** Shared chrome for /login and /register: a centered column with the brand
 * mark above the card, so switching between the two feels seamless. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        aria-label="SubIQ home"
        className="focus-visible:outline-accent flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="bg-accent text-on-accent flex size-7 items-center justify-center rounded-md text-xs font-semibold">
          S
        </span>
        <span className="text-sm font-medium tracking-tight">SubIQ</span>
      </Link>
      {children}
    </main>
  );
}
