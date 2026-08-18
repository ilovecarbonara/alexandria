import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Button } from "@/components/ui";
import { DashboardRegistrations } from "@/components/DashboardRegistrations";
import { ReturnedSubmissions } from "@/components/ReturnedSubmissions";
import { getAuthorNames } from "@/lib/authors";
import { isActionableByResearcher, isAwaitingReview, isPublic } from "@/lib/workflow";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel queries
  const [profileRes, thesesRes, filedDisputesRes, activityRes, alertCountRes] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, publication_notice_ack_at")
      .eq("id", user.id)
      .single(),
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
  const noticeAcknowledged =
    profileRes.data?.publication_notice_ack_at != null;
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

  const returned = theses.filter((t) => isActionableByResearcher(t.status));
  const published = theses.filter((t) => isPublic(t.status)).length;
  const inReview = theses.filter((t) => isAwaitingReview(t.status)).length;

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
          <h1 className="font-heading text-2xl text-ink">
            Welcome, {fullName}
          </h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Track your submissions through review
          </p>
        </div>
        <Link href="/dashboard/submit">
          <Button>Submit Thesis</Button>
        </Link>
      </div>

      {/* Anything the researcher has to act on comes before everything else. */}
      <ReturnedSubmissions
        ownerName={fullName}
        noticeAcknowledged={noticeAcknowledged}
        theses={returned.map((t) => ({
          id: t.id,
          title: t.title,
          sha256Hash: t.sha256_hash,
          authorNames: getAuthorNames(t.thesis_authors),
        }))}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            My Submissions
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">
            {theses.length}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {published} published · {inReview} in review
          </p>
        </Card>
        <Card>
          <Link href="/dashboard/disputes" className="block">
            <p className="text-xs text-ink-subtle uppercase">
              Open Disputes
            </p>
            <p className="mt-2 font-heading text-3xl text-ink">
              {activeDisputeCount}
            </p>
            <p className="mt-1 text-xs text-primary">
              View threads →
            </p>
          </Link>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Title Alerts
          </p>
          <p className="mt-2 font-heading text-3xl text-warning">
            {alertCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Recent Activity
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">
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
            <h2 className="font-heading text-lg text-ink">
              Recent Activity
            </h2>
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

        {/* Quick Actions */}
        <Card>
          <h2 className="mb-4 font-heading text-lg text-ink">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard/submit">
              <Button className="w-full">Submit a Thesis</Button>
            </Link>
            <Link href="/dashboard/browse">
              <Button variant="secondary" className="w-full">
                Browse Archive
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
