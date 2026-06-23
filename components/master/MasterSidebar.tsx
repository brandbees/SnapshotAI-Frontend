"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Globe,
  ListChecks,
  DollarSign,
  Tag,
  Settings,
  Shield,
  Users,
  Activity,
  HeartPulse,
  ShieldAlert,
  Lock,
  LinkIcon,
  MonitorCheck,
  BarChart2,
  Clock,
  FileText,
  Mail,
  Megaphone,
  Download,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasterPlatform } from "@/context/MasterPlatformContext";
import { getMasterRole } from "@/lib/masterAuth";

// Roles: super_admin > admin > support
// minRole: the minimum role required to see this item
const navGroups = [
  {
    label: "Control",
    items: [
      { href: "/master/dashboard",       label: "Dashboard",       icon: LayoutDashboard, minRole: "support"     },
      { href: "/master/agencies",        label: "Agencies",        icon: Building2,       minRole: "support"     },
      { href: "/master/sites",           label: "Sites",           icon: Globe,           minRole: "support"     },
      { href: "/master/queue",           label: "Queue",           icon: ListChecks,      minRole: "admin"       },
      { href: "/master/revenue",         label: "Revenue",         icon: DollarSign,      minRole: "admin"       },
      { href: "/master/trials",          label: "Trials",          icon: Clock,           minRole: "admin"       },
      { href: "/master/insights",        label: "Audit Insights",  icon: BarChart2,       minRole: "support"     },
      { href: "/master/reports",         label: "Reports",         icon: FileText,        minRole: "support"     },
      { href: "/master/coupons",         label: "Coupons",         icon: Tag,             minRole: "admin"       },
      { href: "/master/email-blast",     label: "Email Blast",     icon: Mail,            minRole: "admin"       },
      { href: "/master/announcements",   label: "Announcements",   icon: Megaphone,       minRole: "admin"       },
      { href: "/master/pages",           label: "Pages (CMS)",     icon: Layers,          minRole: "admin"       },
      { href: "/master/export",          label: "Export Center",   icon: Download,        minRole: "super_admin" },
    ],
  },
  {
    label: "Monitor",
    items: [
      { href: "/master/uptime",          label: "Uptime",          icon: MonitorCheck,    minRole: "support"     },
      { href: "/master/ssl",             label: "SSL / Domains",   icon: Lock,            minRole: "support"     },
      { href: "/master/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert,     minRole: "support"     },
      { href: "/master/broken-links",    label: "Broken Links",    icon: LinkIcon,        minRole: "support"     },
      { href: "/master/activity",        label: "Activity Log",    icon: Activity,        minRole: "admin"       },
      { href: "/master/health",          label: "System Health",   icon: HeartPulse,      minRole: "admin"       },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/master/users",           label: "Users",           icon: Users,           minRole: "super_admin" },
      { href: "/master/settings",        label: "Settings",        icon: Settings,        minRole: "admin"       },
    ],
  },
];

const ROLE_RANK: Record<string, number> = { support: 1, admin: 2, super_admin: 3 };

function canSee(itemMinRole: string, userRole: string): boolean {
  return (ROLE_RANK[userRole] ?? 3) >= (ROLE_RANK[itemMinRole] ?? 1);
}

const AMBER    = "#f59e0b";
const AMBER_BG = "rgba(245,158,11,0.08)";

export function MasterSidebar() {
  const pathname  = usePathname();
  const { platform } = useMasterPlatform();
  const [masterRole, setMasterRole] = useState("");

  useEffect(() => { setMasterRole(getMasterRole()); }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        {platform.logoUrl ? (
          <img
            src={platform.logoUrl}
            alt="logo"
            className="h-9 max-w-[140px] object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: AMBER }}
            >
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">{platform.name}</p>
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: AMBER }}>Master Panel</p>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 pb-4 overflow-y-auto space-y-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(i => canSee(i.minRole, masterRole));
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {visibleItems.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      !active && "text-muted-foreground hover:text-foreground hover:bg-gray-50"
                    )}
                    style={active ? { background: AMBER_BG, color: AMBER } : undefined}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>
    </aside>
  );
}
