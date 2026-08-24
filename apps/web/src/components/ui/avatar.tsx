import { cn } from "@/lib/cn";

const PALETTE = [
  "bg-priority-medium-bg text-priority-medium",
  "bg-severity-major-bg text-severity-major",
  "bg-type-bug-bg text-type-bug",
  "bg-priority-high-bg text-priority-high",
  "bg-type-task-bg text-type-task",
  "bg-severity-blocker-bg text-severity-blocker",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: "sm" | "md";
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  const colorClass = PALETTE[hashSeed(name) % PALETTE.length];
  const dimension = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        dimension,
        colorClass,
        className,
      )}
      title={name}
      {...props}
    >
      {initials(name)}
    </span>
  );
}
