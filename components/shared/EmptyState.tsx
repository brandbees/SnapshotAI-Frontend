"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { IconChip } from "@/components/ui/IconChip";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Use the brand gradient chip instead of the flat neutral one — for primary empty states. */
  tone?: "neutral" | "brand";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      {icon && (
        <IconChip tone={tone === "brand" ? "brand" : "neutral"} size="lg" className="mb-4">
          {icon}
        </IconChip>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          {description}
        </p>
      )}
      {action}
    </motion.div>
  );
}
