import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, StatusChip } from "@/components/ui";
import { formatAuthorNames } from "@/lib/authors";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [thesesRes, pendingThesesRes, disputesRes, usersRes, pendingUsersRes, recentThesesRes, recentActivityRes] =
    await Promise.allSettled([
      supabase.from("theses").select("id", { count: "exact", head: true }),
      supabase.from("theses").select("id", { count: "exact", head: true }).eq("status", "pending_librarian"),
      supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("users").select("id", { count: "exact", head: true }).neq("role", "librarian"),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("approval_status", "pending").neq("role", "librarian"),
      supabase
        .from("theses")
        .select("id, title, status, registered_at, thesis_authors(name, position)")
        .order("registered_at", { ascending: false })
        .limit(5),
      supabase
        .from("activity_logs")
        .select("id, action, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const failedLabels: string[] = [];
  if (thesesRes.status === "rejected") failedLabels.push("total theses count");
  if (pendingThesesRes.status === "rejected") failedLabels.push("review queue count");
  if (disputesRes.status === "rejected") failedLabels.push("disputes count");
  if (usersRes.status === "rejected") failedLabels.push("users count");
  if (pendingUsersRes.status === "rejected") failedLabels.push("pending approvals");
  if (recentThesesRes.status === "rejected") failedLabels.push("recent registrations");
  if (recentActivityRes.status === "rejected") failedLabels.push("recent activity");

  const totalTheses = (thesesRes.status === "fulfilled" ? thesesRes.value.count : 0) ?? 0;
  const pendingConfirmations = (pendingThesesRes.status === "fulfilled" ? pendingThesesRes.value.count : 0) ?? 0;
  const activeDisputes = (disputesRes.status === "fulfilled" ? disputesRes.value.count : 0) ?? 0;
  const registeredUsers = (usersRes.status === "fulfilled" ? usersRes.value.count : 0) ?? 0;
  const pendingApprovals = (pendingUsersRes.status === "fulfilled" ? pendingUsersRes.value.count : 0) ?? 0;
  const recentTheses = (recentThesesRes.status === "fulfilled" ? recentThesesRes.value.data : null) ?? [];
  const recentActivity = (recentActivityRes.status === "fulfilled" ? recentActivityRes.value.data : null) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-ink">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          System overview and management
        </p>
      </div>

      {failedLabels.length > 0 && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          Failed to load: {failedLabels.join(", ")}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Total Theses
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">
            {totalTheses}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Pending Confirmations
          </p>
          <p className="mt-2 font-heading text-3xl text-warning">
            {pendingConfirmations}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Active Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-danger">
            {activeDisputes}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Registered Users
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">
            {registeredUsers}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Pending Approvals
          </p>
          <p className="mt-2 font-heading text-3xl text-warning">
            {pendingApprovals}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Registrations */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg text-ink">
              Recent Registrations
            </h2>
            <Link href="/admin/theses">
              <Button variant="secondary" className="text-xs">
                View All
              </Button>
            </Link>
          </div>
          {recentTheses.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-subtle">
              No registrations yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentTheses.map((thesis) => (
                <li
                  key={thesis.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {thesis.title}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {formatAuthorNames(thesis.thesis_authors)} ·{" "}
                      {new Date(thesis.registered_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusChip status={thesis.status} className="ml-3" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Active Disputes */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg text-ink">
              Active Disputes
            </h2>
            <Link href="/admin/disputes">
              <Button variant="secondary" className="text-xs">
                Manage
              </Button>
            </Link>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="font-heading text-3xl text-danger">
              {activeDisputes}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              open disputes requiring review
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending User Approvals */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg text-ink">
              Pending Approvals
            </h2>
            <Link href="/admin/users">
              <Button variant="secondary" className="text-xs">
                Manage Users
              </Button>
            </Link>
          </div>
          <div className="px-6 py-8 text-center">
            <p className="font-heading text-3xl text-warning">
              {pendingApprovals}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              users awaiting approval
            </p>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg text-ink">
              Recent Activity
            </h2>
            <Link href="/admin/activity">
              <Button variant="secondary" className="text-xs">
                View All Activity
              </Button>
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-ink-subtle">
              No activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <span className="text-sm text-ink">
                    {log.action}
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-subtle">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
