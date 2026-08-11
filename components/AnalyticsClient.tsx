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
import { Card, Button } from "@/components/ui";
import { generateCSV, downloadCSV } from "@/lib/export";

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

/**
 * Categorical series colours, keyed off the academic palette.
 *
 * Ordered so adjacent series stay distinguishable, and all are dark enough to
 * read as fills against the ivory ground.
 */
const CHART_COLORS = [
  "#1B3A6B", // navy — primary
  "#A67C2E", // gold — accent
  "#2F6B4F", // forest
  "#9B2C2C", // brick
  "#4B6E9C", // slate blue
  "#6B5B95", // muted violet
  "#357A6B", // teal
  "#B4713A", // burnt orange
  "#7A6A4F", // stone
  "#8A6D1F", // ochre
];

const INK_MUTED = "#5C5A54";
const INK_SUBTLE = "#86837B";
const GRID = "rgba(26, 26, 24, 0.08)";
const CHART_FONT = "Inter, system-ui, sans-serif";

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: INK_MUTED,
        font: { family: CHART_FONT, size: 11 },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: INK_SUBTLE, font: { family: CHART_FONT, size: 10 } },
      grid: { color: GRID },
    },
    y: {
      ticks: { color: INK_SUBTLE, font: { family: CHART_FONT, size: 10 } },
      grid: { color: GRID },
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
        color: INK_MUTED,
        font: { family: CHART_FONT, size: 11 },
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

  function handleExportCSV() {
    // Combine all analytics data into a single CSV
    const headers = ["Section", "Label", "Value"];
    const rows: string[][] = [];

    categoryLabels.forEach((label, i) =>
      rows.push(["Category Distribution", label, String(categoryValues[i])]),
    );
    levelLabels.forEach((label, i) =>
      rows.push(["Level Distribution", label, String(levelValues[i])]),
    );
    monthLabels.forEach((label, i) =>
      rows.push(["Monthly Registrations", label, String(monthValues[i])]),
    );
    rows.push(["Disputes", "Open", String(data.openDisputes)]);
    rows.push(["Disputes", "Resolved", String(data.resolvedDisputes)]);
    rows.push(["Alerts", "Total", String(data.totalAlerts)]);
    rows.push(["Alerts", "Last 30 Days", String(data.recentAlerts)]);

    const csv = generateCSV(headers, rows);
    downloadCSV("analytics.csv", csv);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-subtle">
            Registration statistics and system overview
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportCSV}
        >
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Open Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-danger">
            {data.openDisputes}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Resolved Disputes
          </p>
          <p className="mt-2 font-heading text-3xl text-success">
            {data.resolvedDisputes}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Total Alerts
          </p>
          <p className="mt-2 font-heading text-3xl text-ink">
            {data.totalAlerts}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-ink-subtle uppercase">
            Alerts (Last 30 Days)
          </p>
          <p className="mt-2 font-heading text-3xl text-warning">
            {data.recentAlerts}
          </p>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-heading text-lg text-ink">
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
              <p className="flex h-full items-center justify-center text-sm text-ink-subtle">
                No data available
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-heading text-lg text-ink">
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
                      backgroundColor: CHART_COLORS[0],
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
              <p className="flex h-full items-center justify-center text-sm text-ink-subtle">
                No data available
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <Card>
        <h2 className="mb-4 font-heading text-lg text-ink">
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
                    borderColor: CHART_COLORS[0],
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
            <p className="flex h-full items-center justify-center text-sm text-ink-subtle">
              No data available
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
