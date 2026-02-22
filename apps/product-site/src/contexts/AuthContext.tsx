'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TrialStatus, Subscription, calculateTrialStatus } from '@/lib/trial';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  trialStatus: TrialStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'ttlu_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const trialStatus = calculateTrialStatus(subscription);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSubscription(data.subscription);
      } else {
        // Token invalid, clear it
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        setSubscription(data.subscription);
        return { success: true };
      }

      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        setSubscription(data.subscription);
        return { success: true };
      }

      return { success: false, error: data.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSubscription(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        trialStatus,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
