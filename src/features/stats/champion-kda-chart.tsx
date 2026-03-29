import type { ChampionKdaStat } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: ChampionKdaStat[];
}

export function ChampionKdaChart({ data }: Props) {
  return (
    <>
      <h2 style={chartTheme.title}>Champion KDA</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, bottom: 60, left: 8 }}
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
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Average",
              angle: -90,
              position: "insideLeft",
              fill: "#5a6478",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={chartTheme.tooltip}
            cursor={{ fill: chartTheme.cursorFill }}
          />
          <Legend wrapperStyle={{ color: "#8b9bb4", fontSize: 12 }} />
          <Bar dataKey="avg_kills" name="AVERAGE of K" fill={chartTheme.blue} />
          <Bar dataKey="avg_deaths" name="AVERAGE of D" fill={chartTheme.red} />
          <Bar
            dataKey="avg_assists"
            name="AVERAGE of A"
            fill={chartTheme.gold}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
