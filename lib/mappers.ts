import type { Site, Audit, PillarScores, PluginData, Plugin } from "@/types";

// ── Raw shapes returned by the backend ───────────────────────────────────────

export interface RawSite {
  id: string;
  agency_id: string;
  client_id?: string;
  url: string;
  name?: string;
  site_token: string;
  plugin_connected: boolean;
  uptime_status?: "up" | "down" | "unknown";
  wp_version?: string;
  php_version?: string;
  plugin_version?: string;
  active_plugins?: RawPlugin[];
  active_plugins_count?: number;
  active_theme?: string;
  woocommerce_active?: boolean;
  audit_schedule?: string;
  last_audit_at?: string;
  created_at: string;
  updated_at?: string;
  // Security fields
  xml_rpc_enabled?: boolean;
  file_editor_enabled?: boolean;
  wp_debug_enabled?: boolean;
  server_software?: string;
  plugins_needing_updates?: number;
  plugins_update_list?: string[];
  // Joined from latest audit
  performance_score?: number | null;
  seo_score?: number | null;
  accessibility_score?: number | null;
  security_score?: number | null;
  malware_score?: number | null;
  overall_score?: number | null;
  // Joined from latest scan
  is_clean?: boolean | null;
  threats?: unknown;
}

export interface RawAudit {
  id: string;
  site_id: string;
  agency_id: string;
  status: "pending" | "running" | "completed" | "failed";
  performance_score?: number | null;
  seo_score?: number | null;
  accessibility_score?: number | null;
  security_score?: number | null;
  malware_score?: number | null;
  overall_score?: number | null;
  performance_data?: unknown;
  seo_data?: unknown;
  security_data?: unknown;
  ai_narrative?: string;
  ai_recommendations?: unknown;
  triggered_by?: string;
  created_at: string;
  completed_at?: string;
}

interface RawPlugin {
  name?: string;
  plugin?: string;
  version?: string;
  active?: boolean;
  [key: string]: unknown;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapScores(raw: RawSite | RawAudit): PillarScores | undefined {
  if (
    raw.performance_score == null &&
    raw.seo_score == null &&
    raw.security_score == null &&
    raw.malware_score == null
  ) {
    return undefined;
  }
  return {
    performance: raw.performance_score ?? 0,
    seo: raw.seo_score ?? 0,
    security: raw.security_score ?? 0,
    malware: raw.malware_score ?? 100,
  };
}

function mapPlugins(raw?: RawPlugin[]): Plugin[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name || p.plugin || "Unknown plugin",
    version: String(p.version || ""),
    status: p.active !== false ? "active" : "inactive",
    update_available: false,
  }));
}

export function mapSite(raw: RawSite): Site {
  const updateSet = new Set<string>(raw.plugins_update_list ?? []);

  const plugins = mapPlugins(raw.active_plugins).map((p) => ({
    ...p,
    update_available: updateSet.has(p.name),
  }));

  const pluginData: PluginData | undefined = raw.plugin_connected
    ? {
        wp_version: raw.wp_version,
        php_version: raw.php_version,
        active_plugins_count: raw.active_plugins_count,
        server_software: raw.server_software,
        xmlrpc_enabled: raw.xml_rpc_enabled,
        file_editor_enabled: raw.file_editor_enabled,
        debug_mode: raw.wp_debug_enabled,
        plugins,
        last_sync: raw.updated_at,
      }
    : undefined;

  return {
    id: raw.id,
    agency_id: raw.agency_id,
    client_id: raw.client_id ?? null,
    name: raw.name || raw.url,
    url: raw.url,
    site_token: raw.site_token,
    plugin_connected: raw.plugin_connected ?? false,
    uptime_status: (raw.uptime_status as Site["uptime_status"]) ?? "unknown",
    scan_schedule:
      (raw.audit_schedule as Site["scan_schedule"]) || "manual",
    last_audit_at: raw.last_audit_at ?? undefined,
    created_at: raw.created_at,
    latest_scores: mapScores(raw),
    malware_status:
      raw.malware_score != null
        ? raw.malware_score >= 80 ? "clean" : "threat"
        : raw.is_clean === true
        ? "clean"
        : raw.is_clean === false
        ? "threat"
        : undefined,
    plugin_data: pluginData,
  };
}

export function mapAudit(raw: RawAudit): Audit {
  return {
    id: raw.id,
    site_id: raw.site_id,
    status: raw.status,
    audit_type: raw.triggered_by === "manual" ? "manual" : "scheduled",
    scores: mapScores(raw),
    overall_score: raw.overall_score ?? undefined,
    created_at: raw.created_at,
    completed_at: raw.completed_at,
  };
}
