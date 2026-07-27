import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-line border-t">
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-8">
        <div className="flex items-center gap-2">
          <div className="bg-accent text-on-accent flex size-5 items-center justify-center rounded-[5px] text-[10px] font-semibold">
            S
          </div>
          <span className="text-muted text-xs">
            SubIQ — know where your money quietly goes.
          </span>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-4 text-xs">
          <Link
            href="/signin"
            className="text-muted hover:text-text focus-visible:outline-accent rounded-sm transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sign in
          </Link>
          <span className="font-data text-faint">
            © {new Date().getFullYear()}
          </span>
        </nav>
      </div>
    </footer>
  );
}
