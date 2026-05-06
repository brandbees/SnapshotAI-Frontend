import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </span>
          <input
            ref={ref}
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.05)]",
              className
            )}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg",
          "text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          "shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.05)]",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
