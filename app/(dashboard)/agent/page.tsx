import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Bot } from "lucide-react";

export default function AgentPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="AI Assistant"
        description="Chat with your site data using natural language."
      />
      <EmptyState
        icon={<Bot size={20} />}
        title="AI Agent coming soon"
        description="Ask questions like 'Which site has the lowest SEO score?' or 'Run an audit on all sites'."
      />
    </div>
  );
}
