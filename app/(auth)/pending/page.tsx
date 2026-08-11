import { Card, Button } from "@/components/ui";

export default function PendingPage() {
  return (
    <Card className="text-center">
      <div className="mb-4 text-3xl text-warning">⏳</div>
      <h2 className="mb-2 font-heading text-lg text-ink">
        Awaiting Approval
      </h2>
      <p className="mb-6 text-sm text-ink-subtle">
        Your account is pending administrator approval. You will be able to
        access the system once an admin has verified your registration.
      </p>
      <form action="/api/auth/signout" method="post">
        <Button variant="danger-outline" type="submit">
          Sign Out
        </Button>
      </form>
    </Card>
  );
}
