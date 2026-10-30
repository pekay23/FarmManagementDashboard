"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Activity, DollarSign } from "lucide-react";

export function MarketingHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const y = Math.min(scrollY * 0.03, 30);
  const opacity = Math.max(1 - scrollY / 800, 0.2);

  return (
    <section
      className="fm-marketing relative fm-hero overflow-hidden"
      data-screen-label="Overview"
    >
      <div
        className="fm-hero-media relative h-[55vh] w-full lg:absolute lg:inset-0 lg:h-full origin-top"
        aria-hidden="true"
        style={{ transform: `translateY(${y}%)`, opacity }}
      >
        <div className="relative w-full h-full bg-[#eef4ec]">
          <div className="w-full h-full flex items-center justify-center text-[#059669]/20 font-mono text-xs tracking-widest uppercase">
            FarmOps
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#059669]/60 via-[#059669]/30 to-transparent" />
        </div>
      </div>

      <div className="hidden lg:block absolute inset-0 bg-black/40 pointer-events-none z-5" />

      <div className="relative z-10 bg-[#f7f9f4] px-8 py-12 lg:bg-transparent lg:pb-[clamp(40px,6vw,80px)] lg:pt-0">
        <div className="fm-container">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[clamp(24px,4vw,60px)] items-end">
            <div>
              <span className="fm-eyebrow">Farm Management Software</span>
              <h1 className="fm-display-xl mb-6 leading-tight">
                Run your farm. <em>Not your paperwork.</em>
              </h1>
              <p className="fm-lede mb-8 max-w-[56ch]">
                A complete farm operations platform for tracking livestock,
                crops, sales, expenses, inventory, and tasks — all in one
                place. Built for farmers who want clarity, not complexity.
              </p>
              <div className="fm-cta-row">
                <Link href="/portal" className="fm-btn fm-btn-filled">
                  Open the Portal <span className="arrow">→</span>
                </Link>
                <Link href="#features" className="fm-btn fm-btn-outline">
                  See Features <span className="arrow">→</span>
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-4">
                <FeatureStat
                  icon={Plus}
                  label="Everything in one place"
                  color="bg-[#ecfdf5] text-[#059669]"
                />
                <FeatureStat
                  icon={Activity}
                  label="Works offline, syncs online"
                  color="bg-[#ecfdf5] text-[#059669]"
                />
                <FeatureStat
                  icon={DollarSign}
                  label="Track profit per plot"
                  color="bg-[#ecfdf5] text-[#059669]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-20 w-full overflow-hidden border-t border-white/20 border-b bg-[#059669]/10 text-white py-3 mt-auto">
          <div className="flex animate-marquee whitespace-nowrap gap-12 items-center w-max">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-12 items-center">
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Livestock</span>
                <span className="text-[#34d399] text-xs">●</span>
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Crops</span>
                <span className="text-[#34d399] text-xs">●</span>
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Sales</span>
                <span className="text-[#34d399] text-xs">●</span>
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Expenses</span>
                <span className="text-[#34d399] text-xs">●</span>
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Inventory</span>
                <span className="text-[#34d399] text-xs">●</span>
                <span className="font-mono text-xs tracking-widest uppercase opacity-80">Tasks</span>
                <span className="text-[#34d399] text-xs">●</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureStat({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className={`p-4 rounded-xl flex items-center gap-3 ${color}`}>
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium text-[#111b16]">{label}</span>
    </div>
  );
}