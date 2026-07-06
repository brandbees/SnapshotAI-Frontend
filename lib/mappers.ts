import type {
  Site, Audit, PillarScores, PluginData, Plugin,
  ScanResult, SeoData, PerformanceData, SecurityData, PluginOutdated,
  CronEvent, SiteHealth, WooFatalError, WooGateway,
} from "@/types";

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
  uptime_percentage?: number | null;
  avg_response_ms?: number | null;
  last_uptime_check_at?: string | null;
  // WP / server environment
  wp_version?: string;
  php_version?: string;
  plugin_version?: string;
  active_plugins?: RawPlugin[];
  active_plugins_count?: number;
  inactive_plugins?: RawPlugin[];
  inactive_plugins_count?: number;
  active_theme?: string;
  memory_limit?: string | null;
  mysql_version?: string | null;
  server_software?: string;
  database_size_mb?: number | null;
  php_max_execution_time?: number | null;
  // Scheduling
  audit_schedule?: string;
  last_audit_at?: string;
  created_at: string;
  updated_at?: string;
  // Security signals
  xml_rpc_enabled?: boolean | null;
  file_editor_enabled?: boolean | null;
  wp_debug_enabled?: boolean | null;
  login_url_default?: boolean | null;
  wp_config_writable?: boolean | null;
  htaccess_writable?: boolean | null;
  uploads_php_enabled?: boolean | null;
  ssl_expiry_date?: string | null;
  admin_users_count?: number | null;
  admin_usernames?: string[] | null;
  // Performance / caching
  caching_plugin?: string | null;
  cdn_plugin?: string | null;
  image_optimization_plugin?: string | null;
  object_cache_enabled?: boolean | null;
  // Plugin intelligence
  plugins_needing_updates?: number | null;
  plugins_update_list?: Array<{ name: string; current_version?: string; new_version?: string } | string>;
  plugins_outdated_12m?: unknown;
  // Cron events & site health
  cron_events?: unknown;
  site_health?: unknown;
  tags?: string[] | null;
  // Google Analytics & Search Console (Phase 5 Sprint 3)
  ga4_property_id?: string | null;
  sc_property_url?: string | null;
  google_connected?: boolean | null;
  // Safe Updates (Phase 4 Sprint 1)
  updates_enabled?: boolean | null;

  // Safe Updates (Phase 4 Sprint 2)
  update_window_day?: number | null;
  update_window_hour?: number | null;
  excluded_from_updates?: string[];
  // Content counts & DB health
  database_table_count?: number | null;
  autoloaded_options_kb?: number | null;
  transient_count?: number | null;
  post_revisions_count?: number | null;
  orphaned_post_meta_count?: number | null;
  total_posts?: number | null;
  total_pages?: number | null;
  total_media?: number | null;
  total_comments?: number | null;
  last_published_at?: string | null;
  // WooCommerce
  woocommerce_active?: boolean | null;
  woo_order_count?: number | null;
  woo_revenue?: number | null;
  woo_orders_7d?: number | null;
  woo_orders_30d?: number | null;
  woo_revenue_7d?: number | null;
  woo_revenue_30d?: number | null;
  woo_failed_orders?: number | null;
  woo_active_gateways?: WooGateway[] | null;
  woo_fatal_errors?: WooFatalError[] | null;
  // Joined from latest audit (GET /api/sites only)
  performance_score?: number | null;
  seo_score?: number | null;
  accessibility_score?: number | null;
  security_score?: number | null;
  malware_score?: number | null;
  overall_score?: number | null;
  // Joined from latest scan (GET /api/sites only)
  is_clean?: boolean | null;
  threats?: unknown;
  overall_threat_score?: number | null;
  plugin_vuln_count?: number | null;
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
  seo_data?: SeoData | null;
  performance_data?: PerformanceData | null;
  security_data?: SecurityData | null;
  ai_narrative?: string;
  ai_recommendations?: unknown;
  triggered_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface RawScan {
  id: string;
  site_id: string;
  agency_id?: string;
  is_clean: boolean;
  threats?: unknown;
  scanner_response?: unknown;
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

  // Derive malware display score from the dedicated malware scan.
  // Use overall_threat_score from scan_results lateral join — set only by dedicated
  // scans, never overwritten by the audit. sites.threat_score is NOT used here
  // because it can be stale (e.g. set from a scan before threats were resolved).
  // Scale: threat 0 = health 100 (clean), threat 54 = health 46 (high risk).
  const siteRaw     = raw as RawSite;
  const threatScore = siteRaw.overall_threat_score;
  const isClean     = siteRaw.is_clean;
  let malware: number;
  if (typeof threatScore === "number") {
    // Use threat score directly — 0 = clean, 100 = threat
    malware = threatScore;
  } else if (isClean === true) {
    // No dedicated scan score but audit/scan says clean
    malware = 100;
  } else if (isClean === false) {
    // Threats exist but no numeric score — treat as degraded
    malware = Math.min(raw.malware_score ?? 40, 40);
  } else {
    // No scan at all — fall back to audit malware score
    malware = raw.malware_score ?? 100;
  }

  return {
    performance: raw.performance_score ?? 0,
    seo: raw.seo_score ?? 0,
    security: raw.security_score ?? 0,
    malware,
  };
}

function mapPlugins(raw?: RawPlugin[]): Plugin[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    name: p.name || p.plugin || "Unknown plugin",
    slug: p.plugin ? p.plugin.split("/")[0] : (p.slug as string | undefined),
    version: String(p.version || ""),
    status: p.active !== false ? "active" : "inactive",
    update_available: false,
  }));
}

function parseJsonArray(val: unknown): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val as string[];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

function parseOutdated(val: unknown): PluginOutdated[] | null {
  if (!val) return null;
  const arr = Array.isArray(val) ? val : (() => {
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return null; } }
    return null;
  })();
  if (!Array.isArray(arr)) return null;
  return arr as PluginOutdated[];
}

export function mapSite(raw: RawSite): Site {
  const updateMap = new Map<string, string>();
  for (const item of raw.plugins_update_list ?? []) {
    if (typeof item === "string") {
      updateMap.set(item, "");
    } else if (item && typeof item === "object" && item.name) {
      updateMap.set(item.name, item.new_version ?? "");
    }
  }

  const activePlugins = mapPlugins(raw.active_plugins).map((p) => ({
    ...p,
    update_available: updateMap.has(p.name),
    new_version: updateMap.get(p.name) || undefined,
  }));

  const inactivePlugins = mapPlugins(raw.inactive_plugins ?? []).map((p) => ({
    ...p,
    status: "inactive" as const,
    update_available: updateMap.has(p.name),
    new_version: updateMap.get(p.name) || undefined,
  }));

  const plugins = [...activePlugins, ...inactivePlugins];

  const pluginData: PluginData | undefined = raw.plugin_connected
    ? {
        wp_version: raw.wp_version,
        php_version: raw.php_version,
        active_plugins_count: raw.active_plugins_count,
        inactive_plugins_count: raw.inactive_plugins_count,
        server_software: raw.server_software,
        xmlrpc_enabled: raw.xml_rpc_enabled ?? undefined,
        file_editor_enabled: raw.file_editor_enabled ?? undefined,
        debug_mode: raw.wp_debug_enabled ?? undefined,
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
    uptime_percentage: raw.uptime_percentage ?? undefined,
    avg_response_ms: raw.avg_response_ms ?? undefined,
    last_uptime_check_at: raw.last_uptime_check_at ?? null,
    scan_schedule: (raw.audit_schedule as Site["scan_schedule"]) || "manual",
    last_audit_at: raw.last_audit_at ?? undefined,
    created_at: raw.created_at,
    latest_scores: mapScores(raw),
    overall_score: raw.overall_score ?? undefined,
    overall_threat_score: raw.overall_threat_score ?? null,
    malware_status:
      // is_clean is set by the scanner and updated by the dismiss endpoint:
      //   true  = no active major threats (critical/high/medium all dismissed or absent)
      //   false = at least one active major threat remains
      // Check is_clean FIRST — a dismissed-all-majors site must show clean even if
      // overall_threat_score > 0 due to remaining low-priority findings.
      raw.is_clean === true
        ? "clean"
        : (raw.is_clean === false || (raw.overall_threat_score != null && raw.overall_threat_score > 0))
        ? "threat"
        : raw.malware_score != null
        ? (raw.malware_score >= 80 ? "clean" : "threat")
        : undefined,
    plugin_vuln_count: typeof raw.plugin_vuln_count === 'number' ? raw.plugin_vuln_count : undefined,
    plugin_data: pluginData,

    // Security signals (available on both list and detail endpoints)
    xml_rpc_enabled: raw.xml_rpc_enabled ?? null,
    file_editor_enabled: raw.file_editor_enabled ?? null,
    wp_debug_enabled: raw.wp_debug_enabled ?? null,
    login_url_default: raw.login_url_default ?? null,
    wp_config_writable: raw.wp_config_writable ?? null,
    htaccess_writable: raw.htaccess_writable ?? null,
    uploads_php_enabled: raw.uploads_php_enabled ?? null,
    ssl_expiry_date: raw.ssl_expiry_date ?? null,
    admin_users_count: raw.admin_users_count ?? null,
    admin_usernames: parseJsonArray(raw.admin_usernames),

    // Performance signals
    caching_plugin: raw.caching_plugin ?? null,
    cdn_plugin: raw.cdn_plugin ?? null,
    php_max_execution_time: raw.php_max_execution_time ?? null,
    memory_limit: raw.memory_limit ?? null,
    image_optimization_plugin: raw.image_optimization_plugin ?? null,
    object_cache_enabled: raw.object_cache_enabled ?? null,
    mysql_version: raw.mysql_version ?? null,
    database_size_mb: raw.database_size_mb ?? null,

    // WooCommerce
    woocommerce_active: raw.woocommerce_active ?? null,
    woo_order_count: raw.woo_order_count ?? null,
    woo_revenue: raw.woo_revenue ?? null,
    woo_orders_7d: raw.woo_orders_7d ?? null,
    woo_orders_30d: raw.woo_orders_30d ?? null,
    woo_revenue_7d: raw.woo_revenue_7d ?? null,
    woo_revenue_30d: raw.woo_revenue_30d ?? null,
    woo_failed_orders: raw.woo_failed_orders ?? null,
    woo_active_gateways: Array.isArray(raw.woo_active_gateways) ? (raw.woo_active_gateways as WooGateway[]) : null,
    woo_fatal_errors: Array.isArray(raw.woo_fatal_errors) ? (raw.woo_fatal_errors as WooFatalError[]) : null,

    // Plugin intelligence
    plugins_needing_updates: raw.plugins_needing_updates ?? null,
    plugins_outdated_12m: parseOutdated(raw.plugins_outdated_12m),

    // Content counts & DB health
    database_table_count: raw.database_table_count ?? null,
    autoloaded_options_kb: raw.autoloaded_options_kb ?? null,
    transient_count: raw.transient_count ?? null,
    post_revisions_count: raw.post_revisions_count ?? null,
    orphaned_post_meta_count: raw.orphaned_post_meta_count ?? null,
    total_posts: raw.total_posts ?? null,
    total_pages: raw.total_pages ?? null,
    total_media: raw.total_media ?? null,
    total_comments: raw.total_comments ?? null,
    last_published_at: raw.last_published_at ?? null,

    cron_events: Array.isArray(raw.cron_events)
      ? (raw.cron_events as CronEvent[])
      : typeof raw.cron_events === "string"
        ? (() => { try { return JSON.parse(raw.cron_events as string) as CronEvent[]; } catch { return null; } })()
        : null,

    site_health: raw.site_health && typeof raw.site_health === "object" && !Array.isArray(raw.site_health)
      ? (raw.site_health as SiteHealth)
      : typeof raw.site_health === "string"
        ? (() => { try { return JSON.parse(raw.site_health as string) as SiteHealth; } catch { return null; } })()
        : null,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : null,
    ga4_property_id: raw.ga4_property_id ?? null,
    sc_property_url: raw.sc_property_url ?? null,
    google_connected: raw.google_connected ?? false,
    updates_enabled: raw.updates_enabled ?? false,
    update_window_day:  raw.update_window_day  ?? null,
    update_window_hour: raw.update_window_hour ?? null,
    excluded_from_updates: Array.isArray(raw.excluded_from_updates) ? raw.excluded_from_updates : [],
  };
}

export function mapAudit(raw: RawAudit): Audit {
  const parseJson = <T>(v: unknown): T | undefined => {
    if (!v) return undefined;
    if (typeof v === "string") { try { return JSON.parse(v) as T; } catch { return undefined; } }
    return v as T;
  };

  return {
    id: raw.id,
    site_id: raw.site_id,
    status: raw.status,
    audit_type: raw.triggered_by === "manual" ? "manual" : "scheduled",
    scores: mapScores(raw),
    overall_score: raw.overall_score ?? undefined,
    seo_data: raw.seo_data ?? null,
    performance_data: raw.performance_data ?? null,
    security_data: raw.security_data ?? null,
    ai_narrative:      parseJson<Record<string, string>>(raw.ai_narrative),
    ai_recommendations: parseJson<import("@/types").Recommendation[]>(raw.ai_recommendations),
    created_at: raw.created_at,
    completed_at: raw.completed_at,
  };
}

export function mapScan(raw: RawScan): ScanResult {
  let threats: ScanResult["threats"] = null;
  let sources_used: string[] | null = null;

  if (raw.threats) {
    const parsed = (() => {
      if (typeof raw.threats === "string") {
        try { return JSON.parse(raw.threats); } catch { return null; }
      }
      return raw.threats;
    })();

    if (Array.isArray(parsed)) {
      threats = parsed as ScanResult["threats"];
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as { hits?: unknown; sources_used?: unknown };
      if (Array.isArray(obj.hits)) {
        threats = obj.hits as ScanResult["threats"];
      }
      if (Array.isArray(obj.sources_used)) {
        sources_used = obj.sources_used as string[];
      }
    }
  }

  return {
    id: raw.id,
    site_id: raw.site_id,
    is_clean: raw.is_clean ?? true,
    threats,
    sources_used,
    created_at: raw.created_at,
  };
}
