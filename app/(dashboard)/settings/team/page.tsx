import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Team"
        description="Invite and manage team members."
      />
      <EmptyState
        icon={<Users size={20} />}
        title="Team management coming soon"
        description="Available on Premium and Agency+ plans."
      />
    </div>
  );
}
