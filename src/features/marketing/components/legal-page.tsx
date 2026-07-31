import type { ReactNode } from "react";

/**
 * Presentational shell for static legal/content pages (Privacy, Terms). Keeps
 * the two pages typographically consistent without pulling in a prose plugin —
 * nested prose (`p`, `ul`, `a`, `strong`) is styled via child selectors so the
 * page bodies stay plain JSX.
 */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-content mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <header>
          <h1 className="text-text text-[28px] font-medium tracking-[-0.02em] sm:text-[34px]">
            {title}
          </h1>
          <p className="font-data text-faint mt-3 text-xs">
            Last updated {lastUpdated}
          </p>
        </header>
        {intro ? (
          <p className="text-muted mt-8 text-[13px] leading-relaxed">{intro}</p>
        ) : null}
        <div className="mt-10 space-y-10">{children}</div>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-text text-[15px] font-medium tracking-tight">
        {heading}
      </h2>
      <div className="text-muted [&_a]:text-accent [&_a:focus-visible]:outline-accent [&_strong]:text-text [&_ul]:marker:text-faint mt-3 space-y-3 text-[13px] leading-relaxed [&_a]:rounded-sm [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition hover:[&_a]:brightness-110 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_strong]:font-medium [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
