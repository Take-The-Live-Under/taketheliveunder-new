'use client';

import { useState, useEffect } from 'react';
import { TriggerLog } from '@/lib/supabase';

export default function AdminPage() {
  const [logs, setLogs] = useState<TriggerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=200');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Date/Time',
      'Away Team',
      'Home Team',
      'Score',
      'O/U Line',
      'Required PPM',
      'Current PPM',
      'PPM Diff',
      'Minutes Left',
      'Period',
      'Clock',
      'Strength',
    ];

    const rows = logs.map((log) => [
      new Date(log.created_at!).toLocaleString(),
      log.away_team,
      log.home_team,
      `${log.away_score}-${log.home_score}`,
      log.ou_line,
      log.required_ppm.toFixed(2),
      log.current_ppm.toFixed(2),
      log.ppm_difference.toFixed(2),
      log.minutes_remaining.toFixed(1),
      log.period,
      log.clock,
      log.trigger_strength,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trigger-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG':
        return 'bg-green-500/20 text-green-400';
      case 'GOOD':
        return 'bg-green-400/20 text-green-300';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trigger Logs</h1>
            <p className="text-gray-400 text-sm mt-1">
              {logs.length} triggered games recorded
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-900/20 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && logs.length === 0 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-200 mb-2">No Logs Yet</p>
            <p className="text-sm text-gray-500">
              Triggered games will appear here as they happen.
            </p>
          </div>
        )}

        {/* Logs Table */}
        {!loading && logs.length > 0 && (
          <div className="rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/80">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Matchup</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Score</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">O/U</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Req PPM</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Cur PPM</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">PPM Diff</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Min Left</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Strength</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {new Date(log.created_at!).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-200">{log.away_team}</div>
                        <div className="text-gray-400 text-xs">@ {log.home_team}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-white font-medium">
                        {log.away_score}-{log.home_score}
                      </td>
                      <td className="px-4 py-3 text-center text-yellow-400 font-medium">
                        {log.ou_line}
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 font-medium">
                        {log.required_ppm.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {log.current_ppm.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 font-medium">
                        +{log.ppm_difference.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {log.minutes_remaining.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStrengthColor(log.trigger_strength)}`}>
                          {log.trigger_strength}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
