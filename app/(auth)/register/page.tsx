"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { Button, Input, Card } from "@/components/ui";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null);

  return (
    <Card>
      <h2 className="mb-4 font-heading text-lg text-white">Register</h2>

      <form action={formAction} className="flex flex-col gap-4">
        <Input
          id="fullName"
          name="fullName"
          label="Full Name"
          placeholder="Juan Dela Cruz"
          required
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="University Email"
          placeholder="you@uspf.edu.ph"
          required
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Min. 6 characters"
          minLength={6}
          required
        />

        {state?.error && (
          <p className="font-mono text-xs text-dispute">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-4 text-center font-mono text-xs text-white/40">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
