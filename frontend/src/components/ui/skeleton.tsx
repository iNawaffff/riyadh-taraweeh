import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer ? "skeleton-shimmer" : "animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
