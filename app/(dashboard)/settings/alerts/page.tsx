"use client";

import { useState, useEffect } from "react";
import { Check, AlertCircle, X, Lock, Mail, Webhook } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSites } from "@/hooks/useSites";
import api from "@/lib/api";
import type { AlertSettings } from "@/types";

type Channel = "email" | "slack";

export default function AlertsSettingsPage() {
  const { roleCanDo, loading: roleLoading } = useRole();
  const { sites, loading: sitesLoading } = useSites();

  if (!roleLoading && !roleCanDo("manage_alerts")) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Lock size={22} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Alert settings can only be changed by admins and the account owner.
          </p>
        </div>
      </div>
    );
  }
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [thresholds, setThresholds] = useState({ performance: 70, seo: 70, security: 70 });
  const [channel, setChannel] = useState<Channel>("email");
  const [alertEmail, setAlertEmail] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Default to first site
  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  // Load settings when site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    setLoading(true);
    api.get<AlertSettings>(`/alerts/${selectedSiteId}`)
      .then(({ data }) => {
        setThresholds({
          performance: data.performance_threshold ?? 70,
          seo: data.seo_threshold ?? 70,
          security: data.security_threshold ?? 70,
        });
        setChannel(data.channel ?? "email");
        setAlertEmail(data.alert_email ?? "");
        setSlackWebhook(data.slack_webhook_url ?? "");
      })
      .catch(() => {
        // No saved settings yet — keep defaults
      })
      .finally(() => setLoading(false));
  }, [selectedSiteId]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      await api.put<AlertSettings>(`/alerts/${selectedSiteId}`, {
        performance_threshold: thresholds.performance,
        seo_threshold: thresholds.seo,
        security_threshold: thresholds.security,
        malware_alerts: true,
        channel,
        alert_email: channel === "email" ? alertEmail : undefined,
        slack_webhook_url: channel === "slack" ? slackWebhook : undefined,
      });
      showToast("success", "Alert settings saved.");
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Alert Settings"
        description="Configure score thresholds and notification channels per site."
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Site selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Site</CardTitle>
          </CardHeader>
          {sitesLoading ? (
            <div className="h-9 bg-muted animate-pulse rounded-lg" />
          ) : (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          )}
          {selectedSite && (
            <p className="text-xs text-muted-foreground mt-2">{selectedSite.url}</p>
          )}
        </Card>

        {/* Threshold sliders */}
        <Card>
          <CardHeader>
            <CardTitle>Score Thresholds</CardTitle>
          </CardHeader>
          <p className="text-xs text-muted-foreground mb-4">
            You will be alerted when a pillar score drops below the set threshold.
          </p>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
            </div>
          ) : (
            <div className="space-y-5">
              <ThresholdSlider
                label="Performance"
                value={thresholds.performance}
                onChange={(v) => setThresholds((t) => ({ ...t, performance: v }))}
              />
              <ThresholdSlider
                label="SEO"
                value={thresholds.seo}
                onChange={(v) => setThresholds((t) => ({ ...t, seo: v }))}
              />
              <ThresholdSlider
                label="Security"
                value={thresholds.security}
                onChange={(v) => setThresholds((t) => ({ ...t, security: v }))}
              />

              {/* Malware — always on */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Malware</span>
                    <Lock size={12} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Always alerted — cannot be disabled</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-5 rounded-full bg-emerald-500 relative cursor-not-allowed opacity-75">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">On</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Notification channel */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Channel</CardTitle>
          </CardHeader>

          {/* Channel tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg mb-4">
            {(["email", "slack"] as Channel[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  channel === ch
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ch === "email" ? <Mail size={12} /> : <Webhook size={12} />}
                {ch === "email" ? "Email" : "Slack"}
              </button>
            ))}
          </div>

          {channel === "email" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alert Email Address</label>
              <Input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="alerts@youragency.com"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Alert emails are sent within 5 minutes of a threshold breach.
              </p>
            </div>
          )}

          {channel === "slack" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Slack Webhook URL</label>
              <Input
                type="url"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Create an Incoming Webhook in your Slack workspace and paste the URL above.
              </p>
            </div>
          )}
        </Card>

        <Button onClick={save} loading={saving} disabled={!selectedSiteId} className="w-full">
          Save Alert Settings
        </Button>
      </div>
    </div>
  );
}

interface ThresholdSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function ThresholdSlider({ label, value, onChange }: ThresholdSliderProps) {
  const color = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgb(229 231 235) ${value}%, rgb(229 231 235) 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>0</span>
        <span>Alert when score drops below {value}</span>
        <span>100</span>
      </div>
    </div>
  );
}
