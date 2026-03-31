"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { changePassword } from "@/lib/actions/settings";

export default function SettingsPage() {
  const [profile, setProfile] = useState<{
    email: string;
    fullName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile({ email: data.email, fullName: data.full_name });
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (password.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwLoading(true);
    const result = await changePassword(password);
    setPwLoading(false);

    if (result.error) {
      setPwError(result.error);
    } else {
      setPwSuccess(true);
      setPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-mono text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="font-heading text-2xl text-white">Settings</h1>

      {/* Profile Info (read-only) */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-white">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs text-white/40 uppercase">
              Full Name
            </label>
            <p className="mt-1 font-mono text-sm text-white/90">
              {profile?.fullName}
            </p>
          </div>
          <div>
            <label className="font-mono text-xs text-white/40 uppercase">
              Email
            </label>
            <p className="mt-1 font-mono text-sm text-white/90">
              {profile?.email}
            </p>
          </div>
        </div>
      </Card>

      {/* Password Change */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-white">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            id="new-password"
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            id="confirm-password"
            type="password"
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {pwError && (
            <p className="font-mono text-xs text-dispute">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="font-mono text-xs text-success">
              Password updated successfully.
            </p>
          )}
          <Button type="submit" disabled={pwLoading}>
            {pwLoading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
