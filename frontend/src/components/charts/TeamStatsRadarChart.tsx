import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

interface TeamStats {
  pace: number;
  def_eff: number;
  off_eff: number;
  avg_ppg: number;
  three_point_rate: number;
}

interface TeamStatsRadarChartProps {
  homeTeam: string;
  awayTeam: string;
  homeMetrics: TeamStats;
  awayMetrics: TeamStats;
}

export default function TeamStatsRadarChart({
  homeTeam,
  awayTeam,
  homeMetrics,
  awayMetrics
}: TeamStatsRadarChartProps) {
  // Normalize stats to 0-100 scale for better radar visualization
  const normalizeValue = (value: number, min: number, max: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const data = [
    {
      stat: 'Pace',
      [homeTeam]: normalizeValue(homeMetrics.pace, 60, 80),
      [awayTeam]: normalizeValue(awayMetrics.pace, 60, 80),
      homeRaw: homeMetrics.pace.toFixed(1),
      awayRaw: awayMetrics.pace.toFixed(1)
    },
    {
      stat: 'Off Eff',
      [homeTeam]: normalizeValue(homeMetrics.off_eff, 90, 120),
      [awayTeam]: normalizeValue(awayMetrics.off_eff, 90, 120),
      homeRaw: homeMetrics.off_eff.toFixed(1),
      awayRaw: awayMetrics.off_eff.toFixed(1)
    },
    {
      stat: 'Def Eff',
      [homeTeam]: normalizeValue(110 - homeMetrics.def_eff, 90, 120), // Inverted - lower is better
      [awayTeam]: normalizeValue(110 - awayMetrics.def_eff, 90, 120),
      homeRaw: homeMetrics.def_eff.toFixed(1),
      awayRaw: awayMetrics.def_eff.toFixed(1)
    },
    {
      stat: 'PPG',
      [homeTeam]: normalizeValue(homeMetrics.avg_ppg, 60, 90),
      [awayTeam]: normalizeValue(awayMetrics.avg_ppg, 60, 90),
      homeRaw: homeMetrics.avg_ppg.toFixed(1),
      awayRaw: awayMetrics.avg_ppg.toFixed(1)
    },
    {
      stat: '3PT Rate',
      [homeTeam]: homeMetrics.three_point_rate * 100,
      [awayTeam]: awayMetrics.three_point_rate * 100,
      homeRaw: (homeMetrics.three_point_rate * 100).toFixed(1) + '%',
      awayRaw: (awayMetrics.three_point_rate * 100).toFixed(1) + '%'
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-semibold text-deep-slate-400 mb-2 uppercase tracking-wide">
        Team Stats Comparison
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name={homeTeam}
            dataKey={homeTeam}
            stroke="#f97316" // orange-500
            fill="#f97316"
            fillOpacity={0.3}
          />
          <Radar
            name={awayTeam}
            dataKey={awayTeam}
            stroke="#3b82f6" // blue-500
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            iconType="circle"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.375rem',
              color: '#f3f4f6',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string, props: any) => {
              const isHome = name === homeTeam;
              const rawValue = isHome ? props.payload.homeRaw : props.payload.awayRaw;
              return [rawValue, name];
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
