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
  const [profileRes, thesesRes, disputesRes, activityRes, alertCountRes] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase
      .from("theses")
      .select("*")
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
  const activeDisputeCount = disputesRes.data?.length ?? 0;
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
          <p className="font-mono text-xs text-white/40 uppercase">
            Active Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-white">
            {activeDisputeCount}
          </p>
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
      <Card className="p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg text-white">My Registrations</h2>
        </div>
        {theses.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-mono text-sm text-white/40">
              No theses registered yet.
            </p>
            <Link href="/dashboard/register" className="mt-4 inline-block">
              <Button>Register Your First Thesis</Button>
            </Link>
          </div>
        ) : (
          <DashboardRegistrations
            theses={theses}
            chainParticipantIds={Array.from(chainParticipants)}
          />
        )}
      </Card>

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
            <Link href="/verify">
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
