"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The single nav entry point into the product. It stays hidden while the
 * hero's primary action is on screen and fades in once that action scrolls
 * under the sticky header — so the page offers exactly one "Start free" at a
 * time, never two. Watches a sentinel the hero renders (`#hero-cta-sentinel`);
 * on any page without that sentinel it simply stays hidden.
 */
export function NavStartFree() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("hero-cta-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(!entry.isIntersecting);
      },
      // Trip once the sentinel passes under the 56px sticky header (h-14).
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <Button
      asChild
      size="sm"
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={cn(
        "transition-opacity duration-200 ease-out",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <Link href="/register">Start free</Link>
    </Button>
  );
}
