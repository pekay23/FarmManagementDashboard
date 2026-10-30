"use client";

import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="fm-marketing border-t border-[#2c3e32]/14 bg-[#111b16] text-[#f4f7f4] py-12">
      <div className="fm-container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#34d399] flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white">FarmOps</span>
            </div>
            <p className="text-sm text-[#9aa99d] max-w-[40ch] leading-relaxed">
              Farm management software that actually works in the field.
              Track livestock, crops, sales, expenses, and inventory —
              online or off.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#9aa996] mb-4 font-mono">Product</h4>
            <ul className="space-y-3 text-sm text-[#cfe2e5]">
              <li><Link href="/portal" className="hover:text-[#34d399] transition-colors">Portal</Link></li>
              <li><Link href="#features" className="hover:text-[#34d399] transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-[#34d399] transition-colors">How It Works</Link></li>
              <li><Link href="/portal" className="hover:text-[#34d399] transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#9aa996] mb-4 font-mono">Company</h4>
            <ul className="space-y-3 text-sm text-[#cfe2e5]">
              <li><Link href="#" className="hover:text-[#34d399] transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-[#34d399] transition-colors">Contact</Link></li>
              <li><Link href="#" className="hover:text-[#34d399] transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[#34d399] transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2c3e32]/30 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#667568]">© {new Date().getFullYear()} FarmOps. Built for farmers.</p>
          <div className="flex gap-6 text-sm text-[#667568] font-mono uppercase tracking-widest">
            <Link href="#" className="hover:text-[#34d399] transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-[#34d399] transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-[#34d399] transition-colors">Instagram</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}