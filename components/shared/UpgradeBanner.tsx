import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

interface UpgradeBannerProps {
  message: string;
  compact?: boolean;
}

export function UpgradeBanner({ message, compact = false }: UpgradeBannerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm">
        <Lock size={13} className="text-amber-600 shrink-0" />
        <span className="text-amber-800 flex-1">{message}</span>
        <Link
          href="/billing"
          className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 shrink-0"
        >
          Upgrade <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
      <div className="flex items-center gap-2">
        <Lock size={14} className="text-amber-600" />
        <span className="text-sm text-amber-800">{message}</span>
      </div>
      <Link
        href="/billing"
        className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900"
      >
        Upgrade plan <ArrowRight size={13} />
      </Link>
    </div>
  );
}
