'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          placeholder="Enter your password"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-orange-400 hover:text-orange-300 font-medium"
        >
          Start free trial
        </button>
      </p>
    </form>
  );
}
