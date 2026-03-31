import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button, StatusChip, HashDisplay } from "@/components/ui";
import { ThesisActions } from "@/components/ThesisActions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel queries
  const [profileRes, thesesRes, disputesRes, activityRes] = await Promise.all([
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
  ]);

  const fullName = profileRes.data?.full_name ?? "User";
  const theses = thesesRes.data ?? [];
  const activeDisputeCount = disputesRes.data?.length ?? 0;
  const recentActivity = activityRes.data ?? [];

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Tx Hash
                  </th>
                  <th className="px-6 py-3 font-mono text-xs text-white/40 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {theses.map((thesis) => (
                  <tr
                    key={thesis.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="max-w-50 truncate px-6 py-4 font-mono text-sm text-white/90">
                      {thesis.title}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60 capitalize">
                      {thesis.thesis_level}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60">
                      {thesis.thesis_category}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-white/60 capitalize">
                      {thesis.submission_type}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-white/60">
                      {new Date(thesis.registered_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={thesis.status} />
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://sepolia.etherscan.io/tx/${thesis.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <HashDisplay hash={thesis.tx_hash} />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <ThesisActions
                        thesisId={thesis.id}
                        thesis={{
                          authorName: thesis.author_name,
                          title: thesis.title,
                          thesisLevel: thesis.thesis_level,
                          thesisCategory: thesis.thesis_category,
                          submissionType: thesis.submission_type,
                          sha256Hash: thesis.sha256_hash,
                          txHash: thesis.tx_hash,
                          blockTimestamp: thesis.block_timestamp,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
