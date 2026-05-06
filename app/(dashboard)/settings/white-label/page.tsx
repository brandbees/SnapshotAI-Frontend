import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Palette } from "lucide-react";

export default function WhiteLabelPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Brand Settings"
        description="Customise how your reports look to clients."
      />
      <EmptyState
        icon={<Palette size={20} />}
        title="White-label settings coming soon"
        description="Upload your logo, set brand colors, and customize PDF covers."
      />
    </div>
  );
}
