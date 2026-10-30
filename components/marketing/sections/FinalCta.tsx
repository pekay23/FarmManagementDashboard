"use client";

import Link from "next/link";

export function FinalCta() {
  return (
    <section className="fm-marketing fm-cta-band">
      <div className="fm-container">
        <h2 className="text-[#111b16]">Ready to run your farm from one place?</h2>
        <div className="fm-cta-row justify-center mt-8">
          <Link href="/portal" className="fm-btn fm-btn-filled">
            Open the Portal <span className="arrow">→</span>
          </Link>
          <Link href="#contact" className="fm-btn fm-btn-outline">
            Talk to Us <span className="arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}