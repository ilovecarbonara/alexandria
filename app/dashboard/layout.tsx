import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/register", label: "Register Thesis" },
  { href: "/verify", label: "Browse Registry" },
  { href: "/dashboard/settings", label: "Settings" },
];

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

  return (
    <div className="flex h-screen">
      <Sidebar title="Alexandria" items={NAV_ITEMS} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
