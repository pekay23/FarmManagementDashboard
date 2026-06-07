# 01 · Foundations

> Brand voice, where every token lives, and a hex cheat-sheet for the
> rest of the design system. See `02-colors.md` through
> `07-icons-illustrations.md` for the deep references.

## Voice & visual language

- **Earth-toned, practical, mobile-first.** The product is built for
  farm owners and managers who may be using a tablet in a barn with
  one hand and a half-full cup of coffee in the other. Type is large,
  tap targets are at least 44×44 px, contrast clears WCAG AA.
- **Headings lean on weight, not size.** Inter handles hierarchy
  through `font-bold` / `font-semibold` rather than dramatic jumps in
  `font-size`. Cards use `rounded-xl` and `shadow-sm` rather than
  heavy borders to keep the surface calm.
- **One accent color does the work.** Brand teal (`brand-600`
  `#059669`) is the only saturated hue; everything else is either a
  neutral slate or a muted semantic state (`success`, `warning`, `info`,
  `destructive`).
- **Two backgrounds.** Light mode is paper-white (#ffffff) on slate-900
  ink; dark mode is slate-950 on slate-50. The sidebar stays in
  emerald/teal in both modes (it's a brand element, not a surface).

## Where every token comes from

| Concern               | File                                        |
| --------------------- | ------------------------------------------- |
| Colour + font CSS vars| `app/globals.css`                           |
| Tailwind 4 theme map  | `@theme inline { … }` block in `globals.css`|
| Base element defaults | `globals.css` (`html` / `body` / `*`)       |
| Font loading          | `app/layout.tsx` (next/font Inter)          |
| Dark-mode toggle      | `next-themes` via `components/ThemeProvider.tsx` |
| Theme toggle button   | `components/ThemeToggle.tsx` (in Sidebar)  |
| Sidebar gradient      | `.bg-sidebar-gradient` utility in `globals.css` |
| Logo                  | `lib/logo.ts` (base64-embedded SVG)         |

## Hex cheat-sheet

| Token                 | Hex       | Role                                     |
| --------------------- | --------- | ---------------------------------------- |
| `--brand-50`          | `#ecfdf5` | Brand surface (very light)               |
| `--brand-500`         | `#10b981` | Brand accent (focus rings, chart-1)      |
| `--brand-600`         | `#059669` | Primary buttons, brand chrome            |
| `--brand-700`         | `#047857` | Primary button hover                     |
| `--background` (light)| `#ffffff` | Page background                          |
| `--foreground` (light)| `#0f172a` | Default body text                        |
| `--background` (dark) | `#020617` | Page background                          |
| `--foreground` (dark) | `#f8fafc` | Default body text                        |
| `--muted-foreground`  | `#64748b` / `#94a3b8` (dark) | Captions, helper text   |
| `--border`            | `#e2e8f0` / `#1e293b` (dark) | 1 px borders             |
| `--destructive`       | `#ef4444` / `#b91c1c` (dark) | Errors, destructive      |
| `--sidebar-from`      | `#064e3b` | Sidebar gradient start (light)           |
| `--sidebar-to`        | `#134e4a` | Sidebar gradient end   (light)           |
| `--sidebar-from` (dark) | `#020617` | Sidebar gradient start (dark)          |
| `--sidebar-to`   (dark) | `#0f172a` | Sidebar gradient end   (dark)          |

## Three canonical "looks" coexist in the app

- **Dashboard / list pages** — white card on light page background,
  border + shadow. Brand-teal accent for active states.
- **Modal dialogs** — same card chrome as list pages, with a backdrop
  blur. Use the `Modal` helper inside each feature page (it lives next
  to the page that uses it, e.g. `crops/page.tsx`).
- **Sidebar** — full-height gradient (`emerald-900` → `teal-900` in
  light, `slate-950` → `slate-900` in dark), white text, no borders
  between nav items.

## Where to read next

- [02 · Colors](./02-colors.md) — every token, with HSL/hex, light + dark
- [03 · Typography](./03-typography.md) — Inter scale + line-heights
- [05 · Components](./05-components.md) — button, card, modal, form
