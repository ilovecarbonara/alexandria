import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, Button } from "@/components/ui";
import { countMyDisputeUnreads } from "@/lib/actions/disputes";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_admin) redirect("/admin");

  const disputeUnread = await countMyDisputeUnreads();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/register", label: "Register Thesis" },
    { href: "/dashboard/browse", label: "Browse Registry" },
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
