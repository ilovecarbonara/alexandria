import { createClient } from "@/lib/supabase/server";
import { UserManagementClient } from "@/components/UserManagementClient";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, is_approved, is_active, last_active_at, created_at")
    .eq("is_admin", false)
    .order("created_at", { ascending: false });

  return <UserManagementClient initialUsers={users ?? []} />;
}
