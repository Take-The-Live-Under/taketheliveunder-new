'use client';

export default function TrustFooter() {
  return (
    <footer className="mt-12 pb-8 px-4 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-green-900 to-transparent mb-6" />

        {/* Trust signals */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-700 text-xs">
            <span className="text-green-600">//</span>
            <span>Built by data scientists using ESPN live data</span>
          </div>

          <p className="text-[10px] text-green-800">
            For entertainment and research purposes only.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-[10px] text-green-900">
              &copy; {new Date().getFullYear()} TTLU_TERMINAL
            </span>
            <span className="text-green-900">|</span>
            <a href="#" className="text-[10px] text-green-800 hover:text-green-400 transition-colors">
              TERMS
            </a>
            <span className="text-green-900">|</span>
            <a href="#" className="text-[10px] text-green-800 hover:text-green-400 transition-colors">
              PRIVACY
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
