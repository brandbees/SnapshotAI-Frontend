import { cn } from "@/lib/utils";

interface UptimeBadgeProps {
  status: "up" | "down" | "unknown";
  percentage?: number;
  className?: string;
}

export function UptimeBadge({ status, percentage, className }: UptimeBadgeProps) {
  const isUp = status === "up";
  const isDown = status === "down";

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          isUp && "bg-green-500",
          isDown && "bg-red-500",
          !isUp && !isDown && "bg-muted-foreground/50"
        )}
        style={isUp ? { boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" } : undefined}
      />
      <span
        className={cn(
          isUp && "text-green-700",
          isDown && "text-red-700",
          !isUp && !isDown && "text-muted-foreground"
        )}
      >
        {isUp
          ? percentage !== undefined
            ? `Uptime: ${percentage}%`
            : "Online"
          : isDown
          ? "Down"
          : "Unknown"}
      </span>
    </span>
  );
}
