import type { ChampionPickStat } from "@/types";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: ChampionPickStat[];
}

const PIE_COLORS = [
  "#4472c4",
  "#ed7d31",
  "#a9d18e",
  "#ffd966",
  "#ff6699",
  "#70ad47",
  "#9dc3e6",
  "#c5e0b4",
  "#f4b183",
  "#d9d9d9",
  "#8064a2",
  "#44546a",
  "#ff0000",
  "#00b0f0",
  "#7030a0",
  "#00b050",
  "#ff7c80",
  "#c55a11",
  "#833c00",
  "#2f75b6",
];

export function ChampionPickDistributionChart({ data }: Props) {
  // Show top 10 by pick count, group the rest as "Others"
  const sorted = [...data].sort((a, b) => b.pick_count - a.pick_count);
  const top = sorted.slice(0, 10);
  const othersCount = sorted
    .slice(10)
    .reduce((sum, d) => sum + d.pick_count, 0);
  const chartData =
    othersCount > 0
      ? [...top, { champion: "Others", pick_count: othersCount, pick_rate: 0 }]
      : top;

  return (
    <>
      <h2 style={chartTheme.title}>Champion Pick Distribution</h2>
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="pick_count"
            nameKey="champion"
            cx="40%"
            cy="50%"
            outerRadius={110}
            label={(entry: PieLabelRenderProps) => String(entry.name ?? "")}
            labelLine={{ stroke: "#2a2d3e" }}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, String(name)]}
            contentStyle={chartTheme.tooltip}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ color: "#8b9bb4", fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}
