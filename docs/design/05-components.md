# 05 · Components

A reference for the recurring UI pieces in the app. Hand-rolled where
shadcn would have been overkill, shadcn-style primitives where it
makes sense (`Skeleton` lives in `components/ui/Skeleton.tsx`).

## Buttons

Three variants. Always use the right one for the action's importance.

| Variant       | Class                                                              | Use                                       |
| ------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| **Primary**   | `bg-primary-600 hover:bg-primary-700 text-white`                   | Save, Submit, Create, Sign in             |
| **Secondary** | `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`   | Cancel, Back, secondary action in a form  |
| **Destructive** | `bg-red-600 hover:bg-red-700 text-white`                         | Delete, Remove (in the confirm modal)     |
| **Ghost**     | `text-gray-500 hover:bg-gray-100`                                  | Icon buttons in tables (pencil, trash)    |

Common attrs:

- `font-medium` (or `font-bold` for primary)
- `rounded-lg`
- `py-2.5 px-4` for full-size, `py-2 px-3` for compact, `p-2` for icon-only
- `cursor-pointer`
- `transition-colors` (150 ms)

## Cards

```tsx
<div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm">
  …
</div>
```

- Background: `bg-card` (not `bg-white`) so dark mode flips automatically.
- Border: 1 px, `border-border`.
- Shadow: `shadow-sm` at rest, `shadow-md` on hover if the card is also
  a clickable surface.
- Radius: `rounded-xl` (12 px).

## KPI card (dashboard)

A special card with a coloured icon tile on the right. The colour comes
from the `chart-N` palette.

```tsx
<div className="bg-card border border-border rounded-xl p-6 shadow-sm flex justify-between items-start">
  <div>
    <p className="text-sm text-muted-foreground">{title}</p>
    <h3 className="text-3xl font-bold text-foreground">{value}</h3>
  </div>
  <div className="p-3 rounded-lg bg-brand-100 text-brand-700">
    <Icon className="w-6 h-6" />
  </div>
</div>
```

## Modals

A `Modal` helper lives next to each feature page (e.g.
`crops/page.tsx` defines its own at the bottom of the file). Standard
markup:

```tsx
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
  <div className="bg-card rounded-xl w-full max-w-md p-6 shadow-2xl">
    <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <button onClick={onClose}><X className="text-muted-foreground" /></button>
    </div>
    {children}
  </div>
</div>
```

Rules:

- Always `bg-card`, never `bg-white`.
- `max-h-[90vh] overflow-y-auto` for tall forms.
- Backdrop tap closes the modal; the inner card stops propagation.
- Confirm-delete variant uses a single `AlertTriangle` icon in a red
  circle, plus Cancel + Delete buttons (destructive style).

## Forms

Inputs all share the same shape:

```tsx
<input
  type="text"
  required
  placeholder="…"
  className="w-full border border-input bg-background text-foreground p-3 rounded-lg
             outline-none focus:border-ring focus:ring-1 focus:ring-ring
             placeholder:text-muted-foreground"
/>
```

- **Focus ring**: `focus:border-ring focus:ring-1 focus:ring-ring` —
  uses the theme ring token, so dark mode automatically uses
  `brand-400` for the ring.
- **Error state**: add `border-destructive` and pair with a
  `text-destructive text-sm` helper below the input.
- **Select** uses the same chrome plus `bg-card` to differentiate from
  text inputs.

## Toasts

Hand off to **Sonner**. Usage in handlers:

```tsx
import { toast } from "sonner";

toast.success("Crop updated");
toast.error("Failed to save");
toast.loading("Syncing…");
```

A single `<Toaster position="top-right" richColors />` is mounted in
`app/layout.tsx` and styled by Sonner's own dark-mode integration
(which reads the `class` on `<html>` that `next-themes` sets).

## Tables

Most list pages use card-rows rather than literal `<table>`s (better
on mobile). When a real table is needed (PDF exports, reports) the
columns are `text-left`, the header is `text-xs font-bold uppercase
tracking-wide text-muted-foreground`, and the rows alternate
`bg-card` / `bg-muted/50`.

## Status badges

Use the status trio tokens:

```tsx
<span className="px-2 py-1 rounded-md text-xs font-bold bg-success-soft text-success-fg">
  Active
</span>
```

| Status    | Class combo                                         |
| --------- | --------------------------------------------------- |
| Success   | `bg-success-soft text-success-fg`                   |
| Warning   | `bg-warning-soft text-warning-fg`                   |
| Info      | `bg-info-soft text-info-fg`                         |
| Danger    | `bg-destructive/10 text-destructive`                |
