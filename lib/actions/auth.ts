"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  validateFullName,
  validatePassword,
  sanitizeTextInput,
} from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { REQUESTABLE_ROLES, ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";

const REQUESTABLE_ROLE_VALUES: readonly string[] = REQUESTABLE_ROLES.map(
  (r) => r.value,
);

export async function signUp(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const requestedRole = ((formData.get("requestedRole") as string) ?? "student").trim();

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  // The librarian role is seeded manually and is never self-assignable.
  if (!REQUESTABLE_ROLE_VALUES.includes(requestedRole)) {
    return { error: "Please choose a valid account type." };
  }

  const nameError = validateFullName(fullName);
  if (nameError) return { error: nameError };

  // Rate limit: 5 sign-up attempts per 15 minutes per IP
  const ip = await getClientIp();
  const rl = await rateLimit(`signup:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.success) {
    return { error: "Too many registration attempts. Please try again later." };
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return { error: `Email must be ${MAX_EMAIL_LENGTH} characters or less.` };
  }

  if (!email.endsWith("@uspf.edu.ph")) {
    return { error: "Only @uspf.edu.ph email addresses are allowed." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Registration failed. Please try again." };
  }

  // The account always starts as a pending student. `requested_role` records
  // what they asked to be; the librarian promotes it on approval.
  const service = createServiceClient();
  const { error: insertError } = await service.from("users").insert({
    id: data.user.id,
    email,
    full_name: sanitizeTextInput(fullName),
    requested_role: requestedRole as UserRole,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  await service.from("activity_logs").insert({
    user_id: data.user.id,
    action:
      requestedRole === "adviser"
        ? "Account created (research adviser requested)"
        : "Account created",
  });

  redirect("/pending");
}

export async function signIn(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Rate limit: 7 sign-in attempts per 15 minutes per IP
  const ip = await getClientIp();
  const rl = await rateLimit(`signin:${ip}`, { limit: 7, windowMs: 15 * 60 * 1000 });
  if (!rl.success) {
    return { error: "Too many login attempts. Please try again later." };
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    return { error: `Email must be ${MAX_EMAIL_LENGTH} characters or less.` };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or less.` };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Use service client — anon client may fail RLS within the same server action
  // due to cookie propagation timing immediately after signInWithPassword
  const service = createServiceClient();

  const { data: profile } = await service
    .from("users")
    .select("approval_status, role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "Account not found. Please register first." };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated. Contact an administrator." };
  }

  if (profile.approval_status === "rejected") {
    await supabase.auth.signOut();
    return { error: "Your request has been rejected. Contact an administrator." };
  }

  if (profile.approval_status === "revoked") {
    await supabase.auth.signOut();
    return { error: "Your approval has been revoked. Contact an administrator." };
  }

  if (profile.approval_status === "pending") {
    redirect("/pending");
  }

  // Update last_active_at
  await service
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.user.id);

  await service.from("activity_logs").insert({
    user_id: data.user.id,
    action: "Signed in",
  });

  redirect(ROLE_HOME[profile.role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
