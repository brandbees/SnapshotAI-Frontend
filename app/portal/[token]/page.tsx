import { EmptyState } from "@/components/shared/EmptyState";
import { FileText } from "lucide-react";

export default function PortalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <EmptyState
        icon={<FileText size={20} />}
        title="Client portal"
        description="This portal will display the branded audit report for your client."
      />
    </div>
  );
}
