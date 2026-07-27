export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="rounded-card border-line bg-surface w-full max-w-sm border p-6 text-center">
        <h1 className="text-base font-medium tracking-tight">
          Check your email
        </h1>
        <p className="text-muted mt-2 text-xs">
          We sent you a sign-in link. It expires in 24 hours.
        </p>
      </div>
    </main>
  );
}
