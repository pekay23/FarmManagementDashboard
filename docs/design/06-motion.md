# 06 · Motion

The app uses motion sparingly — it should *confirm* an action, not
*preattentively* attract the eye. Most transitions are 150–300 ms with
the default `ease-in-out` curve.

## Durations

| Class                  | ms   | Use                                              |
| ---------------------- | ---- | ------------------------------------------------ |
| `duration-150`         | 150  | Color/background hovers (buttons, links)         |
| `duration-200`         | 200  | Default for most transitions (sidebar slide)     |
| `duration-300`         | 300  | Larger layout shifts (modal in, card flip)       |

## Easing

`ease-in-out` (Tailwind default) for almost everything. The sidebar
slide uses `transition-transform duration-300` with no explicit easing
(inherits `ease-in-out`).

## Common patterns

### Card hover

```tsx
<div className="transition-shadow hover:shadow-md cursor-pointer">
```

### Sidebar slide (mobile)

```tsx
<aside className={`
  transition-transform duration-300
  ${isOpen ? "translate-x-0" : "-translate-x-full"}
  md:translate-x-0
`}>
```

### Modal in

```tsx
<div className="animate-in fade-in zoom-in-95 duration-200">
```

(Provided by the `tailwindcss-animate` plugin, which `next-pwa` already
pulls in transitively in older versions; if not present, add it to
`package.json`.)

### KPI card lift

```tsx
<div className="hover:-translate-y-1 transition-transform cursor-default">
```

## Reduced-motion

`app/globals.css` has a global guard:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

So any user with the OS-level "reduce motion" setting gets a
near-instant transition experience without per-component effort.
