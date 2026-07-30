"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "../actions";

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterValues) {
    // On success the action mints a session and redirects, so control does not
    // return here; only failures resolve to an ActionResult.
    const result = await registerAction({ ...values, callbackUrl });
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={Boolean(errors.name)}
          {...register("name", {
            maxLength: { value: 80, message: "Use at most 80 characters" },
          })}
        />
        {errors.name ? (
          <p role="alert" className="text-rose text-xs">
            {errors.name.message}
          </p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          aria-invalid={Boolean(errors.password)}
          {...register("password", {
            required: "Choose a password",
            minLength: { value: 8, message: "Use at least 8 characters" },
            maxLength: { value: 128, message: "Use at most 128 characters" },
          })}
        />
        {errors.password ? (
          <p role="alert" className="text-rose text-xs">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword", {
            required: "Re-enter your password",
            validate: (value) =>
              value === getValues("password") || "Passwords don't match",
          })}
        />
        {errors.confirmPassword ? (
          <p role="alert" className="text-rose text-xs">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p role="alert" className="text-rose text-xs">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
