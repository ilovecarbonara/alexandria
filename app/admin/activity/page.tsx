import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { PAGE_SIZE } from "@/lib/constants";
import { ActivityLogsPagination } from "./ActivityLogsPagination";

const ITEMS_PER_PAGE = PAGE_SIZE;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();

  const { data, count, error } = await supabase
    .from("activity_logs")
    .select("id, action, created_at, user_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const logs = data ?? [];

  // Batch-fetch user names
  const userIds = [...new Set(logs.map((l) => l.user_id))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  const userMap = new Map(
    (users ?? []).map((u) => [u.id, { full_name: u.full_name, email: u.email }]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink">Activity Logs</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          All system activity ({totalCount} total)
        </p>
      </div>

      <Card className="p-0">
        {error ? (
          <p className="px-6 py-12 text-center text-sm text-danger">
            Failed to load activity logs.
          </p>
        ) : logs.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-ink-subtle">
            No activity logs found.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-xs text-ink-subtle uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-xs text-ink-subtle uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-xs text-ink-subtle uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const user = userMap.get(log.user_id);
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="max-w-96 truncate px-6 py-4 text-sm text-ink">
                          {log.action}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-ink">
                              {user?.full_name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-ink-subtle">
                              {user?.email ?? ""}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-ink-muted">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ActivityLogsPagination
              currentPage={page}
              totalPages={totalPages}
            />
          </>
        )}
      </Card>
    </div>
  );
}
