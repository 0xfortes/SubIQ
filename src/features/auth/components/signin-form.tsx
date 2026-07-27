"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink } from "../actions";

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [result, action, pending] = useActionState(requestMagicLink, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-describedby={result && !result.ok ? "email-error" : undefined}
        />
        {result && !result.ok ? (
          <p id="email-error" role="alert" className="text-rose text-xs">
            {result.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending link…" : "Send magic link"}
      </Button>
    </form>
  );
}
