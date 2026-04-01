"use server";

import { requireAdmin } from "./auth-guards";

export async function getAnalyticsData() {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const supabase = auth.supabase;

  const [thesesRes, disputesRes, alertsRes] = await Promise.all([
    supabase.from("theses").select("thesis_category, thesis_level, status, registered_at"),
    supabase.from("disputes").select("status, created_at"),
    supabase.from("title_alerts").select("status, created_at"),
  ]);

  const theses = thesesRes.data ?? [];
  const disputes = disputesRes.data ?? [];
  const alerts = alertsRes.data ?? [];

  // Category distribution
  const categoryMap: Record<string, number> = {};
  for (const t of theses) {
    categoryMap[t.thesis_category] = (categoryMap[t.thesis_category] || 0) + 1;
  }

  // Level distribution
  const levelMap: Record<string, number> = {};
  for (const t of theses) {
    levelMap[t.thesis_level] = (levelMap[t.thesis_level] || 0) + 1;
  }

  // Monthly registrations (last 12 months)
  const monthlyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = 0;
  }
  for (const t of theses) {
    const d = new Date(t.registered_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyMap) {
      monthlyMap[key]++;
    }
  }

  // Dispute counts
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved").length;

  // Alert counts
  const totalAlerts = alerts.length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAlerts = alerts.filter(
    (a) => new Date(a.created_at) >= thirtyDaysAgo,
  ).length;

  return {
    data: {
      categoryDistribution: categoryMap,
      levelDistribution: levelMap,
      monthlyRegistrations: monthlyMap,
      openDisputes,
      resolvedDisputes,
      totalAlerts,
      recentAlerts,
    },
  };
}
