import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/theses", label: "Thesis Registry" },
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/alerts", label: "Title Alerts" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
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

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="flex h-screen">
      <Sidebar title="Alexandria Admin" items={NAV_ITEMS}>
        <form action={signOut}>
          <Button variant="secondary" type="submit" className="w-full">
            Sign Out
          </Button>
        </form>
      </Sidebar>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
