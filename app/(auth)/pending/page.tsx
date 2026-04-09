import { Card, Button } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";

export default function PendingPage() {
  return (
    <Card className="text-center">
      <div className="mb-4 font-mono text-3xl text-pending">⏳</div>
      <h2 className="mb-2 font-heading text-lg text-white">
        Awaiting Approval
      </h2>
      <p className="mb-6 font-mono text-sm text-white/50">
        Your account is pending administrator approval. You will be able to
        access the system once an admin has verified your registration.
      </p>
      <form action={signOut}>
        <Button variant="danger-outline" type="submit">
          Sign Out
        </Button>
      </form>
    </Card>
  );
}
