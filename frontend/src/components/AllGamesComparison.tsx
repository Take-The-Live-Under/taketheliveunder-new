'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { games } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const COLORS = [
  '#a855f7', // Brand Purple
  '#f97316', // Brand Orange
  '#14b8a6', // Brand Teal
  '#c084fc', // Light Purple
  '#fb923c', // Light Orange
  '#2dd4bf', // Light Teal
  '#9333ea', // Deep Purple
  '#ea580c', // Deep Orange
  '#0d9488', // Deep Teal
  '#7e22ce', // Rich Purple
];

export default function AllGamesComparison() {
  const [limit, setLimit] = useState(10);

  // Fetch completed games
  const { data: completedData, error } = useSWR(
    `games-completed-all-${limit}`,
    () => games.getCompleted(limit),
    { refreshInterval: 60000 }
  );

  const completedGames = completedData?.games || [];

  // Process all games for combined chart
  const combinedData: any[] = [];
  const maxDataPoints = Math.max(...completedGames.map((g: any) => g.history?.length || 0));

  // Create time-normalized data (by index/time point)
  for (let i = 0; i < maxDataPoints; i++) {
    const dataPoint: any = { index: i };

    completedGames.forEach((game: any, gameIdx: number) => {
      if (game.history && game.history[i]) {
        const entry = game.history[i];
        const totalPoints = parseInt(entry.total_points || '0');
        const ouLine = parseFloat(entry.ou_line || '0');

        dataPoint[`game${gameIdx}_total`] = totalPoints;
        dataPoint[`game${gameIdx}_line`] = ouLine;
        dataPoint[`game${gameIdx}_name`] = `${game.away_team} @ ${game.home_team}`;
      }
    });

    combinedData.push(dataPoint);
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">All Games Comparison</h2>
          <div className="flex gap-4 items-center">
            <label className="text-sm text-gray-400">
              Number of games:
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="ml-2 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500 rounded p-3 text-red-400 text-sm">
            Error loading games. Please try again.
          </div>
        )}
      </div>

      {/* All Games - Total Points */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">All Games - Total Points Progression</h3>
        <p className="text-sm text-gray-400 mb-4">
          Compare how total points progressed across all games. Each color represents a different game.
        </p>
        {combinedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                label={{ value: 'Data Point #', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'Total Points', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value: string, entry: any) => {
                  const gameIdx = parseInt(value.replace('game', '').replace('_total', ''));
                  if (!isNaN(gameIdx) && completedGames[gameIdx]) {
                    return `${completedGames[gameIdx].away_team} @ ${completedGames[gameIdx].home_team}`;
                  }
                  return value;
                }}
              />

              {completedGames.map((game: any, idx: number) => (
                <Line
                  key={`total-${idx}`}
                  type="monotone"
                  dataKey={`game${idx}_total`}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={`game${idx}_total`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">No games available.</p>
        )}
      </div>

      {/* All Games - O/U Lines */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">All Games - O/U Line Movement</h3>
        <p className="text-sm text-gray-400 mb-4">
          Compare how O/U lines changed across all games.
        </p>
        {combinedData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                label={{ value: 'Data Point #', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
              />
              <YAxis
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'O/U Line', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value: string, entry: any) => {
                  const gameIdx = parseInt(value.replace('game', '').replace('_line', ''));
                  if (!isNaN(gameIdx) && completedGames[gameIdx]) {
                    return `${completedGames[gameIdx].away_team} @ ${completedGames[gameIdx].home_team}`;
                  }
                  return value;
                }}
              />

              {completedGames.map((game: any, idx: number) => (
                <Line
                  key={`line-${idx}`}
                  type="stepAfter"
                  dataKey={`game${idx}_line`}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={`game${idx}_line`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">No games available.</p>
        )}
      </div>

      {/* Games Summary Table */}
      <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-4">Games Summary ({completedGames.length} games)</h3>
        {completedGames.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2 text-gray-400">Color</th>
                <th className="text-left py-2 px-2 text-gray-400">Game</th>
                <th className="text-right py-2 px-2 text-gray-400">Final Score</th>
                <th className="text-right py-2 px-2 text-gray-400">Total</th>
                <th className="text-right py-2 px-2 text-gray-400">O/U</th>
                <th className="text-right py-2 px-2 text-gray-400">Margin</th>
                <th className="text-center py-2 px-2 text-gray-400">Result</th>
                <th className="text-right py-2 px-2 text-gray-400">Data Points</th>
              </tr>
            </thead>
            <tbody>
              {completedGames.map((game: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-700/50">
                  <td className="py-2 px-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                  </td>
                  <td className="py-2 px-2">{game.away_team} @ {game.home_team}</td>
                  <td className="text-right py-2 px-2 font-mono text-sm">{game.away_score || 0} - {game.home_score || 0}</td>
                  <td className="text-right py-2 px-2 font-bold">{game.final_total}</td>
                  <td className="text-right py-2 px-2 text-yellow-400">{game.ou_line}</td>
                  <td className="text-right py-2 px-2 text-purple-400">{((game.final_total || 0) - (game.ou_line || 0)).toFixed(1)}</td>
                  <td className="text-center py-2 px-2">
                    <span className={`font-bold ${game.ou_result === 'over' ? 'text-green-400' : 'text-blue-400'}`}>
                      {game.ou_result?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right py-2 px-2 text-gray-400">{game.history?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-center py-4">No games to display.</p>
        )}
      </div>
    </div>
  );
}
