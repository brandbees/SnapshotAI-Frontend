"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
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
  const isIndividual = agency.account_type === "individual";

  const items: ChecklistItem[] = [
    {
      id: "add_site",
      label: isIndividual ? "Add your site" : "Add your first site",
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
  ];

  if (!isIndividual) {
    items.push(
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
        done: false,
        href: "/clients",
        hrefLabel: "Go to Clients",
      }
    );
  }

  items.push({
    id: "schedule_report",
    label: "Schedule a report",
    done: hasSchedule,
    href: sites[0] ? `/sites/${sites[0].id}` : "/sites",
    hrefLabel: "Open site settings",
  });

  if (!isIndividual) {
    items.push({
      id: "invite_team",
      label: "Invite a team member",
      done: false,
      href: "/settings/team",
      hrefLabel: "Manage team",
    });
  }

  return items;
}

export function OnboardingChecklist({ agency, sites }: OnboardingChecklistProps) {
  const [items, setItems]       = useState<ChecklistItem[]>(() => buildItems(agency, sites));
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // start collapsed

  const isNew = (() => {
    if (!agency.created_at) return true;
    const age = Date.now() - new Date(agency.created_at).getTime();
    return age < 30 * 24 * 3600 * 1000;
  })();

  // Resolve async items (clients, team members)
  useEffect(() => {
    const isIndividual = agency.account_type === "individual";
    if (isIndividual) return;

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
        // non-critical
      }
    }
    fetchAsyncState();
  }, [agency.account_type]);

  // Rebuild sync items when sites/agency changes
  useEffect(() => {
    setItems((prev) => {
      const next = buildItems(agency, sites);
      return next.map((item) => {
        const existing = prev.find((p) => p.id === item.id);
        if (item.id === "add_client" || item.id === "invite_team") return existing ?? item;
        return item;
      });
    });
  }, [agency, sites]);

  // Load persisted state — must run after mount (localStorage unavailable on server)
  useEffect(() => {
    if (localStorage.getItem("bbss_checklist_dismissed") === "true") setDismissed(true);
    // Only un-collapse if the user explicitly expanded it before
    if (localStorage.getItem("bbss_checklist_collapsed") === "false") setCollapsed(false);
  }, []);

  const doneCount = items.filter((i) => i.done).length;
  const total     = items.length;
  const pct       = Math.round((doneCount / total) * 100);
  const allDone   = doneCount === total;

  function dismiss(e: React.MouseEvent) {
    e.stopPropagation();
    localStorage.setItem("bbss_checklist_dismissed", "true");
    setDismissed(true);
  }

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("bbss_checklist_collapsed", String(next));
  }

  if (!isNew || dismissed || allDone) return null;

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Compact header — always visible, click to expand/collapse */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <ListChecks size={15} className="shrink-0" style={{ color: "var(--accent)" }} />
        <p className="text-sm font-semibold text-foreground">Getting started</p>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{doneCount}/{total} complete</span>
        {/* Inline progress bar */}
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[140px]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <span
            onClick={dismiss}
            title="Dismiss permanently"
            className="p-1 rounded-lg text-muted-foreground hover:bg-gray-200 hover:text-foreground transition-colors"
          >
            <X size={13} />
          </span>
          <span className="text-muted-foreground">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
        </div>
      </button>

      {/* Expandable checklist */}
      {!collapsed && (
        <div className="border-t border-border divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              {item.done ? (
                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-300 shrink-0" />
              )}
              <span className={"text-sm flex-1 " + (item.done ? "text-muted-foreground line-through" : "text-foreground")}>
                {item.label}
              </span>
              {!item.done && item.href && (
                <Link
                  href={item.href}
                  className="text-xs font-medium shrink-0 hover:underline"
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
