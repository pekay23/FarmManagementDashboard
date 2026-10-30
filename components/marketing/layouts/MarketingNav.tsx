"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, Sprout } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/portal", label: "Portal" },
];

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector(".fm-nav");
      if (nav) {
        if (window.scrollY > 20) {
          nav.classList.add("scrolled");
        } else {
          nav.classList.remove("scrolled");
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fm-nav fixed inset-0 0 auto z-60 flex items-center justify-between px-8 py-6 transition-all duration-300">
      <div className="relative z-20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#059669] flex items-center justify-center">
          <Sprout className="w-5 h-5 text-white" />
        </div>
        <Link href="/" className="fm-display-sm font-semibold tracking-tight text-[#111b16]">
          FarmOps
        </Link>
      </div>

      <div className="hidden lg:flex items-center gap-8 text-[#667568] font-mono text-xs uppercase tracking-widest">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-[#059669] transition-colors"
          >
            {link.label}
          </Link>
        ))}
        <Link href="/portal" className="fm-btn fm-btn-outline">Open the Portal</Link>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden p-2 rounded-lg hover:bg-[#eef4ec] text-[#111b16]"
        aria-label="Open menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#059669]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-8 text-white lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="text-3xl font-light tracking-tight hover:text-[#34d399] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/portal"
            onClick={() => setIsOpen(false)}
            className="fm-btn fm-btn-filled"
          >
            Open the Portal
          </Link>
        </div>
      )}
    </nav>
  );
}