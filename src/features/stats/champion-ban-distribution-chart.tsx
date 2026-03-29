import type { ChampionBanStat } from '@/types';
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { chartTheme } from './chart-theme.js';

interface Props {
  data: ChampionBanStat[];
}

// Distinct palette for pie slices — cycles if more champions than colours
const PIE_COLORS = [
  '#4472c4', '#ed7d31', '#a9d18e', '#ffd966', '#ff6699',
  '#70ad47', '#9dc3e6', '#c5e0b4', '#f4b183', '#d9d9d9',
  '#8064a2', '#44546a', '#ff0000', '#00b0f0', '#7030a0',
  '#00b050', '#ff7c80', '#c55a11', '#833c00', '#2f75b6',
];

export function ChampionBanDistributionChart({ data }: Props) {
  const filtered = data.filter((d) => d.ban_count > 0);

  return (
    <>
      <h2 style={chartTheme.title}>Champion Ban Distribution</h2>
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="ban_count"
            nameKey="champion"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={(entry: PieLabelRenderProps) => `${String(entry.name ?? '')} ${String(entry.percent !== undefined ? Math.round((entry.percent as number) * 100) : 0)}%`}
            labelLine={{ stroke: '#2a2d3e' }}
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [value, String(name)]}
            contentStyle={chartTheme.tooltip}
          />
          <Legend
            wrapperStyle={{ color: '#8b9bb4', fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}
