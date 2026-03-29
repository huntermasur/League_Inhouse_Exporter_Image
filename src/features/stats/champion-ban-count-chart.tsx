import type { ChampionBanStat } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { chartTheme } from './chart-theme.js';

interface Props {
  data: ChampionBanStat[];
}

export function ChampionBanCountChart({ data }: Props) {
  return (
    <>
      <h2 style={chartTheme.title}>Champion Ban Count</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 16, right: 16, bottom: 60, left: 8 }}>
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
            allowDecimals={false}
            tick={chartTheme.tick}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Count of Bans', angle: -90, position: 'insideLeft', fill: '#5a6478', fontSize: 11 }}
          />
          <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: chartTheme.cursorFill }} />
          <Bar dataKey="ban_count" name="Bans" fill={chartTheme.blue}>
            <LabelList dataKey="ban_count" position="top" style={{ fill: '#8b9bb4', fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
