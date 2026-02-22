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
        return 'border-green-500 text-green-400 bg-green-500/10';
      case 'GOOD':
        return 'border-green-600 text-green-500 bg-green-600/10';
      case 'MODERATE':
        return 'border-yellow-600 text-yellow-500 bg-yellow-600/10';
      default:
        return 'border-green-800 text-green-700 bg-green-800/10';
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-4 md:p-6 font-mono">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-green-800 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-green-500 tracking-wider">TRIGGER_LOGS</h1>
            <p className="text-green-700 text-xs mt-1">
              {logs.length} TRIGGERED_GAMES_RECORDED
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 border border-green-700 text-green-500 hover:bg-green-900/30 transition-colors text-xs font-medium"
            >
              REFRESH
            </button>
            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="px-3 py-1.5 border border-green-500 text-green-400 hover:bg-green-500/20 disabled:border-green-800 disabled:text-green-800 transition-colors text-xs font-medium"
            >
              EXPORT_CSV
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-green-500 text-sm">LOADING_DATA...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-700 bg-red-900/20 p-4 text-red-400 text-sm">
            ERROR: {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && logs.length === 0 && (
          <div className="border border-green-800 bg-green-900/10 p-12 text-center">
            <div className="text-4xl mb-4 text-green-600">[ ]</div>
            <p className="text-green-500 font-medium mb-2">NO_LOGS_FOUND</p>
            <p className="text-xs text-green-700">
              Triggered games will appear here as they happen.
            </p>
          </div>
        )}

        {/* Logs Table */}
        {!loading && logs.length > 0 && (
          <div className="border border-green-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-green-900/30 border-b border-green-800">
                  <tr>
                    <th className="text-left px-3 py-2 text-green-600 font-medium">TIME</th>
                    <th className="text-left px-3 py-2 text-green-600 font-medium">MATCHUP</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">SCORE</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">O/U</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">REQ_PPM</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">CUR_PPM</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">PPM_DIFF</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">MIN_LEFT</th>
                    <th className="text-center px-3 py-2 text-green-600 font-medium">STRENGTH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-900">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-green-900/20 transition-colors">
                      <td className="px-3 py-2 text-green-400 whitespace-nowrap">
                        {new Date(log.created_at!).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-green-300">{log.away_team}</div>
                        <div className="text-green-600 text-xs">@ {log.home_team}</div>
                      </td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium">
                        {log.away_score}-{log.home_score}
                      </td>
                      <td className="px-3 py-2 text-center text-yellow-500 font-medium">
                        {log.ou_line}
                      </td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium">
                        {log.required_ppm.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500">
                        {log.current_ppm.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center text-green-400 font-medium">
                        +{log.ppm_difference.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center text-green-500">
                        {log.minutes_remaining.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 border text-xs font-bold ${getStrengthColor(log.trigger_strength)}`}>
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
            className="text-xs text-green-700 hover:text-green-500 transition-colors"
          >
            &lt; BACK_TO_DASHBOARD
          </a>
        </div>
      </div>
    </main>
  );
}
