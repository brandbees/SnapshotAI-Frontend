import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Reports"
        description="Generate and send PDF reports to clients."
      />
      <EmptyState
        icon={<FileText size={20} />}
        title="Reports coming soon"
        description="Select a site to generate a branded PDF report."
      />
    </div>
  );
}
