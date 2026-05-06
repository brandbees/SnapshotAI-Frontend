import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Clients"
        description="Manage your client relationships and site assignments."
      />
      <EmptyState
        icon={<Users size={20} />}
        title="Client management coming soon"
        description="This feature will let you group sites by client and send branded reports."
      />
    </div>
  );
}
