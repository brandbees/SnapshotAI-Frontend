"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import type { Agency, Site } from "@/types";

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  hrefLabel?: string;
}

interface OnboardingChecklistProps {
  agency: Agency;
  sites: Site[];
}

function buildItems(agency: Agency, sites: Site[]): ChecklistItem[] {
  const hasPlugin   = sites.some((s) => s.plugin_connected);
  const hasBranding = !!(agency.logo_url || agency.brand_name);
  const hasSchedule = sites.some((s) => s.scan_schedule !== "manual");

  return [
    {
      id: "add_site",
      label: "Add your first site",
      done: sites.length > 0,
      href: "/sites",
      hrefLabel: "Go to Sites",
    },
    {
      id: "install_plugin",
      label: "Connect the WordPress plugin",
      done: hasPlugin,
      href: "/connect",
      hrefLabel: "Connect plugin",
    },
    {
      id: "white_label",
      label: "Set up white-label branding",
      done: hasBranding,
      href: "/settings/white-label",
      hrefLabel: "Open branding settings",
    },
    {
      id: "add_client",
      label: "Add a client",
      done: false, // resolved async below
      href: "/clients",
      hrefLabel: "Go to Clients",
    },
    {
      id: "schedule_report",
      label: "Schedule a report",
      done: hasSchedule,
      href: sites[0] ? `/sites/${sites[0].id}` : "/sites",
      hrefLabel: "Open site settings",
    },
    {
      id: "invite_team",
      label: "Invite a team member",
      done: false, // resolved async below
      href: "/settings/team",
      hrefLabel: "Manage team",
    },
  ];
}

export function OnboardingChecklist({ agency, sites }: OnboardingChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(() => buildItems(agency, sites));
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Check if agency is < 30 days old
  const isNew = (() => {
    if (!agency.created_at) return true;
    const age = Date.now() - new Date(agency.created_at).getTime();
    return age < 30 * 24 * 3600 * 1000;
  })();

  // Resolve async items (clients, team members)
  useEffect(() => {
    async function fetchAsyncState() {
      try {
        const [clientsRes, teamRes] = await Promise.all([
          api.get<{ clients: unknown[] } | unknown[]>("/clients"),
          api.get<{ members: unknown[] } | unknown[]>("/team"),
        ]);

        const clients = Array.isArray(clientsRes.data)
          ? clientsRes.data
          : (clientsRes.data as { clients: unknown[] }).clients ?? [];
        const members = Array.isArray(teamRes.data)
          ? teamRes.data
          : (teamRes.data as { members: unknown[] }).members ?? [];

        setItems((prev) =>
          prev.map((item) => {
            if (item.id === "add_client") return { ...item, done: clients.length > 0 };
            if (item.id === "invite_team") return { ...item, done: members.length > 1 };
            return item;
          })
        );
      } catch {
        // non-critical — leave defaults
      }
    }
    fetchAsyncState();
  }, []);

  // Rebuild sync items when sites/agency changes
  useEffect(() => {
    setItems((prev) => {
      const next = buildItems(agency, sites);
      // preserve async-resolved values
      return next.map((item) => {
        const existing = prev.find((p) => p.id === item.id);
        if (item.id === "add_client" || item.id === "invite_team") {
          return existing ?? item;
        }
        return item;
      });
    });
  }, [agency, sites]);

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  // Persist dismissal in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bbss_checklist_dismissed");
    if (stored === "true") setDismissed(true);
  }, []);

  function dismiss() {
    localStorage.setItem("bbss_checklist_dismissed", "true");
    setDismissed(true);
  }

  if (!isNew || dismissed || allDone) return null;

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Getting started</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doneCount} of {total} steps complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <button
            onClick={dismiss}
            title="Dismiss"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-border divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-5 py-3"
            >
              {item.done ? (
                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-300 shrink-0" />
              )}
              <span
                className={
                  "text-sm flex-1 " +
                  (item.done ? "text-muted-foreground line-through" : "text-foreground")
                }
              >
                {item.label}
              </span>
              {!item.done && item.href && (
                <Link
                  href={item.href}
                  className="text-xs font-medium shrink-0"
                  style={{ color: "var(--accent)" }}
                >
                  {item.hrefLabel}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
