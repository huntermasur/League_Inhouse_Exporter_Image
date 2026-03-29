import type { ChampionStatSummary } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: ChampionStatSummary[];
}

export function ChampionWinRateChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.win_pct - a.win_pct);

  return (
    <>
      <h2 style={chartTheme.title}>Champion Win Rates</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sorted}
          margin={{ top: 8, right: 16, bottom: 64, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="champion"
            tick={{ ...chartTheme.tick, fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Win Rate (%)",
              angle: -90,
              position: "insideLeft",
              fill: "#5a6478",
              fontSize: 11,
            }}
          />
          <Tooltip
            formatter={(value) => [`${value ?? 0}%`, "Win Rate"]}
            contentStyle={chartTheme.tooltip}
            cursor={{ fill: chartTheme.cursorFill }}
          />
          <ReferenceLine
            y={50}
            stroke="#5a6478"
            strokeDasharray="4 4"
            label={{
              value: "50%",
              fill: "#5a6478",
              fontSize: 10,
              position: "right",
            }}
          />
          <Bar dataKey="win_pct" name="Win Rate" radius={[3, 3, 0, 0]}>
            {sorted.map((entry) => (
              <Cell
                key={entry.champion}
                fill={entry.win_pct >= 50 ? chartTheme.blue : chartTheme.gold}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
