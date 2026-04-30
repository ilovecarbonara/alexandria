import {
  listMyDisputes,
  listDisputesOnMyTheses,
} from "@/lib/actions/disputes";
import { DashboardDisputesClient } from "@/components/DashboardDisputesClient";

export default async function DashboardDisputesPage() {
  const [filedRes, receivedRes] = await Promise.all([
    listMyDisputes(),
    listDisputesOnMyTheses(),
  ]);

  return (
    <DashboardDisputesClient
      filed={filedRes.data ?? []}
      received={receivedRes.data ?? []}
    />
  );
}
