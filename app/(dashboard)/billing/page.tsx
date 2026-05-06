import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Billing"
        description="Manage your plan, usage, and invoices."
      />
      <EmptyState
        icon={<CreditCard size={20} />}
        title="Billing coming soon"
        description="View your plan, upgrade, and manage invoices."
      />
    </div>
  );
}
