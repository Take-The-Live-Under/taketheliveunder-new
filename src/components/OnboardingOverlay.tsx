'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'ttlu_onboarding_complete';

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already completed
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setIsVisible(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  if (!isVisible) return null;

  const steps = [
    {
      step: '01',
      title: 'LIVE_GAME_MONITORING',
      description: 'We track every NCAA basketball game in real-time, pulling live scores and current O/U lines.',
    },
    {
      step: '02',
      title: 'PACE_ANALYSIS',
      description: 'We calculate scoring pace (Points Per Minute) and compare it against the required pace to hit the over/under line.',
    },
    {
      step: '03',
      title: 'GET_ALERTS',
      description: 'Want to know when the model triggers? Join our Discord for real-time notifications.',
      isDiscord: true,
    },
  ];

  const currentStep = steps[step] as { step: string; title: string; description: string; isDiscord?: boolean };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0a]/98 backdrop-blur-md font-mono">
      <div className="w-full max-w-md text-center animate-fade-in">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 transition-all duration-300 ${
                i === step ? 'w-8 bg-green-500' : 'w-2 bg-green-900'
              }`}
            />
          ))}
        </div>

        {/* Step number */}
        <div className="flex justify-center mb-6">
          {currentStep.isDiscord ? (
            <div className="w-20 h-20 border border-green-700 bg-green-900/20 flex items-center justify-center terminal-glow-box">
              <svg className="w-10 h-10 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 border border-green-700 bg-green-900/20 flex items-center justify-center terminal-glow-box">
              <span className="text-4xl font-bold text-green-400">{currentStep.step}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-green-400 mb-3">
          {currentStep.title}
        </h2>
        <p className="text-green-700 text-sm mb-8 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {currentStep.isDiscord && (
            <a
              href="https://discord.gg/CZTNW7JD"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition-colors tap-target flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              JOIN_DISCORD
            </a>
          )}
          <button
            onClick={handleNext}
            className={`w-full py-4 font-bold transition-colors tap-target ${
              currentStep.isDiscord
                ? 'border border-green-700 text-green-400 hover:bg-green-900/30'
                : 'bg-green-500 hover:bg-green-400 text-black'
            }`}
          >
            {step < 2 ? 'NEXT' : 'CONTINUE_TO_DASHBOARD'}
          </button>
          {step < 2 && (
            <button
              onClick={handleComplete}
              className="text-xs text-green-800 hover:text-green-500 transition-colors"
            >
              // SKIP_INTRO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
