import { PageHeader } from "@/components/shared/PageHeader";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences."
      />
      <div className="space-y-3">
        {[
          { href: "/settings/profile", label: "Profile", desc: "Your name and password" },
          { href: "/settings/white-label", label: "Brand Settings", desc: "Logo, brand name, accent color" },
          { href: "/settings/alerts", label: "Alert Settings", desc: "Thresholds and notification channels" },
          { href: "/settings/team", label: "Team", desc: "Invite and manage team members" },
        ].map(({ href, label, desc }) => (
          <a
            key={href}
            href={href}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-muted-foreground/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <span className="text-muted-foreground text-sm">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
