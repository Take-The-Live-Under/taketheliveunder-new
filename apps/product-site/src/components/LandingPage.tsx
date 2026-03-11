"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

interface LandingPageProps {
  onAccess: (email: string) => void;
}

export default function LandingPage({ onAccess }: LandingPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#00ffff]/[0.05] via-transparent to-transparent pointer-events-none" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        <Logo size="lg" />
        <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-white mb-2">
          {mode === 'login' ? 'Welcome Back' : 'Start Your Free Trial'}
        </h2>
        <p className="text-neutral-400 text-center mb-8">
          {mode === 'login' 
            ? 'Sign in to access your dashboard' 
            : 'Get 14 days of full access, free'}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full px-4 sm:px-0">
        <div className="bg-[#111] py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-neutral-800">
          {mode === 'login' ? (
            <LoginForm
              onSuccess={() => window.location.href = '/'}
              onSwitchToRegister={() => setMode('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={() => window.location.href = '/'}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>
      </div>
      
      <div className="absolute text-center bottom-8 left-0 right-0 text-neutral-600 text-xs font-mono">
        © {new Date().getFullYear()} Take The Live Under. For entertainment purposes only.
      </div>
    </div>
  );
}
