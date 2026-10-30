import Link from "next/link";
import { MarketingNav } from "@/components/marketing/layouts/MarketingNav";
import { MarketingFooter } from "@/components/marketing/layouts/MarketingFooter";
import { MarketingHero } from "@/components/marketing/sections/Hero";
import { ServiceStrip } from "@/components/marketing/sections/ServiceStrip";
import { SplitFeature } from "@/components/marketing/sections/SplitFeature";
import { StatStrip } from "@/components/marketing/sections/StatStrip";
import { ProcessTimeline } from "@/components/marketing/sections/ProcessTimeline";
import { FinalCta } from "@/components/marketing/sections/FinalCta";

export const metadata = {
  title: "FarmOps — Farm Management Software",
  description:
    "Run your farm from one place. Track livestock, crops, sales, expenses, inventory, and tasks — online or off. Built for farmers who want clarity, not complexity.",
};

const featureBlocks = [
  {
    eyebrow: "Livestock",
    title: "Track every animal, from birth to market.",
    body: "Record movements, health events, breeding, and sales. Full traceability means you always know where each animal is and what it&rsquo;s worth.",
    image: { src: "/logo.png", alt: "Livestock tracking in the FarmOps portal" },
    points: [
      "Animal movement logging",
      "Health and breeding records",
      "Sales traceability",
      "Offline-ready field entry",
    ],
    reverse: false,
  },
  {
    eyebrow: "Crops",
    title: "Plan plantings, track growth, log harvests.",
    body: "Manage crops plot by plot through the season. Record expected harvest dates, yields, and field notes in one place.",
    image: { src: "/logo.png", alt: "Crop management dashboard" },
    points: [
      "Planting and growth tracking",
      "Harvest date planning",
      "Yield recording per plot",
      "Seasonal crop calendar",
    ],
    reverse: true,
  },
  {
    eyebrow: "Finance",
    title: "See profit per plot, not just in the bank.",
    body: "Log every sale and expense. The platform calculates profitability by plot so you know which parts of the farm are actually making money.",
    image: { src: "/logo.png", alt: "Sales and expense tracking" },
    points: [
      "Sale and expense entry",
      "Profit per plot analysis",
      "Cash flow visibility",
      "Tax-ready records",
    ],
    reverse: false,
  },
];

export default function MarketingPage() {
  return (
    <div className="site-shell">
      <MarketingNav />

      <main id="main-content">
        <MarketingHero />

        <section id="features" className="fm-marketing fm-section">
          <div className="fm-container">
            <ServiceStrip />
          </div>
        </section>

        {featureBlocks.map((block, i) => (
          <SplitFeature
            key={block.eyebrow}
            eyebrow={block.eyebrow}
            title={block.title}
            body={block.body}
            image={block.image}
            points={block.points}
            reverse={block.reverse}
            screenLabel={block.eyebrow.toLowerCase()}
            ctaLabel="Open the portal"
            ctaHref="/portal"
          />
        ))}

        <StatStrip />

        <ProcessTimeline />

        <FinalCta />
      </main>

      <MarketingFooter />
    </div>
  );
}