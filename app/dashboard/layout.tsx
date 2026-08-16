import { Sidebar, Button } from "@/components/ui";
import { countMyDisputeUnreads } from "@/lib/actions/disputes";
import { requireArea } from "@/lib/actions/require-area";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireArea("researcher");

  const disputeUnread = await countMyDisputeUnreads();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/submit", label: "Submit Thesis" },
    { href: "/dashboard/browse", label: "Browse Archive" },
    { href: "/dashboard/disputes", label: "Disputes", badge: disputeUnread },
    { href: "/dashboard/alerts", label: "Title Alerts" },
    { href: "/dashboard/settings", label: "Settings" },
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
