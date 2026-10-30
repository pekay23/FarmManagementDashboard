"use client";

import Link from "next/link";
import { Sprout, Users, DollarSign, TrendingDown, Activity, Building } from "lucide-react";

interface SplitFeatureProps {
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
  image: { src: string; alt: string };
  points?: string[];
  reverse?: boolean;
  screenLabel?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function SplitFeature({
  eyebrow,
  title,
  body,
  image,
  points,
  reverse = false,
  screenLabel,
  ctaLabel = "Open the portal",
  ctaHref = "/portal",
}: SplitFeatureProps) {
  const icons: Record<string, React.ElementType> = {
    Sprout, Users, DollarSign, TrendingDown, Activity, Building,
  };

  return (
    <section
      className="fm-marketing fm-section relative"
      data-screen-label={screenLabel}
    >
      <div className="fm-container">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-24 items-start">
          {/* Image column */}
          <div
            className={`relative z-0 lg:col-span-5 lg:sticky lg:top-32 ${reverse ? "lg:order-2" : "lg:order-1"}`}
          >
            <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl shadow-xl bg-[#eef4ec]">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-2000 hover:scale-105"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          {/* Content column */}
          <div
            className={`relative z-10 flex flex-col gap-8 bg-inherit pt-2 ${reverse ? "lg:order-1" : "lg:order-2"} lg:col-span-7 lg:gap-10 lg:pt-0`}
          >
            <div className="flex flex-col gap-6">
              {eyebrow && (
                <span className="fm-eyebrow">{eyebrow}</span>
              )}
              <h2 className="fm-display-lg mb-2 leading-tight text-[#111b16]">{title}</h2>
              {body && (
                <p className="fm-lede mb-6">{body}</p>
              )}

              {points && points.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {points.map((p, i) => {
                    const Icon = icons[p.split(" ")[0]] || Sprout;
                    return (
                      <div
                        key={p}
                        className="p-6 rounded-2xl border border-[#2c3e32]/14 bg-[#eef4ec]/50 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#059669] text-white flex items-center justify-center mb-4 font-mono text-sm">
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="text-[#111b16] font-medium m-0">{p}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {ctaLabel && ctaHref && (
                <div className="pt-8">
                  <Link href={ctaHref} className="fm-btn fm-btn-filled">
                    {ctaLabel} <span className="arrow">→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}