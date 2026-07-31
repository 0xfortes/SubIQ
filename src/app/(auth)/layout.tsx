import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/brand-mark";

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
        <BrandMark size={26} className="text-accent" />
        <span className="text-sm font-medium tracking-tight">SubIQ</span>
      </Link>
      {children}
    </main>
  );
}
