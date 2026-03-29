import type { PlayerStatSummary } from "@/types";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { chartTheme } from "./chart-theme.js";

interface Props {
  data: PlayerStatSummary[];
}

interface TooltipPayloadEntry {
  payload: PlayerStatSummary;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function PlayerKdaTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{ ...chartTheme.tooltip, padding: "8px 12px", lineHeight: 1.6 }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.username}</div>
      <div>
        Avg Kills: <strong>{d.avg_kills}</strong>
      </div>
      <div>
        Avg Deaths: <strong>{d.avg_deaths}</strong>
      </div>
      <div>
        Avg Assists: <strong>{d.avg_assists}</strong>
      </div>
      <div>
        KDA: <strong>{d.kda}</strong>
      </div>
    </div>
  );
}

export function PlayerKdaChart({ data }: Props) {
  // Map kda ratio to a bubble size range (min 30, max 400 area)
  const scatterData = data.map((d) => ({
    ...d,
    bubble_size: Math.round(d.kda * d.kda * 10),
  }));

  return (
    <>
      <h2 style={chartTheme.title}>Player KDA Analysis</h2>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 40, left: 8 }}>
          <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="avg_kills"
            name="Average Kills"
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Average Kills",
              position: "insideBottom",
              offset: -24,
              fill: "#5a6478",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="avg_deaths"
            name="Average Deaths"
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Average Deaths",
              angle: -90,
              position: "insideLeft",
              fill: "#5a6478",
              fontSize: 11,
            }}
          />
          <ZAxis type="number" dataKey="bubble_size" range={[30, 400]} />
          <Tooltip
            content={<PlayerKdaTooltip />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter
            data={scatterData}
            fill={chartTheme.blue}
            fillOpacity={0.7}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p style={{ color: "#5a6478", fontSize: 11, marginTop: 4 }}>
        Bubble size represents KDA ratio. Lower deaths and higher kills = better
        performance.
      </p>
    </>
  );
}
