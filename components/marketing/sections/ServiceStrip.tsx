import { Sprout, Users, DollarSign, TrendingDown, Package, Calendar } from "lucide-react";

const services = [
  {
    id: "livestock",
    href: "/portal",
    title: "Livestock Tracking",
    text: "Record animal movements, health events, breeding, and sales — with full traceability from birth to market.",
    icon: Users,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "crops",
    href: "/portal",
    title: "Crop Management",
    text: "Plan plantings, track growth stages, log harvests, and monitor yields plot by plot across the season.",
    icon: Sprout,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "finance",
    href: "/portal",
    title: "Sales & Expenses",
    text: "Log every sale and expense, calculate profit per plot, and see your farm&rsquo;s financial health at a glance.",
    icon: DollarSign,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "inventory",
    href: "/portal",
    title: "Inventory Control",
    text: "Track feed, seed, fertilizer, and equipment stock. Get low-stock alerts before you run out.",
    icon: Package,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "tasks",
    href: "/portal",
    title: "Task & Work Orders",
    text: "Assign jobs to staff, set due dates, and track completion — nothing falls through the cracks.",
    icon: Calendar,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "offline",
    href: "/portal",
    title: "Offline-First",
    text: "Works in the field with no signal. All data syncs automatically when you&rsquo;re back online.",
    icon: TrendingDown,
    color: "bg-[#ecfdf5] text-[#059669]",
  },
];

export function ServiceStrip() {
  return (
    <section className="fm-marketing fm-section relative border-t border-[#2c3e32]/14 border-b border-[#2c3e32]/14 bg-[#f7f9f4]">
      <div className="fm-container">
        <div className="relative z-10 bg-[#f7f9f4] pt-12 pb-4">
          <p className="fm-eyebrow">Six ways the platform works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {services.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="group relative h-full flex-col overflow-hidden bg-white transition-all duration-500 lg:border lg:p-[clamp(24px,3vw,40px)] last:border-0 hover:border-[#059669]/40 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex min-h-[64px] items-center mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
              </div>

              <h3 className="fm-display-md mb-2 leading-tight">{item.title}</h3>

              <p className="mb-8 max-w-[34ch] text-sm leading-relaxed text-[#667568]">
                {item.text}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-[#2c3e32]/07 pt-4 font-mono text-[10px] uppercase tracking-widest text-[#667568]">
                <span>Open the portal →</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}