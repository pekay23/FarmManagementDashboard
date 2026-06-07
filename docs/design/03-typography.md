# 03 · Typography

The whole app uses **Inter** as its single typeface. It's loaded via
`next/font/google` in `app/layout.tsx` and exposed as the CSS variable
`--font-inter`, which is wired into `--font-sans` in `globals.css`.

## Font load

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

<body className={`${inter.variable} ${inter.className} …`}>
```

`next/font` self-hosts the woff2 files at build time, so there is no
runtime FOUT and no Google Fonts request from the browser.

## Scale

| Role               | px  | line-height | weight          | Tailwind class                                | Used for                          |
| ------------------ | --- | ----------- | --------------- | --------------------------------------------- | --------------------------------- |
| Display (h1)       | 30  | 1.2         | 700 (bold)      | `text-2xl font-bold` / `text-3xl font-bold`   | Page titles, KPI numbers          |
| Heading (h2)       | 20  | 1.3         | 700             | `text-xl font-bold` / `text-lg font-bold`     | Card titles, modal titles         |
| Subheading (h3)    | 16  | 1.4         | 600 (semibold)  | `text-base font-semibold`                     | Section headers, column headers   |
| Body / paragraph   | 14  | 1.5         | 400             | `text-sm`                                     | Most body copy                    |
| Caption / label    | 12  | 1.4         | 500 (medium)    | `text-xs font-medium`                         | Helper text, status badges        |
| Numeric (KPI)      | 30  | 1.1         | 700             | `text-3xl font-bold tabular-nums`            | Currency amounts                  |

> Inter's tabular-nums is enabled on the dashboard's KPI cards
> (`<h3 className="text-3xl font-bold">`) so currency columns line up
> neatly.

## Usage conventions

- **One weight step per hierarchy level** — don't jump from
  `font-normal` to `font-extrabold`; stick to `font-medium`,
  `font-semibold`, `font-bold`.
- **Headings stay left-aligned**, never centred, never right-aligned.
  Centred text is reserved for empty-states.
- **Truncate with `truncate`** (Tailwind) on text that's allowed to be
  clipped — adds `overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap;`. Used in tables and nav items.
- **Use `text-muted-foreground`** for anything that's *not* the
  primary content of the surface (timestamps, helper text, secondary
  metadata).

## Font-family fallback

`--font-sans` (used everywhere via the `body` element) is:

```css
--font-sans: var(--font-inter), ui-sans-serif, system-ui,
  -apple-system, "Segoe UI", sans-serif;
```

So if Inter ever fails to load (e.g. a serverless build with no
network), the platform sans-serif takes over instead of the user
seeing Times New Roman.
