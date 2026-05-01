import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { DashboardRegistrations } from "@/components/DashboardRegistrations";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel queries
  const [profileRes, thesesRes, filedDisputesRes, activityRes, alertCountRes] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase
      .from("theses")
      .select("*, thesis_authors(name, position)")
      .eq("user_id", user.id)
      .order("registered_at", { ascending: false }),
    supabase
      .from("disputes")
      .select("id")
      .eq("flagged_by", user.id)
      .eq("status", "open"),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("title_alerts")
      .select("id", { count: "exact", head: true })
      .eq("notified_user_id", user.id),
  ]);

  const fullName = profileRes.data?.full_name ?? "User";
  const theses = thesesRes.data ?? [];
  const filedOpenIds = new Set((filedDisputesRes.data ?? []).map((d) => d.id));

  // Add open disputes on this user's theses (deduped by dispute id) so the
  // stat card reflects every thread the user participates in.
  const ownedThesisIds = theses.map((t) => t.id);
  if (ownedThesisIds.length > 0) {
    const { data: receivedOpen } = await supabase
      .from("disputes")
      .select("id")
      .in("thesis_id", ownedThesisIds)
      .eq("status", "open");
    for (const d of receivedOpen ?? []) filedOpenIds.add(d.id);
  }
  const activeDisputeCount = filedOpenIds.size;
  const recentActivity = activityRes.data ?? [];
  const alertCount = alertCountRes.count ?? 0;

  // Determine which theses participate in a version chain
  const chainParticipants = new Set<string>();
  for (const t of theses) {
    if (t.previous_thesis_id) {
      chainParticipants.add(t.id);
      chainParticipants.add(t.previous_thesis_id);
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white">
            Welcome, {fullName}
          </h1>
          <p className="mt-1 font-mono text-sm text-white/40">
            Manage your thesis registrations
          </p>
        </div>
        <Link href="/dashboard/register">
          <Button>Register New Thesis</Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            My Registered Theses
          </p>
          <p className="mt-2 font-heading text-3xl text-white">
            {theses.length}
          </p>
        </Card>
        <Card>
          <Link href="/dashboard/disputes" className="block">
            <p className="font-mono text-xs text-white/40 uppercase">
              Open Disputes
            </p>
            <p className="mt-2 font-heading text-3xl text-white">
              {activeDisputeCount}
            </p>
            <p className="mt-1 font-mono text-xs text-accent">
              View threads →
            </p>
          </Link>
        </Card>
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Title Alerts
          </p>
          <p className="mt-2 font-heading text-3xl text-pending">
            {alertCount}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Recent Activity
          </p>
          <p className="mt-2 font-heading text-3xl text-white">
            {recentActivity.length}
          </p>
        </Card>
      </div>

      {/* My Registrations Table */}
      <DashboardRegistrations
        theses={theses}
        chainParticipantIds={Array.from(chainParticipants)}
      />

      {/* Bottom Row: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card className="p-0">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-heading text-lg text-white">
              Recent Activity
            </h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="px-6 py-8 text-center font-mono text-sm text-white/40">
              No activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <span className="font-mono text-sm text-white/80">
                    {log.action}
                  </span>
                  <span className="whitespace-nowrap font-mono text-xs text-white/40">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="mb-4 font-heading text-lg text-white">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/register">
              <Button className="w-full">Register a Thesis</Button>
            </Link>
            <Link href="/dashboard/browse">
              <Button variant="secondary" className="w-full">
                Browse Registry
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
