import type { ChampionPickStat } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: ChampionPickStat[];
}

export function ChampionPickRateChart({ data }: Props) {
  // Sort by pick_rate descending, show top 15 for readability
  const sorted = [...data]
    .sort((a, b) => b.pick_rate - a.pick_rate)
    .slice(0, 15);

  return (
    <>
      <h2 style={chartTheme.title}>Champion Pick Rate</h2>
      <ResponsiveContainer
        width="100%"
        height={Math.max(280, sorted.length * 28 + 40)}
      >
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 20, left: 96 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Pick Rate (%)",
              position: "insideBottom",
              offset: -12,
              fill: "#5a6478",
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="champion"
            tick={{ ...chartTheme.tick, fontSize: 11 }}
            width={90}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [
              typeof value === "number" ? value.toFixed(3) : value,
              "Pick Rate",
            ]}
            contentStyle={chartTheme.tooltip}
            cursor={{ fill: chartTheme.cursorFill }}
          />
          <Bar
            dataKey="pick_rate"
            name="Pick Rate"
            fill={chartTheme.blue}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
