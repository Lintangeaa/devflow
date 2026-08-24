import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        priorityLow: "bg-priority-low-bg text-priority-low",
        priorityMedium: "bg-priority-medium-bg text-priority-medium",
        priorityHigh: "bg-priority-high-bg text-priority-high",
        priorityCritical: "bg-priority-critical-bg text-priority-critical",
        severityMinor: "bg-severity-minor-bg text-severity-minor",
        severityMajor: "bg-severity-major-bg text-severity-major",
        severityBlocker: "bg-severity-blocker-bg text-severity-blocker",
        severityCrash: "bg-severity-crash-bg text-severity-crash",
        typeTask: "bg-type-task-bg text-type-task",
        typeBug: "bg-type-bug-bg text-type-bug",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const PRIORITY_VARIANT: Record<string, BadgeProps["variant"]> = {
  low: "priorityLow",
  medium: "priorityMedium",
  high: "priorityHigh",
  critical: "priorityCritical",
};

const SEVERITY_VARIANT: Record<string, BadgeProps["variant"]> = {
  minor: "severityMinor",
  major: "severityMajor",
  blocker: "severityBlocker",
  crash: "severityCrash",
};

const TYPE_VARIANT: Record<string, BadgeProps["variant"]> = {
  task: "typeTask",
  bug: "typeBug",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority] ?? "neutral"} className={className}>
      {priority}
    </Badge>
  );
}

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <Badge variant={SEVERITY_VARIANT[severity] ?? "neutral"} className={className}>
      {severity}
    </Badge>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <Badge variant={TYPE_VARIANT[type] ?? "neutral"} className={className}>
      {type}
    </Badge>
  );
}
