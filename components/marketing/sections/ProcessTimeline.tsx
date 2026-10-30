"use client";

const PROCESS = [
  { phase: "01 · Set up", title: "Add your farm", desc: "Create your farm profile, add plots, and record your livestock and crops in minutes." },
  { phase: "02 · Log daily", title: "Work in the field", desc: "Record sales, expenses, animal events, and task completions from your phone — even without signal." },
  { phase: "03 · Sync", title: "Data stays safe", desc: "Everything syncs automatically when you&rsquo;re back online. Nothing is ever lost." },
  { phase: "04 · Review", title: "See the big picture", desc: "Open the portal dashboard to see profit per plot, stock levels, and upcoming tasks at a glance." },
];

export function ProcessTimeline() {
  return (
    <section className="fm-marketing fm-section">
      <div className="fm-container">
        <div className="fm-sec-head">
          <span className="fm-eyebrow">How it works</span>
          <h2 className="fm-display-xl">From first login to <em>full control</em>.</h2>
        </div>

        <div className="space-y-0">
          {PROCESS.map((step, i) => (
            <div key={step.phase} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-24 py-8 border-t border-[#2c3e32]/14 last:border-b border-[#2c3e32]/14">
              <div className="lg:col-span-2 flex items-baseline gap-2">
                <span className="fm-eyebrow text-[#667568]">{step.phase}</span>
              </div>
              <div className="lg:col-span-10">
                <h3 className="fm-display-lg mb-2 leading-tight text-[#111b16]">{step.title}</h3>
                <p className="fm-lede">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}