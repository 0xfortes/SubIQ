export function Footer() {
  return (
    <footer className="border-line border-t">
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-8">
        <div className="flex items-center gap-2">
          <div className="bg-accent text-on-accent flex size-5 items-center justify-center rounded-[5px] text-[10px] font-semibold">
            S
          </div>
          <span className="text-muted text-xs">
            SubIQ. Track every subscription and renewal.
          </span>
        </div>
        <span className="font-data text-faint text-xs">
          © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
