"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button, Input, Card } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const searchParams = useSearchParams();
  const deactivated = searchParams.get("error") === "deactivated";

  return (
    <Card>
      <h2 className="mb-4 font-heading text-lg text-white">Log In</h2>

      {deactivated && (
        <p className="mb-4 font-mono text-xs text-dispute">
          Your account has been deactivated. Contact an administrator.
        </p>
      )}

      <form action={formAction} className="flex flex-col gap-4">
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
          placeholder="Enter your password"
          required
        />

        {state?.error && (
          <p className="font-mono text-xs text-dispute">{state.error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-4 text-center font-mono text-xs text-white/40">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Register
        </Link>
      </p>
    </Card>
  );
}
