"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { changePassword } from "@/lib/actions/settings";
import { validatePassword } from "@/lib/validation";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";

/**
 * Profile summary and password change. Identical for every role, so the
 * /dashboard, /adviser, and /admin settings pages all render this.
 */
export function AccountSettings() {
  const [profile, setProfile] = useState<{
    email: string;
    fullName: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (name: string, value: string): string | null => {
      switch (name) {
        case "currentPassword":
          return value ? null : "Current password is required.";
        case "password":
          return validatePassword(value);
        case "confirmPassword":
          if (!value) return "Please confirm your new password.";
          return value !== password ? "Passwords do not match." : null;
        default:
          return null;
      }
    },
    [password],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    },
    [validateField],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      switch (name) {
        case "currentPassword": setCurrentPassword(value); break;
        case "password": setPassword(value); break;
        case "confirmPassword": setConfirmPassword(value); break;
      }
      if (touched[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
      }
      if (name === "password" && touched.confirmPassword && confirmPassword) {
        setFieldErrors((prev) => ({
          ...prev,
          confirmPassword: confirmPassword !== value ? "Passwords do not match." : null,
        }));
      }
      setPwError(null);
      setPwSuccess(false);
    },
    [touched, validateField, confirmPassword],
  );

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("users")
          .select("full_name, email, role")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfile({
            email: data.email,
            fullName: data.full_name,
            role: data.role,
          });
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

    // Validate all fields inline (covers un-blurred inputs)
    const fields = { currentPassword, password, confirmPassword };
    const newErrors: Record<string, string | null> = {};
    let hasError = false;
    for (const [name, value] of Object.entries(fields)) {
      const err = validateField(name, value);
      newErrors[name] = err;
      if (err) hasError = true;
    }
    setFieldErrors(newErrors);
    setTouched({ currentPassword: true, password: true, confirmPassword: true });

    if (hasError) return;

    setPwLoading(true);
    const result = await changePassword(currentPassword, password);
    setPwLoading(false);

    if (result.error) {
      setPwError(result.error);
    } else {
      setPwSuccess(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setTouched({});
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-ink-subtle">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <h1 className="font-heading text-2xl text-ink">Settings</h1>

      {/* Profile Info (read-only) */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-ink">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-subtle uppercase">
              Full Name
            </label>
            <p className="mt-1 text-sm text-ink">
              {profile?.fullName}
            </p>
          </div>
          <div>
            <label className="text-xs text-ink-subtle uppercase">
              Email
            </label>
            <p className="mt-1 text-sm text-ink">
              {profile?.email}
            </p>
          </div>
          <div>
            <label className="text-xs text-ink-subtle uppercase">
              Role
            </label>
            <p className="mt-1 text-sm text-ink">
              {profile ? ROLE_LABELS[profile.role as UserRole] : ""}
            </p>
          </div>
        </div>
      </Card>

      {/* Password Change */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-ink">
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            label="Current Password"
            placeholder="Enter current password"
            value={currentPassword}
            onBlur={handleBlur}
            onChange={handleChange}
            error={fieldErrors.currentPassword ?? undefined}
            required
          />
          <Input
            id="new-password"
            name="password"
            type="password"
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onBlur={handleBlur}
            onChange={handleChange}
            error={fieldErrors.password ?? undefined}
            required
          />
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onBlur={handleBlur}
            onChange={handleChange}
            error={fieldErrors.confirmPassword ?? undefined}
            required
          />
          {pwError && (
            <p className="text-xs text-danger">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="text-xs text-success">
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
