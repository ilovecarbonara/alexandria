"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_FULL_NAME_LENGTH,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  validateFullName,
} from "@/lib/validation";

export async function signUp(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  const nameError = validateFullName(fullName);
  if (nameError) return { error: nameError };

  if (email.length > MAX_EMAIL_LENGTH) {
    return { error: `Email must be ${MAX_EMAIL_LENGTH} characters or less.` };
  }

  if (!email.endsWith("@uspf.edu.ph")) {
    return { error: "Only @uspf.edu.ph email addresses are allowed." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or less.` };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Registration failed. Please try again." };
  }

  const service = createServiceClient();
  const { error: insertError } = await service.from("users").insert({
    id: data.user.id,
    email,
    full_name: fullName,
  });

  if (insertError) {
    return { error: insertError.message };
  }

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
    .select("is_approved, is_admin, is_active")
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

  // Update last_active_at
  await service
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", data.user.id);

  if (profile.is_admin) {
    redirect("/admin");
  }

  if (profile.is_approved) {
    redirect("/dashboard");
  }

  redirect("/pending");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
