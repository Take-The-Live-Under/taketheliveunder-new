import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface GameHistoryData {
  period: string;
  minutes_remaining: number;
  total_points: number;
  ou_line: number;
  required_ppm: number;
  current_ppm: number;
  timestamp: string;
}

interface LiveTrendChartsProps {
  history: GameHistoryData[];
  ouLine: number;
  homeTeam: string;
  awayTeam: string;
}

export default function LiveTrendCharts({ history, ouLine, homeTeam, awayTeam }: LiveTrendChartsProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center text-deep-slate-500 text-sm py-8">
        Loading live data...
      </div>
    );
  }

  // Reverse history so it goes chronologically (oldest to newest)
  const chronologicalHistory = [...history].reverse();

  // Format data for charts
  const chartData = chronologicalHistory.map((entry, idx) => ({
    index: idx,
    label: `${entry.period} ${entry.minutes_remaining}m`,
    totalScore: entry.total_points,
    ouLine: entry.ou_line,
    requiredPPM: entry.required_ppm,
    currentPPM: entry.current_ppm
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Score Trend Chart */}
      <div className="glass-card rounded p-3 h-64">
        <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
          Score vs O/U Line
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#4b5563' }}
              label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.375rem',
                color: '#f3f4f6',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <ReferenceLine y={ouLine} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'O/U Line', fill: '#f59e0b', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="totalScore"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Total Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PPM Trend Chart */}
      <div className="glass-card rounded p-3 h-64">
        <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
          PPM Trend
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={{ stroke: '#4b5563' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#4b5563' }}
              label={{ value: 'PPM', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.375rem',
                color: '#f3f4f6',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              type="monotone"
              dataKey="requiredPPM"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Required PPM"
            />
            <Line
              type="monotone"
              dataKey="currentPPM"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Current PPM"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
