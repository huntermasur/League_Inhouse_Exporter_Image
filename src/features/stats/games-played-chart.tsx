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

export function GamesPlayedChart({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.games_played - a.games_played);

  return (
    <>
      <h2 style={chartTheme.title}>Histogram of Games Participated</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 100 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
          <XAxis type="number" tick={chartTheme.tick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="username" tick={chartTheme.tick} width={96} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTheme.tooltip} cursor={{ fill: chartTheme.cursorFill }} />
          <Bar dataKey="games_played" name="Games" fill={chartTheme.blue} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
