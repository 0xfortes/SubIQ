import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="font-data text-faint text-[13px]">404</p>
      <h1 className="text-text text-lg font-medium tracking-tight">
        This page doesn&apos;t exist.
      </h1>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <Link
          href="/dashboard"
          className="text-accent focus-visible:outline-accent rounded-sm hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Go to dashboard
        </Link>
        <Link
          href="/"
          className="text-muted hover:text-text focus-visible:outline-accent rounded-sm transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
