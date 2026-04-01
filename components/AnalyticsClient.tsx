"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Card } from "@/components/ui";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

const CHART_COLORS = [
  "#4A90D9",
  "#2ECC8F",
  "#E2A84B",
  "#C0392B",
  "#5CC8FF",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#3498DB",
  "#E74C3C",
];

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "rgba(255,255,255,0.6)",
        font: { family: "DM Mono, monospace", size: 11 },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,0.4)", font: { family: "DM Mono, monospace", size: 10 } },
      grid: { color: "rgba(255,255,255,0.05)" },
    },
    y: {
      ticks: { color: "rgba(255,255,255,0.4)", font: { family: "DM Mono, monospace", size: 10 } },
      grid: { color: "rgba(255,255,255,0.05)" },
    },
  },
} as const;

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        color: "rgba(255,255,255,0.6)",
        font: { family: "DM Mono, monospace", size: 11 },
        padding: 12,
      },
    },
  },
} as const;

interface AnalyticsData {
  categoryDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  monthlyRegistrations: Record<string, number>;
  openDisputes: number;
  resolvedDisputes: number;
  totalAlerts: number;
  recentAlerts: number;
}

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const categoryLabels = Object.keys(data.categoryDistribution);
  const categoryValues = Object.values(data.categoryDistribution);

  const levelLabels = Object.keys(data.levelDistribution).map(
    (l) => l.charAt(0).toUpperCase() + l.slice(1),
  );
  const levelValues = Object.values(data.levelDistribution);

  const monthLabels = Object.keys(data.monthlyRegistrations);
  const monthValues = Object.values(data.monthlyRegistrations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Analytics</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          Registration statistics and system overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Open Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-dispute">
            {data.openDisputes}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Resolved Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-success">
            {data.resolvedDisputes}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Total Alerts
          </p>
          <p className="mt-2 font-heading text-3xl text-white">
            {data.totalAlerts}
          </p>
        </Card>
        <Card>
          <p className="font-mono text-xs text-white/40 uppercase">
            Alerts (Last 30 Days)
          </p>
          <p className="mt-2 font-heading text-3xl text-pending">
            {data.recentAlerts}
          </p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-heading text-lg text-white">
            Theses by Category
          </h2>
          <div className="h-64">
            {categoryLabels.length > 0 ? (
              <Pie
                data={{
                  labels: categoryLabels,
                  datasets: [
                    {
                      data: categoryValues,
                      backgroundColor: CHART_COLORS.slice(0, categoryLabels.length),
                      borderWidth: 0,
                    },
                  ],
                }}
                options={PIE_OPTIONS}
              />
            ) : (
              <p className="flex h-full items-center justify-center font-mono text-sm text-white/40">
                No data available
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-heading text-lg text-white">
            Theses by Level
          </h2>
          <div className="h-64">
            {levelLabels.length > 0 ? (
              <Bar
                data={{
                  labels: levelLabels,
                  datasets: [
                    {
                      label: "Theses",
                      data: levelValues,
                      backgroundColor: "#4A90D9",
                    },
                  ],
                }}
                options={{
                  ...CHART_OPTIONS,
                  plugins: {
                    ...CHART_OPTIONS.plugins,
                    legend: { display: false },
                  },
                }}
              />
            ) : (
              <p className="flex h-full items-center justify-center font-mono text-sm text-white/40">
                No data available
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-white">
          Monthly Registrations
        </h2>
        <div className="h-72">
          {monthLabels.length > 0 ? (
            <Line
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: "Registrations",
                    data: monthValues,
                    borderColor: "#4A90D9",
                    backgroundColor: "rgba(74,144,217,0.1)",
                    fill: true,
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                ...CHART_OPTIONS,
                plugins: {
                  ...CHART_OPTIONS.plugins,
                  legend: { display: false },
                },
              }}
            />
          ) : (
            <p className="flex h-full items-center justify-center font-mono text-sm text-white/40">
              No data available
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
