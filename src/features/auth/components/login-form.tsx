"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "../actions";

interface LoginValues {
  email: string;
  password: string;
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    // On success the action mints a session and redirects, so control does not
    // return here; only failures resolve to an ActionResult.
    const result = await loginAction({ ...values, callbackUrl });
    if (result && !result.ok) {
      setError("root", { message: result.error });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email", {
            required: "Enter your email address",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Enter a valid email address",
            },
          })}
        />
        {errors.email ? (
          <p role="alert" className="text-rose text-xs">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password", { required: "Enter your password" })}
        />
        {errors.password ? (
          <p role="alert" className="text-rose text-xs">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p role="alert" className="text-rose text-xs">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
