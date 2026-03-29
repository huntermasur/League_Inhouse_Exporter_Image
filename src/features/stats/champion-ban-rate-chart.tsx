import type { ChampionBanStat } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartTheme } from './chart-theme.js';

interface Props {
  data: ChampionBanStat[];
}

function formatPct(value: number) {
  return `${value}%`;
}

export function ChampionBanRateChart({ data }: Props) {
  // Only show champions that have been banned at least once
  const filtered = data.filter((d) => d.ban_count > 0);

  return (
    <>
      <h2 style={chartTheme.title}>Champion Ban Rate</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={filtered} margin={{ top: 4, right: 16, bottom: 60, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
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
            tickFormatter={formatPct}
            domain={[0, 100]}
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [`${value ?? 0}%`, String(name)]}
            contentStyle={chartTheme.tooltip}
            cursor={{ fill: chartTheme.cursorFill }}
          />
          <Bar dataKey="ban_rate" name="Ban Rate" fill={chartTheme.blue} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
