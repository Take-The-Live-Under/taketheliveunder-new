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

interface TrendsViewProps {
  liveGames?: any[];
  preSelectedGameId?: string;
  hideSelector?: boolean;
}

export default function TrendsView({ liveGames = [], preSelectedGameId, hideSelector = false }: TrendsViewProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>(preSelectedGameId || '');

  // Fetch game history when a game is selected
  const { data: historyData, error } = useSWR(
    selectedGameId ? `game-history-${selectedGameId}` : null,
    () => games.getHistory(selectedGameId),
    { refreshInterval: 20000 } // Refresh every 20 seconds
  );

  const gameHistory = historyData?.history || [];

  // Transform data for chart
  const chartData = gameHistory.map((entry: any, index: number) => {
    const period = parseInt(entry.period || '1');
    const minutesRemaining = parseFloat(entry.minutes_remaining || '0');
    const totalPoints = parseFloat(entry.total_points || '0');
    const ouLine = parseFloat(entry.ou_line || '0');
    const requiredPpm = parseFloat(entry.required_ppm || '0');
    const currentPpm = parseFloat(entry.current_ppm || '0');
    const confidenceScore = parseFloat(entry.confidence_score || '0');

    // Calculate elapsed time (for x-axis)
    const totalGameMinutes = entry.home_team?.toLowerCase().includes('nba') ? 48 : 40;
    const elapsedMinutes = totalGameMinutes - (minutesRemaining + (period - 1) * (totalGameMinutes / (period > 2 ? 4 : 2)));

    return {
      index,
      time: `${period}Q ${Math.floor(minutesRemaining)}:${String(Math.floor((minutesRemaining % 1) * 60)).padStart(2, '0')}`,
      elapsedMinutes: elapsedMinutes.toFixed(1),
      totalPoints,
      ouLine,
      requiredPpm,
      currentPpm,
      confidenceScore,
      betType: entry.bet_type || 'under',
    };
  });

  // Get selected game details
  const selectedGame = liveGames.find(g => g.game_id === selectedGameId);

  // If no selectedGame from liveGames, use latest history entry for game info
  const latestHistoryEntry = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1] : null;
  const gameInfo = selectedGame || latestHistoryEntry;

  return (
    <div className="space-y-6">
      {/* Game Selector */}
      {!hideSelector && (
        <div className="bg-gray-800 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Game to Analyze
          </label>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a game --</option>
            {liveGames.map((game) => (
              <option key={game.game_id} value={game.game_id}>
                {game.away_team} @ {game.home_team} - {game.period ? `Q${game.period}` : 'Pending'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Charts */}
      {selectedGameId && gameInfo && (
        <>
          {/* Game Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-2">
              {gameInfo.away_team} @ {gameInfo.home_team}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Score:</span>
                <span className="ml-2 font-bold">{gameInfo.away_score} - {gameInfo.home_score}</span>
              </div>
              <div>
                <span className="text-gray-400">Total:</span>
                <span className="ml-2 font-bold">{gameInfo.total_points}</span>
              </div>
              <div>
                <span className="text-gray-400">O/U Line:</span>
                <span className="ml-2 font-bold">{gameInfo.ou_line}</span>
              </div>
              <div>
                <span className="text-gray-400">Current Bet:</span>
                <span className={`ml-2 font-bold ${gameInfo.bet_type === 'over' ? 'text-green-400' : 'text-blue-400'}`}>
                  {gameInfo.bet_type?.toUpperCase() || 'UNDER'}
                </span>
              </div>
            </div>
          </div>

          {/* Over/Under Line Movement */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Over/Under Line Movement</h3>
            <p className="text-sm text-gray-400 mb-4">
              Shows how the sportsbook O/U betting line changes over elapsed game time.
              Line movements indicate how bookmakers are adjusting based on betting action and game flow.
            </p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="elapsedMinutes"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Elapsed Time (minutes)', position: 'insideBottom', offset: -5, style: { fill: '#9CA3AF' } }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'O/U Line', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (typeof value === 'number') {
                        return [value.toFixed(1), name];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `${label} min elapsed`}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  {/* Opening Line Reference */}
                  <ReferenceLine
                    y={chartData[0]?.ouLine}
                    label={{ value: `Opening Line (${chartData[0]?.ouLine})`, position: 'right', fill: '#F59E0B', fontSize: 11 }}
                    stroke="#F59E0B"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                  {/* Current O/U Line - steps when line moves */}
                  <Line
                    type="stepAfter"
                    dataKey="ouLine"
                    stroke="#A855F7"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#A855F7', strokeWidth: 2 }}
                    name="Current O/U Line"
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">No data available yet. Game hasn't started or no polls recorded.</p>
            )}
          </div>

          {/* Required PPM vs Current PPM - OVERLAID */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Scoring Pace Analysis (PPM)</h3>
            <p className="text-sm text-gray-400 mb-4">
              Shows how the actual game pace (Current PPM) compares to what's needed to hit the over (Required PPM).
              When current pace exceeds required, the game is trending OVER. When below, trending UNDER.
            </p>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
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
                    label={{ value: 'Points Per Minute', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (typeof value === 'number') {
                        return [value.toFixed(2), name];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px' }}
                  />
                  {/* Balanced threshold lines (updated to 3.0) */}
                  <ReferenceLine
                    y={3.0}
                    label={{ value: "Trigger Threshold (3.0)", position: 'right', fill: '#9CA3AF', fontSize: 12 }}
                    stroke="#6B7280"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                  {/* Required PPM - what pace is needed to hit the over */}
                  <Line
                    type="monotone"
                    dataKey="requiredPpm"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#F59E0B', strokeWidth: 2 }}
                    name="Required PPM (to hit Over)"
                    activeDot={{ r: 6 }}
                  />
                  {/* Current PPM - actual game pace */}
                  <Line
                    type="monotone"
                    dataKey="currentPpm"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2 }}
                    name="Current PPM (actual pace)"
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">No data available yet.</p>
            )}
          </div>

          {/* Confidence Score Over Time */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Confidence Score Progression</h3>
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
                    domain={[0, 100]}
                    label={{ value: 'Confidence Score', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={40} label="Min Bet" stroke="#6B7280" strokeDasharray="5 5" />
                  <ReferenceLine y={61} label="Medium" stroke="#F59E0B" strokeDasharray="5 5" />
                  <ReferenceLine y={76} label="High" stroke="#10B981" strokeDasharray="5 5" />
                  <ReferenceLine y={86} label="MAX" stroke="#EF4444" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="confidenceScore"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Confidence Score"
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
                    <th className="text-right py-2 px-2 text-gray-400">Total</th>
                    <th className="text-right py-2 px-2 text-gray-400">O/U</th>
                    <th className="text-right py-2 px-2 text-gray-400">Req PPM</th>
                    <th className="text-right py-2 px-2 text-gray-400">Cur PPM</th>
                    <th className="text-right py-2 px-2 text-gray-400">Conf</th>
                    <th className="text-left py-2 px-2 text-gray-400">Bet</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.slice().reverse().map((row: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-700/50">
                      <td className="py-2 px-2">{row.time}</td>
                      <td className="text-right py-2 px-2 font-bold">{row.totalPoints}</td>
                      <td className="text-right py-2 px-2 text-yellow-400">{row.ouLine}</td>
                      <td className="text-right py-2 px-2">{(row.requiredPpm ?? 0).toFixed(2)}</td>
                      <td className="text-right py-2 px-2 text-purple-400">{(row.currentPpm ?? 0).toFixed(2)}</td>
                      <td className="text-right py-2 px-2 font-bold text-cyan-400">{(row.confidenceScore ?? 0).toFixed(0)}</td>
                      <td className={`py-2 px-2 font-bold ${row.betType === 'over' ? 'text-green-400' : 'text-blue-400'}`}>
                        {row.betType.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-center py-4">No data points recorded yet.</p>
            )}
          </div>
        </>
      )}

      {!selectedGameId && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">Select a game above to view trends and analysis</p>
        </div>
      )}
    </div>
  );
}
