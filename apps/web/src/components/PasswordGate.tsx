'use client';

import { useState, useEffect, ReactNode } from 'react';

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already authenticated (from sessionStorage)
    const authenticated = sessionStorage.getItem('authenticated') === 'true';
    if (authenticated) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // Check if password is required
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!data.passwordRequired) {
          setIsAuthenticated(true);
        } else {
          setPasswordRequired(true);
        }
      })
      .catch(() => {
        // If check fails, assume no password required
        setIsAuthenticated(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Authentication failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  if (passwordRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-8">
            <h1 className="mb-6 text-center text-2xl font-bold text-white">
              Take The Live Under
            </h1>
            <form onSubmit={handleSubmit}>
              <label htmlFor="password" className="mb-2 block text-sm text-gray-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                placeholder="Enter password"
                autoFocus
              />
              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 transition-colors"
              >
                Enter
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
