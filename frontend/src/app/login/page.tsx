'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // User already has a token, redirect to dashboard
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await auth.login(username, password);
      // Save token to localStorage
      localStorage.setItem('token', data.access_token);
      // Wait a tick to ensure localStorage is written
      await new Promise(resolve => setTimeout(resolve, 100));
      // Use router for navigation instead of window.location
      router.push('/');
    } catch (err: any) {
      // Handle different error formats with safe fallback
      let errorMessage = 'Login failed';

      try {
        if (err.response?.data) {
          const errorData = err.response.data;

          // FastAPI validation error format
          if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              // Handle array of validation errors
              errorMessage = errorData.detail
                .map((e: any) => e.msg || e.message || String(e))
                .join(', ') || 'Validation error';
            } else {
              // Detail is an object, stringify it
              errorMessage = JSON.stringify(errorData.detail);
            }
          } else if (errorData.message) {
            errorMessage = String(errorData.message);
          }
        } else if (err.message) {
          errorMessage = String(err.message);
        }
      } catch (parseError) {
        // If error parsing fails, use generic message
        console.error('Error parsing login error:', parseError);
        errorMessage = 'An unexpected error occurred during login';
      }

      // Ensure error is always a string
      setError(String(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">NCAA Basketball Monitor</h1>
            <p className="text-gray-400">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3 text-red-400 text-sm">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Default credentials: admin / changeme</p>
          </div>
        </div>
      </div>
    </div>
  );
}
