# 02 · Color tokens

The palette is split into **three layers**, all defined as CSS variables
in `app/globals.css` and exposed to Tailwind via the `@theme inline`
block (so JSX keeps using utilities like `bg-primary` / `text-foreground`
/ `border-border`).

1. **Brand scale** — a full 50–950 teal range.
2. **Semantic tokens** — shadcn/ui-style: `background`, `foreground`,
   `card`, `popover`, `primary`, `secondary`, `muted`, `accent`,
   `destructive`, `border`, `input`, `ring`. Inverted in `.dark`.
3. **Chart + status tokens** — fixed 7-slot chart palette and
   success / warning / info status trios, each with a base color, a
   soft-tint background, and a foreground that reads on the tint.

Light values live in `:root`; dark values live in `.dark` (toggled by
the `class` attribute on `<html>`, set by `next-themes`).

---

## 2.1 · Brand scale (teal)

| Token          | Light hex  | Dark hex | Use                                |
| -------------- | ---------- | -------- | ---------------------------------- |
| `--brand-50`   | `#ecfdf5`  | same     | Hover wash on light surfaces       |
| `--brand-100`  | `#d1fae5`  | same     | Soft badge backgrounds              |
| `--brand-500`  | `#10b981`  | same     | Focus rings, chart-1               |
| `--brand-600`  | `#059669`  | same     | Primary buttons, brand chrome      |
| `--brand-700`  | `#047857`  | same     | Primary hover, dark-mode primary bg|
| `--brand-800`  | `#065f46`  | same     | Accent-foreground (light)          |
| `--brand-900`  | `#064e3b`  | same     | Sidebar gradient stop (light)      |
| `--brand-950`  | `#022c22`  | same     | Dark mode primary foreground        |

The full scale is exposed as `bg-brand-{50..950}` /
`text-brand-{50..950}` / `border-brand-{…}`.

### Backwards-compat aliases

The old Tailwind-v3 config used `primary-{50,100,500,600,700}`. To keep
the 119 existing `bg-primary-*` / `text-primary-*` usages working
unchanged, those five are mapped onto the brand scale:

| Old class              | Resolves to       |
| ---------------------- | ----------------- |
| `bg-primary-50`        | `bg-brand-50`     |
| `bg-primary-100`       | `bg-brand-100`    |
| `bg-primary-500`       | `bg-brand-500`    |
| `bg-primary-600`       | `bg-brand-600`    |
| `bg-primary-700`       | `bg-brand-700`    |

Once the codebase is converted to the new names, drop this alias.

---

## 2.2 · Semantic tokens

| Tailwind class             | CSS var                | Light               | Dark                 | Use                       |
| -------------------------- | ---------------------- | ------------------- | -------------------- | ------------------------- |
| `bg-background`            | `--background`         | `#ffffff`           | `#020617`            | Page background           |
| `text-foreground`          | `--foreground`         | `#0f172a`           | `#f8fafc`            | Default body text         |
| `bg-card`                  | `--card`               | `#ffffff`           | `#0f172a`            | Card surface              |
| `text-card-foreground`     | `--card-foreground`    | `#0f172a`           | `#f8fafc`            | Card body text            |
| `bg-popover`               | `--popover`            | `#ffffff`           | `#0f172a`            | Popover / dropdown        |
| `text-popover-foreground`  | `--popover-foreground` | `#0f172a`           | `#f8fafc`            | Popover text              |
| `bg-primary`               | `--primary`            | `#059669` (b-600)   | `#10b981` (b-500)    | Brand chrome              |
| `text-primary-foreground`  | `--primary-foreground` | `#ffffff`           | `#022c22` (b-950)    | Text on primary           |
| `bg-secondary`             | `--secondary`          | `#f1f5f9`           | `#1e293b`            | Subtle surfaces           |
| `bg-muted`                 | `--muted`              | `#f1f5f9`           | `#1e293b`            | Muted surface             |
| `text-muted-foreground`    | `--muted-foreground`   | `#64748b`           | `#94a3b8`            | Captions, helper text     |
| `bg-accent`                | `--accent`             | `#ecfdf5`           | `rgba(16,185,129,.15)`| Hover / active accent     |
| `text-accent-foreground`   | `--accent-foreground`  | `#065f46`           | `#6ee7b7`            | Text on accent            |
| `bg-destructive`           | `--destructive`        | `#ef4444`           | `#b91c1c`            | Errors, destructive       |
| `text-destructive-foreground` | `--destructive-foreground` | `#ffffff` | `#fecaca`       | Text on destructive       |
| `border-border`            | `--border`             | `#e2e8f0`           | `#1e293b`            | 1 px borders              |
| `border-input`             | `--input`              | `#e2e8f0`           | `#1e293b`            | Form input borders        |
| `ring-ring`                | `--ring`               | `#10b981` (b-500)   | `#34d399` (b-400)    | Focus ring                |

> All dark-mode values are tuned to clear **WCAG AA 4.5:1** against
> their paired background.

---

## 2.3 · Sidebar tokens

| Token                       | Light     | Dark      | Use                              |
| --------------------------- | --------- | --------- | -------------------------------- |
| `--sidebar-from`            | `#064e3b` | `#020617` | Gradient start (top)             |
| `--sidebar-to`              | `#134e4a` | `#0f172a` | Gradient end   (bottom)          |
| `--sidebar-foreground`      | `#ffffff` | `#f8fafc` | Text on the gradient             |
| `--sidebar-muted`           | `#a7f3d0` | `#94a3b8` | Subdued text (e.g. "Sync" label) |
| `--sidebar-accent`          | `#ffffff` | `#1e293b` | Active link background           |
| `--sidebar-accent-fg`       | `#064e3b` | `#f8fafc` | Active link text                 |
| `--sidebar-border`          | `rgba(255,255,255,.10)` | `rgba(255,255,255,.08)` | Dividers, focus ring |

Reached via `bg-sidebar-gradient` (custom utility) and
`text-sidebar-foreground` / `text-sidebar-muted` / `border-sidebar-border`.

---

## 2.4 · Chart / KPI palette

7 fixed slots, used by Recharts and the dashboard KPI cards.

| Slot       | Light hex  | Dark hex   | Used for                  |
| ---------- | ---------- | ---------- | ------------------------- |
| `chart-1`  | `#0d9488`  | `#2dd4bf`  | Teal — primary brand      |
| `chart-2`  | `#7c3aed`  | `#a78bfa`  | Purple — revenue          |
| `chart-3`  | `#f97316`  | `#fb923c`  | Orange — expenses         |
| `chart-4`  | `#2563eb`  | `#60a5fa`  | Blue — livestock          |
| `chart-5`  | `#eab308`  | `#facc15`  | Yellow — tasks            |
| `chart-6`  | `#16a34a`  | `#4ade80`  | Green — profit            |
| `chart-7`  | `#ef4444`  | `#f87171`  | Red — alerts              |

Use via `text-chart-N`, `fill-chart-N`, `stroke-chart-N`, or the CSS
var directly in Recharts (`<Area stroke="var(--chart-1)" />`).

---

## 2.5 · Status trio (success / warning / info)

Each status exposes a **base** color, a **soft** tint suitable for
badge backgrounds, and a **foreground** that reads on the soft tint.

| Token trio            | Base       | Soft                 | Foreground  |
| --------------------- | ---------- | -------------------- | ----------- |
| `success` / `success-soft` / `success-fg` | `#16a34a` | `#dcfce7`            | `#166534`   |
| `warning` / `warning-soft` / `warning-fg` | `#f59e0b` | `#fef3c7`            | `#92400e`   |
| `info`    / `info-soft`    / `info-fg`    | `#2563eb` | `#dbeafe`            | `#1e40af`   |

In dark mode the soft and foreground swap to rgba/light variants so the
text still clears 4.5:1 on the tinted background.

Reached via `bg-success-soft` / `text-success-fg` etc.

---

## 2.6 · Where the tokens come from

All three layers are declared as plain CSS variables in
`app/globals.css`:

```css
:root {
  --brand-600: #059669;
  --background: #ffffff;
  --primary: var(--brand-600);
  /* … */
}

.dark {
  --background: #020617;
  --primary: var(--brand-500);
  /* … */
}

@theme inline {
  --color-background: var(--background);
  --color-primary:    var(--primary);
  /* … */
}
```

`@theme inline` is Tailwind 4's "expose this CSS variable as a utility"
syntax — `--color-X` becomes `bg-X`, `text-X`, `border-X`, `ring-X`,
etc. The `inline` keyword tells Tailwind to keep the values as `var(…)`
references instead of inlining the literal, so dark-mode switches
automatically when the `.dark` class lands on `<html>`.
