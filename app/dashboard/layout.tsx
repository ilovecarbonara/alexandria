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
    .select("approval_status, is_active, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=deactivated");
  if (profile.approval_status === "pending") redirect("/pending");
  if (profile.approval_status === "rejected") redirect("/login?error=rejected");
  if (profile.approval_status === "revoked") redirect("/login?error=revoked");
  if (profile.is_admin) redirect("/admin");

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
