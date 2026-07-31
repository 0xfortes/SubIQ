import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { Footer, NavStartFree } from "@/features/marketing";

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
            aria-label="SubIQ home"
            className="focus-visible:outline-accent text-accent flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <BrandMark size={24} />
          </Link>
          <nav className="flex items-center gap-2">
            {session?.user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <NavStartFree />
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
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
