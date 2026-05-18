"use client";

import Link from "next/link";
import {
  User, Palette, Bell, Users, ChevronRight,
  Globe, Mail, Shield, Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Role badge styling ─────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  owner:   { bg: "#7c3aed15", text: "#7c3aed" },
  admin:   { bg: "#2563eb15", text: "#2563eb" },
  manager: { bg: "#16a34a15", text: "#16a34a" },
  analyst: { bg: "#71717a15", text: "#52525b" },
};

// ── Quick-info pill ────────────────────────────────────────────────────────────

function InfoPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/40 rounded-xl min-w-0">
      <Icon size={13} className="text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate capitalize">{value}</p>
      </div>
    </div>
  );
}

// ── Settings section card ──────────────────────────────────────────────────────

interface SectionCardProps {
  href: string;
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  badge: string;
  preview: React.ReactNode;
}

function SectionCard({ href, icon: Icon, color, title, description, badge, preview }: SectionCardProps) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-200 overflow-hidden group block">
      <div className="h-1" style={{ background: `${color}50` }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}15` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${color}12`, color }}>
            {badge}
          </span>
        </div>

        <p className="font-bold text-sm text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border">
          <div className="text-xs text-muted-foreground truncate max-w-[180px]">{preview}</div>
          <ChevronRight size={14}
            className="text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { agency } = useAuth();
  const { role }   = useRole();

  const brandColor   = agency?.accent_color ?? "#6366f1";
  const displayName  = agency?.member_name ?? agency?.name ?? "";
  const roleColors   = ROLE_COLOR[role ?? "analyst"] ?? ROLE_COLOR.analyst;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-1">Account</p>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your profile, branding, notifications and team.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-white shadow-xs"
          style={{ color: brandColor }}>
          <Sparkles size={12} />
          <span className="capitalize">{agency?.plan ?? "Free"} plan</span>
        </div>
      </div>

      {/* ── Profile hero card ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Gradient banner */}
        <div className="h-20 w-full relative"
          style={{ background: `linear-gradient(135deg, ${brandColor}25 0%, ${brandColor}08 100%)` }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${brandColor} 0%, transparent 60%)` }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-9 mb-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-sm shrink-0"
              style={{ background: brandColor }}>
              {initials(displayName || "?")}
            </div>

            <div className="pb-1 flex-1 min-w-0">
              <p className="text-base font-bold text-foreground leading-tight truncate">
                {displayName || "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{agency?.email}</p>
            </div>

            <div className="pb-1 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                style={{ background: roleColors.bg, color: roleColors.text }}>
                {role ?? "analyst"}
              </span>
            </div>
          </div>

          {/* Info strip */}
          <div className="grid grid-cols-3 gap-3">
            <InfoPill icon={Globe}   label="Plan"   value={agency?.plan ?? "free"} />
            <InfoPill icon={Palette} label="Brand"  value={agency?.brand_name ?? agency?.name ?? "—"} />
            <InfoPill icon={Mail}    label="Email"  value={agency?.email ?? "—"} />
          </div>
        </div>
      </div>

      {/* ── Section cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard
          href="/settings/profile"
          icon={User}
          color="#6366f1"
          title="Profile"
          description="Update your display name and change your account password"
          badge="Account"
          preview={
            <span className="flex items-center gap-1.5">
              <Shield size={11} />
              {agency?.email ?? "—"}
            </span>
          }
        />

        <SectionCard
          href="/settings/white-label"
          icon={Palette}
          color="#ec4899"
          title="Brand Settings"
          description="Customise your logo, brand name, tagline and portal accent color"
          badge="White-label"
          preview={
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0 inline-block ring-1 ring-border"
                style={{ background: brandColor }} />
              {agency?.brand_name ?? agency?.name ?? "—"}
            </span>
          }
        />

        <SectionCard
          href="/settings/alerts"
          icon={Bell}
          color="#f97316"
          title="Alert Settings"
          description="Configure score thresholds and notification channels per site"
          badge="Notifications"
          preview="Email · Slack webhooks"
        />

        <SectionCard
          href="/settings/team"
          icon={Users}
          color="#14b8a6"
          title="Team"
          description="Invite colleagues and assign roles to control access levels"
          badge="Collaboration"
          preview="Invite · Manage · Permissions"
        />
      </div>
    </div>
  );
}
