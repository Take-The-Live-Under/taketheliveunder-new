'use client';

export default function TrustFooter() {
  return (
    <footer className="mt-12 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-6" />

        {/* Trust signals */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Built by data scientists using ESPN live data</span>
          </div>

          <p className="text-xs text-slate-600">
            For entertainment and research purposes only.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-xs text-slate-700">
              &copy; {new Date().getFullYear()} TakeTheLiveUnder
            </span>
            <span className="text-slate-800">|</span>
            <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Terms
            </a>
            <span className="text-slate-800">|</span>
            <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
