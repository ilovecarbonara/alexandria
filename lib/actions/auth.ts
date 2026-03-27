"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

  if (!email.endsWith("@uspf.edu.ph")) {
    return { error: "Only @uspf.edu.ph email addresses are allowed." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
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

  // Update last_active_at — uses service role since users lack UPDATE on own row
  const service = createServiceClient();
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
