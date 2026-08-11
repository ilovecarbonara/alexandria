import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistryBrowser } from "@/components/RegistryBrowser";

export default async function AdviserBrowsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-ink">Browse Archive</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          Search published theses or verify a document against its record
        </p>
      </div>

      {/* No currentUserId: disputes are filed by students, not advisers. */}
      <RegistryBrowser />
    </div>
  );
}
