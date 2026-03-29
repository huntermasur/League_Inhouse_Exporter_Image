import type { RolePerformanceStat } from "@/types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: RolePerformanceStat[];
}

// Enforce display order matching the mockup (top of pentagon → clockwise)
const ROLE_ORDER = ["Top", "Jungle", "Mid", "Bot", "Support"];

export function RolePerformanceChart({ data }: Props) {
  const ordered = ROLE_ORDER.map(
    (role) =>
      data.find((d) => d.role === role) ?? {
        role,
        avg_kills: 0,
        avg_deaths: 0,
        avg_assists: 0,
      },
  );

  return (
    <>
      <h2 style={chartTheme.title}>Role Performance Analysis</h2>
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart data={ordered} cx="50%" cy="50%" outerRadius={130}>
          <PolarGrid stroke={chartTheme.grid} />
          <PolarAngleAxis
            dataKey="role"
            tick={{ fill: "#8b9bb4", fontSize: 13 }}
          />
          <PolarRadiusAxis
            angle={90}
            tick={{ fill: "#5a6478", fontSize: 10 }}
            axisLine={false}
          />
          <Tooltip contentStyle={chartTheme.tooltip} />
          <Radar
            name="Avg Kills"
            dataKey="avg_kills"
            stroke={chartTheme.blue}
            fill={chartTheme.blue}
            fillOpacity={0.25}
          />
          <Radar
            name="Avg Deaths"
            dataKey="avg_deaths"
            stroke={chartTheme.red}
            fill={chartTheme.red}
            fillOpacity={0.2}
          />
          <Radar
            name="Avg Assists"
            dataKey="avg_assists"
            stroke={chartTheme.gold}
            fill={chartTheme.gold}
            fillOpacity={0.2}
          />
          <Legend wrapperStyle={{ color: "#8b9bb4", fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
      <p style={{ color: "#5a6478", fontSize: 11, marginTop: 4 }}>
        Comparison of average K/D/A across different roles. Shows which roles
        tend to get more kills, deaths, or assists.
      </p>
    </>
  );
}
