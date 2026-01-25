'use client';

import Image from 'next/image';

interface LandingPageProps {
  onAccess: () => void;
}

export default function LandingPage({ onAccess }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="text-center pt-10 pb-6 px-4">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="TakeTheLiveUnder"
          width={280}
          height={112}
          className="mx-auto h-24 w-auto mb-6"
          priority
        />

        {/* Hero Text */}
        <h1 className="text-xl font-bold text-white mb-2">
          Live Pace-Based Analytics
        </h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          We monitor live scoring pace vs posted totals and surface statistical edges in real time.
        </p>
      </div>

      {/* Steps */}
      <div className="flex-1 px-4 pb-6 max-w-md mx-auto w-full">
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Live Game Monitoring
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We track every NCAA basketball game in real-time, pulling live scores and current O/U lines.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Pace Analysis
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We calculate Points Per Minute (PPM) and compare it against the required pace to hit the line.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Edge Detection
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  We surface only statistically meaningful gaps where pace diverges significantly from the line.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 max-w-md mx-auto w-full">
        <button
          onClick={onAccess}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-orange-500/20 tap-target"
        >
          View Live Triggers
        </button>
        <p className="text-center text-xs text-slate-500 mt-4">
          Free access • No signup required
        </p>
      </div>

      {/* Trust Footer */}
      <div className="py-6 px-4 border-t border-slate-800">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Built by data scientists using ESPN live data</span>
          </div>
          <p className="text-xs text-slate-600">
            For entertainment and research purposes only
          </p>
        </div>
      </div>
    </div>
  );
}
