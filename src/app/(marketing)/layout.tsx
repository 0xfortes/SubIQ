import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Footer } from "@/features/marketing";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-line/60 bg-bg/80 sticky top-0 z-20 border-b backdrop-blur-md">
        <div className="max-w-content mx-auto flex h-14 items-center justify-between px-4">
          <Link
            href="/"
            className="focus-visible:outline-accent flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <div className="bg-accent text-on-accent flex size-6 items-center justify-center rounded-md text-[11px] font-semibold">
              S
            </div>
            <span className="text-text text-[13px] font-medium tracking-tight">
              SubIQ
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            {session?.user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/signin">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="#get-started">Start free</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
