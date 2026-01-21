import { cn } from "@/lib/utils"; // Assuming you have a clsx/tailwind-merge utility, otherwise remove 'cn'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/80 ${className}`}
      {...props}
    />
  );
}
