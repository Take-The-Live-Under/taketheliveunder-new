'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TrialStatus, Subscription, calculateTrialStatus } from '@/lib/trial';
import { authClient } from '@/lib/auth-client';

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
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubLoading, setIsSubLoading] = useState(true);

  const isLoading = isSessionLoading || (!!session?.user && isSubLoading);
  const trialStatus = calculateTrialStatus(subscription);

  const fetchSubscription = useCallback(async () => {
    if (!session?.user) {
      setSubscription(null);
      setIsSubLoading(false);
      return;
    }
    
    try {
      setIsSubLoading(true);
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription(null);
    } finally {
      setIsSubLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await authClient.signIn.email({ email, password, rememberMe });
      if (response.error) {
        return { success: false, error: response.error.message || 'Login failed' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await authClient.signUp.email({ 
         email, 
         password, 
         name: displayName || email.split('@')[0] 
      });
      if (response.error) {
        return { success: false, error: response.error.message || 'Registration failed' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    await authClient.signOut();
    setSubscription(null);
  };

  const refreshUser = async () => {
    await fetchSubscription();
  };

  // Convert BetterAuth user type to what the app expects for backwards compatibility
  const appUser: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    display_name: session.user.name,
    created_at: session.user.createdAt.toISOString(),
  } : null;

  return (
    <AuthContext.Provider
      value={{
        user: appUser,
        subscription,
        trialStatus,
        isLoading,
        isAuthenticated: !!session?.user,
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
