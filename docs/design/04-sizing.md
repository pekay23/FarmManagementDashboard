# 04 · Sizing & spacing

Tailwind 4 ships a 4-px base spacing scale by default. The whole app
stays on it (no custom `theme.extend.spacing`) so a `gap-4` on one
page is the same visual step as a `gap-4` on another.

## Spacing scale (4-px base)

| Token       | px  | Used for                                            |
| ----------- | --- | --------------------------------------------------- |
| `0.5` / `1` | 4   | Icon-to-label, hairline gaps                        |
| `2`         | 8   | Tight form field gaps                               |
| `3`         | 12  | Input padding-y, button padding-x                   |
| `4`         | 16  | **Default** page padding, card padding              |
| `6`         | 24  | Section padding, card-to-card                       |
| `8`         | 32  | Page section breaks                                 |
| `10`        | 40  | KPI card vertical padding                           |
| `12` / `16` | 48 / 64 | Hero / settings-page vertical padding          |

## Container widths

| Surface        | Max width        | Tailwind class                          |
| -------------- | ---------------- | --------------------------------------- |
| Page           | 1600 px          | `max-w-[1600px] mx-auto`                |
| Modal          | 448 px (`max-w-md`)| `max-w-md`                            |
| KPI card grid  | 3-up on desktop  | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6` |

## Breakpoints

Mobile-first, identical to Tailwind defaults:

| Token    | Min width | Notes                                            |
| -------- | --------- | ------------------------------------------------ |
| (base)   | 0         | Single column, hamburger sidebar                 |
| `sm`     | 640 px    | Tablet portrait — cards reflow to 2-up           |
| `md`     | 768 px    | **Sidebar becomes persistent** (`md:ml-64`)      |
| `lg`     | 1024 px   | Detail panels open alongside the list            |
| `xl`     | 1280 px   | KPI grid fills to 3-up                            |
| `2xl`    | 1536 px   | Page max-width kicks in at 1600 px                |

## Touch targets

Every interactive element is at minimum **44 × 44 px**:

- Buttons: `py-2.5` (40 px) on `text-sm`, `py-3` (48 px) on `text-base`.
- Icon buttons: `h-9 w-9` (36 px) for inline controls; for in-table
  row actions the whole row is the hit area.
- Form inputs: `p-3` (48-px tall) on every text input / select.

## Radii

| Class         | px  | Used for                            |
| ------------- | --- | ----------------------------------- |
| `rounded`     | 4   | Inline status pills (rare)          |
| `rounded-md`  | 6   | Form inputs                         |
| `rounded-lg`  | 8   | **Default** buttons, badges, inputs |
| `rounded-xl`  | 12  | Cards, modals, KPI tiles            |
| `rounded-full`| 9999| Avatars, status pills, the sync dot |

## Elevation

Three levels of shadow, all from Tailwind defaults:

| Class       | Use                                              |
| ----------- | ------------------------------------------------ |
| `shadow-sm` | **Default** for cards, list rows                 |
| `shadow-md` | Hover / pressed card                             |
| `shadow-lg` | Modals, popovers, the floating "Add" FAB         |
| `shadow-2xl`| Sidebar (it sits above page content)             |

## Z-index scale

| Layer                | z-index | Examples                              |
| -------------------- | ------- | ------------------------------------- |
| Sidebar (desktop)    | 40      | `z-40`                                |
| Backdrop / overlay   | 30      | `z-30` (mobile menu backdrop)         |
| Toast                | 50      | `z-50` (Sonner toasts)                |
| Modal                | 50      | `z-50` (confirm delete, form modals)  |
