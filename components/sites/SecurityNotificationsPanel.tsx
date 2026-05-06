"use client";

import { useState } from "react";
import { Mail, Edit2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface SecurityNotificationsPanelProps {
  siteId: string;
  defaultEmail?: string;
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn("toggle", on && "on")}
    />
  );
}

export function SecurityNotificationsPanel({
  defaultEmail = "",
}: SecurityNotificationsPanelProps) {
  const [perfAlerts, setPerfAlerts] = useState(true);
  const [malwareAlerts, setMalwareAlerts] = useState(true);
  const [email, setEmail] = useState(defaultEmail);
  const [editEmail, setEditEmail] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Notifications</CardTitle>
      </CardHeader>

      <div className="space-y-4">
        {/* Performance drops */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Performance Drops
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Alert when score falls &lt; 90
            </p>
          </div>
          <Toggle on={perfAlerts} onChange={setPerfAlerts} />
        </div>

        {/* Malware alerts */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">
              Malware Alerts
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Critical security SMS alerts
            </p>
          </div>
          <Toggle on={malwareAlerts} onChange={setMalwareAlerts} />
        </div>

        {/* Monitoring email */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground mb-2">
            Monitoring Recipient
          </p>
          {editEmail ? (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="admin@site.com"
              />
              <button
                onClick={() => setEditEmail(false)}
                className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg"
                style={{ background: "var(--accent)" }}
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-muted rounded-lg border border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={12} className="text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">
                  {email || "No email set"}
                </span>
              </div>
              <button
                onClick={() => setEditEmail(true)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <Edit2 size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
