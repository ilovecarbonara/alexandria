import { getAnalyticsData } from "@/lib/actions/analytics";
import { AnalyticsClient } from "@/components/AnalyticsClient";
import { Card } from "@/components/ui";

export default async function AdminAnalyticsPage() {
  const result = await getAnalyticsData();

  if (result.error || !result.data) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-ink-subtle">
          Failed to load analytics data.
        </p>
      </Card>
    );
  }

  return <AnalyticsClient data={result.data} />;
}
