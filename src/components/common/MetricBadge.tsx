import * as React from "react"
import { cn } from "@/lib/utils"

export interface MetricBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: "normal" | "warning" | "critical"
  icon?: React.ReactNode
  label: string
  value: string | number
}

export function MetricBadge({
  status = "normal",
  icon,
  label,
  value,
  className,
  ...props
}: MetricBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
        {
          "border-surface bg-surface text-foreground": status === "normal",
          "border-accent/50 bg-accent/20 text-accent": status === "warning",
          "border-danger/50 bg-danger/20 text-danger": status === "critical",
        },
        className
      )}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
