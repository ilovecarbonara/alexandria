import { Sidebar, Button } from "@/components/ui";
import { countMyDisputeUnreads } from "@/lib/actions/disputes";
import { requireArea } from "@/lib/actions/require-area";
import { countLibrarianQueue } from "@/lib/actions/reviews";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireArea("librarian");

  const [disputeUnread, queueCount] = await Promise.all([
    countMyDisputeUnreads(),
    countLibrarianQueue(),
  ]);

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/review", label: "Review Queue", badge: queueCount },
    { href: "/admin/theses", label: "Thesis Registry" },
    { href: "/admin/users", label: "User Management" },
    { href: "/admin/disputes", label: "Disputes", badge: disputeUnread },
    { href: "/admin/alerts", label: "Title Alerts" },
    { href: "/admin/activity", label: "Activity Logs" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar title="Alexandria" items={navItems}>
        <form action="/api/auth/signout" method="post">
          <Button variant="danger-outline" type="submit" className="w-full">
            Sign Out
          </Button>
        </form>
      </Sidebar>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
