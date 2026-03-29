import type { PlayerGameStat } from '@/types';
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
  data: PlayerGameStat[];
}

function formatPct(value: number) {
  return `${value}%`;
}

export function WinPercentChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => a.win_pct - b.win_pct);

  return (
    <>
      <h2 style={chartTheme.title}>Histogram of Win %</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={formatPct}
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis type="category" dataKey="username" tick={chartTheme.tick} width={96} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value, name) => [`${value ?? 0}%`, String(name)]}
            contentStyle={chartTheme.tooltip}
            cursor={{ fill: chartTheme.cursorFill }}
          />
          <Bar dataKey="win_pct" name="Win %" fill={chartTheme.blue} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
