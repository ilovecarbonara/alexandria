"use client";

import { useActionState, useState, useCallback } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { Button, Input, Card } from "@/components/ui";
import {
  MAX_FULL_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  FULL_NAME_HTML_PATTERN,
  validateFullName,
  validatePassword,
} from "@/lib/validation";
import { REQUESTABLE_ROLES } from "@/lib/constants";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [requestedRole, setRequestedRole] = useState<string>("student");

  const validate = useCallback(
    (name: string, value: string): string | null => {
      switch (name) {
        case "fullName":
          return validateFullName(value);
        case "email":
          if (!value) return "Email is required.";
          if (value.length > MAX_EMAIL_LENGTH)
            return `Email must be ${MAX_EMAIL_LENGTH} characters or less.`;
          if (!value.endsWith("@uspf.edu.ph"))
            return "Only @uspf.edu.ph email addresses are allowed.";
          return null;
        case "password":
          return validatePassword(value);
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
      <h2 className="mb-4 font-heading text-lg text-ink">Register</h2>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          placeholder="Juan Dela Cruz"
          maxLength={MAX_FULL_NAME_LENGTH}
          pattern={FULL_NAME_HTML_PATTERN}
          title="Letters, hyphens, apostrophes, periods, and spaces only"
          onBlur={handleBlur}
          onChange={handleChange}
          error={errors.fullName ?? undefined}
          required
        />

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
          placeholder="Min. 8 characters"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          onBlur={handleBlur}
          onChange={handleChange}
          error={errors.password ?? undefined}
          required
        />

        {/* Recorded as `requested_role`; the librarian grants it on approval. */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-ink-muted">
            I am registering as
          </legend>
          {REQUESTABLE_ROLES.map((role) => (
            <label
              key={role.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-ink"
            >
              <input
                type="radio"
                name="requestedRole"
                value={role.value}
                checked={requestedRole === role.value}
                onChange={(e) => setRequestedRole(e.target.value)}
                className=""
                required
              />
              {role.label}
            </label>
          ))}
          <span className="text-xs text-ink-subtle">
            {requestedRole === "adviser"
              ? "Adviser accounts review student submissions. The university librarian confirms this when approving your account."
              : "Students submit theses to the archive for review."}
          </span>
        </fieldset>

        {state?.error && (
          <p className="text-xs text-danger">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-ink-subtle">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
