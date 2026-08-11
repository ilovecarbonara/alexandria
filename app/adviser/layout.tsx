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
