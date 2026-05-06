import { cn, scoreBgTailwind } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  className?: string;
}

export function ScoreBadge({ score, label, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
        scoreBgTailwind(score),
        className
      )}
    >
      {label && (
        <span className="font-normal text-inherit opacity-60 text-[10px]">
          {label}
        </span>
      )}
      {score}
    </span>
  );
}
