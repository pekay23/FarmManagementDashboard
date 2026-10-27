# 07 · Icons & illustrations

## Icon set — Lucide

Every icon in the app comes from [Lucide](https://lucide.dev) (via
`lucide-react@1.x`). Lucide was chosen because:

- It's a **tree-shakeable** ESM package — only the icons you import
  ship in the bundle.
- The stroke style is consistent at 1.5 px and matches Inter's tone.
- All icons are **SVG** (no emoji, no icon fonts), which keeps them
  crisp at any DPI and accessible to screen readers.

### Import convention

```tsx
import {
  Sprout, Tractor, Beef, Package, Users, ClipboardList,
  TrendingDown, DollarSign, BarChart3, Settings, Home,
  LayoutDashboard, Shield, LogOut, Menu, X
} from "lucide-react";
```

Group all imports for a single file in one statement, sorted
alphabetically, with a single multi-line format.

### Sizing

Icons use one of five size classes. Don't pass arbitrary px values.

| Tailwind class | Px  | Used for                                    |
| -------------- | --- | ------------------------------------------- |
| `w-3 h-3`      | 12  | Inline indicators next to small text        |
| `w-3.5 h-3.5`  | 14  | Inline indicators next to body text         |
| `w-4 h-4`      | 16  | Button icons, table-row actions            |
| `w-5 h-5`      | 20  | Sidebar nav items, modal headers            |
| `w-6 h-6`      | 24  | KPI card icon tiles                         |

### Colour

Icons inherit `currentColor`, so colour them by setting the text colour
on the parent:

```tsx
<button className="text-muted-foreground hover:text-foreground">
  <Pencil className="w-4 h-4" />
</button>
```

For coloured status icons (e.g. a red trash button) set the colour
explicitly via the wrapper:

```tsx
<button className="text-gray-500 hover:text-destructive">
  <Trash2 className="w-4 h-4" />
</button>
```

## The farm logo

`public/logo.png` is the default logo. The sidebar can use a logo supplied by the active branding settings, and PDF-related screens fetch the default image when no user logo is available. Check the relevant component before changing a logo asset.

## Illustrations

The app has **no decorative illustrations**. Empty states use a single
faded Lucide icon (e.g. `<Sprout className="w-12 h-12 mb-2 opacity-20" />`)
plus a one-line description — this keeps the bundle small and the
"feel" consistent across the app.

If you ever need richer illustrations, prefer a **single monochrome
SVG per concept** (sized at 1.5 px stroke to match Lucide) in a
muted `text-muted-foreground` so it doesn't fight the data.
