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
      title: 'STATISTICAL_EDGES',
      description: 'We only surface triggers when the gap between current pace and required pace creates a meaningful statistical edge.',
    },
  ];

  const currentStep = steps[step];

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
          <div className="w-20 h-20 border border-green-700 bg-green-900/20 flex items-center justify-center terminal-glow-box">
            <span className="text-4xl font-bold text-green-400">{currentStep.step}</span>
          </div>
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
          <button
            onClick={handleNext}
            className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold transition-colors tap-target"
          >
            {step < 2 ? 'NEXT' : 'GET_STARTED'}
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
