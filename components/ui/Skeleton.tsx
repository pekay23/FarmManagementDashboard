import { cn } from "@/lib/utils";

/**
 * Premium skeleton loader with a subtle shimmer animation.
 * Use `variant` to pick common shapes; pass className for custom sizing.
 *
 * Examples:
 *   <Skeleton variant="text" className="w-48" />
 *   <Skeleton variant="circle" className="w-12 h-12" />
 *   <Skeleton variant="card" />
 */

type SkeletonVariant = "text" | "title" | "circle" | "rect" | "card" | "avatar";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** How many identical lines to render (useful for text skeletons). */
  lines?: number;
}

const BASE =
  "relative isolate overflow-hidden rounded bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent dark:before:via-white/5";

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded",
  title: "h-6 w-3/4 rounded",
  circle: "h-10 w-10 rounded-full",
  rect: "h-24 w-full rounded-xl",
  card: "h-40 w-full rounded-xl",
  avatar: "h-9 w-9 rounded-lg",
};

export function Skeleton({ variant = "rect", className, lines = 1, ...props }: SkeletonProps) {
  const cls = cn(BASE, VARIANT_CLASSES[variant], className);

  if (lines > 1) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cls}
            style={{ width: i === lines - 1 ? "60%" : undefined }}
            {...props}
          />
        ))}
      </div>
    );
  }

  return <div className={cls} {...props} />;
}

/**
 * A pre-composed skeleton that mirrors a typical stat / KPI card.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="avatar" />
      </div>
      <Skeleton variant="title" className="w-20" />
      <Skeleton variant="text" className="w-32" />
    </div>
  );
}

/**
 * A skeleton row for table-style loading states.
 */
export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              variant="text"
              className={c === 0 ? "w-12 shrink-0" : "flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
