"use client";

import { Suspense, useActionState, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button, Input, Card } from "@/components/ui";
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/validation";

const accessErrorMessages: Record<string, string> = {
  deactivated: "Your account has been deactivated. Contact an administrator.",
  rejected: "Your request has been rejected. Contact an administrator.",
  revoked: "Your approval has been revoked. Contact an administrator.",
};

function AccessErrorBanner() {
  const searchParams = useSearchParams();
  const message = accessErrorMessages[searchParams.get("error") ?? ""];
  if (!message) return null;
  return (
    <p className="mb-4 text-xs text-danger">
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = useCallback(
    (name: string, value: string): string | null => {
      switch (name) {
        case "email":
          if (!value) return "Email is required.";
          if (value.length > MAX_EMAIL_LENGTH)
            return `Email must be ${MAX_EMAIL_LENGTH} characters or less.`;
          if (!value.endsWith("@uspf.edu.ph"))
            return "Only @uspf.edu.ph email addresses are allowed.";
          return null;
        case "password":
          if (!value) return "Password is required.";
          if (value.length > MAX_PASSWORD_LENGTH)
            return `Password must be ${MAX_PASSWORD_LENGTH} characters or less.`;
          return null;
        default:
          return null;
      }
    },
    [],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
    },
    [validate],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      if (touched[name]) {
        setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
      }
    },
    [touched, validate],
  );

  return (
    <Card>
      <h2 className="mb-4 font-heading text-lg text-ink">Log In</h2>

      <Suspense fallback={null}>
        <AccessErrorBanner />
      </Suspense>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="University Email"
          placeholder="you@uspf.edu.ph"
          maxLength={MAX_EMAIL_LENGTH}
          onBlur={handleBlur}
          onChange={handleChange}
          error={errors.email ?? undefined}
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          maxLength={MAX_PASSWORD_LENGTH}
          onBlur={handleBlur}
          onChange={handleChange}
          error={errors.password ?? undefined}
          required
        />

        {state?.error && (
          <p className="text-xs text-danger">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-ink-subtle">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </Card>
  );
}
