"use client";

const STATS = [
  { value: "100%+", label: "Farm visibility — every animal, plot, and task tracked" },
  { value: "0", label: "Data lost — works offline and syncs when you&rsquo;re back online" },
  { value: "24/7", label: "Access from any device, in the field or at the desk" },
  { value: "60s", label: "Setup time — add your first farm in under a minute" },
];

export function StatStrip() {
  return (
    <section className="fm-marketing fm-section bg-[#eef4ec]">
      <div className="fm-container">
        <div className="fm-stat-strip">
          {STATS.map((stat, i) => (
            <div key={i} className="fm-stat">
              <div className="fm-stat-value">{stat.value}</div>
              <div className="fm-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}