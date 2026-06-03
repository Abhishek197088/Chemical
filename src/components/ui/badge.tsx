import * as React from "react";
import { cn } from "src/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "bg-primary text-primary-foreground": variant === "default",
          "bg-secondary text-secondary-foreground": variant === "secondary",
          "bg-destructive text-destructive-foreground": variant === "destructive",
          "text-foreground border border-input": variant === "outline",
          "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20": variant === "success",
          "bg-amber-500/10 text-amber-500 border border-amber-500/20": variant === "warning",
          "bg-sky-500/10 text-sky-500 border border-sky-500/20": variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
