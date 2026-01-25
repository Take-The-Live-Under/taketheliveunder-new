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
      icon: (
        <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      ),
      title: 'Live Game Monitoring',
      description: 'We track every NCAA basketball game in real-time, pulling live scores and current O/U lines.',
    },
    {
      icon: (
        <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      ),
      title: 'Pace Analysis',
      description: 'We calculate scoring pace (Points Per Minute) and compare it against the required pace to hit the over/under line.',
    },
    {
      icon: (
        <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      ),
      title: 'Statistical Edges',
      description: 'We only surface triggers when the gap between current pace and required pace creates a meaningful statistical edge.',
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
      <div className="w-full max-w-md text-center animate-fade-in">
        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-orange-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          {currentStep.icon}
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-white mb-3">
          {currentStep.title}
        </h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors tap-target"
          >
            {step < 2 ? 'Next' : 'Get Started'}
          </button>
          {step < 2 && (
            <button
              onClick={handleComplete}
              className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
