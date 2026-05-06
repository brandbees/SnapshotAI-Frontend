import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bell } from "lucide-react";

export default function AlertsSettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Alert Settings"
        description="Configure score thresholds and notification channels per site."
      />
      <EmptyState
        icon={<Bell size={20} />}
        title="Alert settings coming soon"
        description="Set thresholds for performance, SEO, security alerts and malware notifications."
      />
    </div>
  );
}
