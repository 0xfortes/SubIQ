import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

const footerLinkClass =
  "text-muted hover:text-text focus-visible:outline-accent rounded-sm text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function Footer() {
  return (
    <footer className="border-line border-t">
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-8">
        <div className="flex items-center gap-2">
          <BrandMark size={18} className="text-accent" />
          <span className="text-muted text-xs">
            SubIQ. Track every subscription and renewal.
          </span>
        </div>
        <div className="flex items-center gap-4">
          <nav aria-label="Legal" className="flex items-center gap-4">
            <Link href="/privacy" className={footerLinkClass}>
              Privacy
            </Link>
            <Link href="/terms" className={footerLinkClass}>
              Terms
            </Link>
          </nav>
          <span className="font-data text-faint text-xs">
            © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}
