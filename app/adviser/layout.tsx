import { Sidebar, Button } from "@/components/ui";
import { requireArea } from "@/lib/actions/require-area";
import { countAdviserQueue } from "@/lib/actions/reviews";

export default async function AdviserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireArea("adviser");

  const queueCount = await countAdviserQueue();

  const navItems = [
    { href: "/adviser", label: "Review Queue", badge: queueCount },
    { href: "/adviser/reviewed", label: "Reviewed" },
    { href: "/adviser/browse", label: "Browse Archive" },
    { href: "/adviser/settings", label: "Settings" },
  ];

  // Fixed to the viewport so the page itself never scrolls — see the note in
  // app/dashboard/layout.tsx.
  return (
    <div className="fixed inset-0 flex overflow-hidden">
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
