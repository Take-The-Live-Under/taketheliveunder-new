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
  Scatter,
  ScatterChart,
  ComposedChart,
} from 'recharts';

export default function CompletedGamesAnalysis() {
  const [selectedGameId, setSelectedGameId] = useState<string>('');

  // Fetch completed games
  const { data: completedData, error } = useSWR(
    'games-completed',
    () => games.getCompleted(50),
    { refreshInterval: 60000 } // Refresh every minute
  );

  const completedGames = completedData?.games || [];

  // Get selected game details
  const selectedGame = completedGames.find((g: any) => g.game_id === selectedGameId);

  // Transform data for chart
  const chartData = selectedGame?.history?.map((entry: any, index: number) => {
    const totalPoints = parseInt(entry.total_points || '0');
    const ouLine = parseFloat(entry.ou_line || '0');
    const finalTotal = selectedGame?.final_total || 0;
    const isOver = totalPoints > ouLine;
    const lineWouldWinUnder = ouLine > finalTotal; // If line was above final, under would win

    return {
      index,
      time: entry.period ? `Q${entry.period} ${Math.floor(entry.minutes_remaining || 0)}:${String(Math.floor(((entry.minutes_remaining || 0) % 1) * 60)).padStart(2, '0')}` : `Pt ${index}`,
      totalPoints,
      ouLine,
      isOver,
      lineWouldWinUnder,
      pickType: entry.bet_type || 'under',
    };
  }) || [];

  return (
    <div className="space-y-6">
      {/* Game Selector */}
      <div className="bg-gray-800 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Completed Game to Analyze
        </label>
        <select
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Choose a completed game --</option>
          {completedGames.map((game: any) => (
            <option key={game.game_id} value={game.game_id}>
              {game.away_team} ({game.away_score || 0}) @ {game.home_team} ({game.home_score || 0}) = {game.final_total} (O/U: {game.ou_line}) - {game.ou_result} - {game.outcome || 'N/A'}
            </option>
          ))}
        </select>

        {error && (
          <div className="mt-4 bg-red-900/20 border border-red-500 rounded p-3 text-red-400 text-sm">
            Error loading completed games. Please try again.
          </div>
        )}
      </div>

      {/* Analysis */}
      {selectedGameId && selectedGame && (
        <>
          {/* Game Summary */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">
              {selectedGame.away_team} @ {selectedGame.home_team}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Date:</span>
                <span className="ml-2 font-bold">{selectedGame.date}</span>
              </div>
              <div>
                <span className="text-gray-400">Final Score:</span>
                <span className="ml-2 font-bold text-green-400">{selectedGame.away_score || 0} - {selectedGame.home_score || 0} ({selectedGame.final_total})</span>
              </div>
              <div>
                <span className="text-gray-400">O/U Line:</span>
                <span className="ml-2 font-bold text-yellow-400">{selectedGame.ou_line}</span>
              </div>
              <div>
                <span className="text-gray-400">Result:</span>
                <span className={`ml-2 font-bold ${selectedGame.ou_result === 'over' ? 'text-green-400' : 'text-blue-400'}`}>
                  {selectedGame.ou_result?.toUpperCase() || 'PUSH'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Margin:</span>
                <span className="ml-2 font-bold text-purple-400">{((selectedGame.final_total || 0) - (selectedGame.ou_line || 0)).toFixed(1)}</span>
              </div>
              <div>
                <span className="text-gray-400">Our Outcome:</span>
                <span className={`ml-2 font-bold ${selectedGame.outcome === 'win' ? 'text-green-400' : selectedGame.outcome === 'loss' ? 'text-red-400' : 'text-gray-400'}`}>
                  {selectedGame.outcome?.toUpperCase() || 'N/A'} ({selectedGame.unit_profit >= 0 ? '+' : ''}{selectedGame.unit_profit}u)
                </span>
              </div>
            </div>
          </div>

          {/* Total Points Progression */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Total Points Progression</h3>
            <p className="text-sm text-gray-400 mb-4">
              Points <span className="text-green-400 font-bold">above the line</span> indicate the game was trending OVER.
              Points <span className="text-blue-400 font-bold">below the line</span> indicate the game was trending UNDER.
            </p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    label={{ value: 'Total Points', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'totalPoints') return [value, 'Total Points'];
                      if (name === 'ouLine') return [value, 'O/U Line'];
                      return [value, name];
                    }}
                  />
                  <Legend />

                  {/* O/U Reference Line */}
                  <ReferenceLine
                    y={chartData[0]?.ouLine}
                    label="O/U Line"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />

                  {/* Total Points Line - Color coded based on over/under */}
                  <Line
                    type="monotone"
                    dataKey="totalPoints"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isOver = payload.isOver;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={isOver ? '#10B981' : '#3B82F6'}
                          stroke={isOver ? '#10B981' : '#3B82F6'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    name="Total Points"
                  />

                  {/* O/U Line (for legend) */}
                  <Line
                    type="stepAfter"
                    dataKey="ouLine"
                    stroke="#F59E0B"
                    strokeWidth={0}
                    dot={false}
                    name="O/U Line"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">No historical data available for this game.</p>
            )}
          </div>

          {/* O/U Line Movement */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Over/Under Line Movement</h3>
            <p className="text-sm text-gray-400 mb-4">
              Track how the O/U line changed throughout the game. Final Total: <span className="font-bold text-yellow-400">{selectedGame?.final_total}</span>
              <br />
              <span className="text-blue-400 font-bold">Blue dots</span> = O/U line below final (UNDER would have lost).
              <span className="text-green-400 font-bold"> Green dots</span> = O/U line above final (UNDER would have won).
            </p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="time"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                    label={{ value: 'O/U Line', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      return [value, name];
                    }}
                  />
                  <Legend />

                  {/* Reference line for final total */}
                  <ReferenceLine
                    y={selectedGame?.final_total}
                    label="Final Total"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />

                  <Line
                    type="stepAfter"
                    dataKey="ouLine"
                    stroke="#A855F7"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const lineWouldWinUnder = payload.lineWouldWinUnder;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={lineWouldWinUnder ? '#10B981' : '#3B82F6'}
                          stroke={lineWouldWinUnder ? '#10B981' : '#3B82F6'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    name="O/U Line"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">No data available yet.</p>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-gray-800 rounded-lg p-6 overflow-x-auto">
            <h3 className="text-lg font-bold mb-4">Historical Data Points ({chartData.length} polls)</h3>
            {chartData.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-2 text-gray-400">Time</th>
                    <th className="text-right py-2 px-2 text-gray-400">Total Points</th>
                    <th className="text-right py-2 px-2 text-gray-400">O/U Line</th>
                    <th className="text-center py-2 px-2 text-gray-400">Position</th>
                    <th className="text-left py-2 px-2 text-gray-400">Our Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice().reverse().map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-700/50">
                      <td className="py-2 px-2">{row.time}</td>
                      <td className="text-right py-2 px-2 font-bold">{row.totalPoints}</td>
                      <td className="text-right py-2 px-2 text-yellow-400">{row.ouLine}</td>
                      <td className="text-center py-2 px-2">
                        <span className={`font-bold ${row.isOver ? 'text-green-400' : 'text-blue-400'}`}>
                          {row.isOver ? 'OVER ↑' : 'UNDER ↓'}
                        </span>
                      </td>
                      <td className={`py-2 px-2 font-bold ${row.pickType === 'over' ? 'text-green-400' : 'text-blue-400'}`}>
                        {row.pickType?.toUpperCase() || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-center py-4">No data points recorded.</p>
            )}
          </div>
        </>
      )}

      {!selectedGameId && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">Select a completed game above to view analysis</p>
        </div>
      )}
    </div>
  );
}
