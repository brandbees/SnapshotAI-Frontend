import { Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Plugin } from "@/types";

interface PluginStatusPanelProps {
  plugins?: Plugin[];
  isConnected: boolean;
  lastSync?: string;
}

const statusConfig = {
  active: { label: "ACTIVE", className: "bg-green-50 text-green-700 border border-green-200" },
  inactive: { label: "INACTIVE", className: "bg-muted text-muted-foreground border border-border" },
};

export function PluginStatusPanel({
  plugins = [],
  isConnected,
  lastSync,
}: PluginStatusPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plugin Status</CardTitle>
        <span
          className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`}
          style={isConnected ? { boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" } : undefined}
        />
      </CardHeader>

      {plugins.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Package size={20} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No plugin data yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {plugins.map((plugin, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  <Package size={13} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {plugin.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    v{plugin.version}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {plugin.update_available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle size={9} />
                    UPDATE
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusConfig[plugin.status].className}`}
                  >
                    {plugin.status === "active" && <CheckCircle2 size={9} />}
                    {statusConfig[plugin.status].label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lastSync && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Last sync: {lastSync}
        </p>
      )}
    </Card>
  );
}
