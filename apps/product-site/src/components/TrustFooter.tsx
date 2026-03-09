"use client";

export default function TrustFooter() {
  return (
    <footer className="mt-12 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#00ffff]/20 to-transparent mb-6" />

        {/* Trust signals */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-neutral-600 text-xs">
            <span className="text-neutral-700 font-mono">//</span>
            <span>Built by data scientists using ESPN live data</span>
          </div>

          <p className="text-[10px] text-neutral-700">
            For entertainment and research purposes only.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <span className="text-[10px] text-neutral-800">
              &copy; {new Date().getFullYear()} Take The Live Under
            </span>
            <span className="text-neutral-800">|</span>
            <a
              href="#"
              className="text-[10px] text-neutral-700 hover:text-[#00ffff] transition-colors"
            >
              Terms
            </a>
            <span className="text-neutral-800">|</span>
            <a
              href="#"
              className="text-[10px] text-neutral-700 hover:text-[#00ffff] transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
