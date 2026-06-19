export type Plan = "free" | "freemium" | "premium" | "agency_plus";

export interface Agency {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  sites_count: number;
  sites_limit?: number;
  logo_url?: string;
  brand_name?: string;
  brand_tagline?: string;
  accent_color?: string;
  favicon_url?: string;
  trial_ends_at?: string | null;
  onboarding_complete?: boolean;
  created_at?: string;
  last_seen_changelog?: string | null;
  checklist_dismissed?: boolean;
  role?: TeamRole;
  member_id?: string;
  member_name?: string;
  is_client_portal?: boolean;
  ai_tokens_used?: number;
  ai_tokens_extra?: number;
  ai_tokens_reset_at?: string | null;
  storage_used_bytes?: number;
  storage_extra_bytes?: number;
  account_type?: "agency" | "individual";
}

export interface WooGateway {
  id: string;
  label: string;
}

export interface WooFatalError {
  timestamp: string;
  error_type: string;
  message: string;
  file?: string;
}

export interface Site {
  id: string;
  agency_id: string;
  client_id?: string | null;
  client_email?: string | null;
  client_name?: string | null;
  name: string;
  url: string;
  site_token: string;
  plugin_connected: boolean;
  uptime_status: "up" | "down" | "unknown";
  uptime_percentage?: number;
  avg_response_ms?: number;
  last_uptime_check_at?: string | null;
  scan_schedule: "manual" | "weekly" | "monthly";
  last_audit_at?: string;
  created_at: string;
  latest_scores?: PillarScores;
  malware_status?: "clean" | "threat";
  plugin_vuln_count?: number;
  plugin_data?: PluginData;

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

  // Performance signals
  caching_plugin?: string | null;
  cdn_plugin?: string | null;
  php_max_execution_time?: number | null;
  memory_limit?: string | null;
  image_optimization_plugin?: string | null;
  object_cache_enabled?: boolean | null;
  mysql_version?: string | null;
  database_size_mb?: number | null;

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

  // Plugin intelligence
  plugins_needing_updates?: number | null;
  plugins_outdated_12m?: PluginOutdated[] | null;

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

  // Cron events & site health
  cron_events?: CronEvent[] | null;
  site_health?: SiteHealth | null;

  // Tags
  tags?: string[] | null;

  // Google Analytics & Search Console (Phase 5 Sprint 3)
  ga4_property_id?: string | null;
  sc_property_url?: string | null;
  google_connected?: boolean;

  // Safe Updates (Phase 4 Sprint 1)
  updates_enabled?: boolean;

  // Safe Updates (Phase 4 Sprint 2)
  update_window_day?: number | null;
  update_window_hour?: number | null;
  excluded_from_updates?: string[];
}

export interface PillarScores {
  performance: number;
  seo: number;
  security: number;
  malware: number;
}

// ── Audit data types ──────────────────────────────────────────────────────────

export interface SeoData {
  score?: number;
  // Common field patterns from BrandBees Scanner seo_audit response
  has_meta_description?: boolean;
  meta_description?: boolean | { present?: boolean; content?: string };
  has_canonical?: boolean;
  canonical?: boolean | { present?: boolean };
  has_og_tags?: boolean;
  og_tags?: boolean | { present?: boolean };
  has_h1?: boolean;
  h1?: boolean | { present?: boolean; count?: number };
  has_robots?: boolean;
  robots?: boolean | { present?: boolean };
  has_lang?: boolean;
  lang?: boolean | string | { present?: boolean };
  [key: string]: unknown;
}

export interface PerformanceData {
  ttfb?: number;
  load_time?: number;
  caching_detected?: boolean;
  js_count?: number;
  html_size?: number;
  [key: string]: unknown;
}

export interface PluginVulnerability {
  slug: string;
  plugin_name: string;
  severity: string;
  vulnerability_title: string;
  cve_id?: string | null;
  fix_version?: string | null;
}

export interface SecurityData {
  issues?: SecurityIssue[];
  issues_count?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  dns_checks?: unknown;
  threat_intel?: ScanThreat[];
  plugin_vulnerabilities?: PluginVulnerability[];
  [key: string]: unknown;
}

export interface SecurityIssue {
  severity?: string;
  type?: string;
  description?: string;
}

export interface Audit {
  id: string;
  site_id: string;
  status: "pending" | "running" | "completed" | "failed";
  audit_type: "manual" | "scheduled";
  scores?: PillarScores;
  overall_score?: number;
  seo_data?: SeoData | null;
  performance_data?: PerformanceData | null;
  security_data?: SecurityData | null;
  ai_narrative?: Record<string, string>;
  ai_recommendations?: Recommendation[];
  plugin_data?: PluginData;
  completed_at?: string;
  created_at: string;
  pdf_url?: string | null;
  portal_token?: string | null;
}

export interface Recommendation {
  title: string;
  description: string;
  pillar?: string;
  why?: string;
  how?: string;
  effort: "low" | "medium" | "high";
}

// ── Legacy scan results (old scanner) ────────────────────────────────────────

export interface ScanResult {
  id: string;
  site_id: string;
  is_clean: boolean;
  threats?: ScanThreat[] | null;
  sources_used?: string[] | null;
  created_at: string;
}

export type ThreatConfidence = 'confirmed' | 'possible' | 'needs_review';

export interface ThreatExplanation {
  what: string;
  where: string | null;
  why_risky: string;
  recommended_action: string;
  user_action_required: boolean;
}

export interface ScanThreat {
  severity?: string;
  type?: string;
  threat_type?: string;
  file_path?: string;
  signature_id?: string;
  description?: string;
  url?: string;
  source?: string;
  location?: string;
  excerpt?: string;
  _source?: 'threat_intel' | 'file_threats' | 'db_threats';
  confidence?: ThreatConfidence;
  explanation?: ThreatExplanation;
}

// ── 4-Tier Malware Scanner results ───────────────────────────────────────────

export type MalwareSeverity = 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'info';
export type MalwareThreatLayer = 'file' | 'database';
export type MalwareScanStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface MalwareFinding {
  id: string;
  scan_id: string;
  site_id: string;
  threat_layer: MalwareThreatLayer;
  threat_tier: 1 | 2 | 3 | 4;
  threat_type: string;
  severity: MalwareSeverity;
  confidence: number;
  confidence_basis: string;
  source_api: string;
  score_contribution: number;
  file_path: string | null;
  db_location: string | null;
  cve_id: string | null;
  cve_url: string | null;
  description: string | null;
  created_at: string;
}

export interface MalwareScanResult {
  id: string;
  site_id: string;
  agency_id: string;
  status: MalwareScanStatus;
  triggered_by: string | null;
  overall_threat_score: number;
  threats_found: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  warning_count: number;
  info_count: number;
  total_files_scanned: number | null;
  total_db_checks: number | null;
  total_urls_checked: number | null;
  r2_report_key: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  threats: MalwareFinding[];
}

// ── Plugin data ───────────────────────────────────────────────────────────────

export interface PluginData {
  wp_version?: string;
  php_version?: string;
  active_plugins_count?: number;
  inactive_plugins_count?: number;
  server_software?: string;
  xmlrpc_enabled?: boolean;
  file_editor_enabled?: boolean;
  debug_mode?: boolean;
  plugins?: Plugin[];
  last_sync?: string;
}

export interface PluginOutdated {
  name: string;
  version?: string;
  last_updated?: string;
}

export interface CronEvent {
  hook: string;
  next_run?: string | null;
  last_run?: string | null;
  schedule?: string | null;
  interval?: number | null;
  status: string;
  source: "wp-cron" | "action-scheduler";
  args?: unknown;
  group?: string | null;
  recurrence?: string | null;
}

export interface SiteHealth {
  is_https?: boolean | null;
  wp_update_available?: boolean | null;
  wp_latest_version?: string | null;
  auto_updates_enabled?: boolean | null;
  wp_debug_log?: boolean | null;
  wp_debug_display?: boolean | null;
  disallow_file_mods?: boolean | null;
  wp_cron_disabled?: boolean | null;
  uploads_writable?: boolean | null;
  plugins_writable?: boolean | null;
  themes_writable?: boolean | null;
  users_can_register?: boolean | null;
  permalink_structure?: string | null;
  php_extensions?: Record<string, boolean>;
}

export interface Plugin {
  name: string;
  slug?: string;
  version: string;
  status: "active" | "inactive";
  update_available: boolean;
  new_version?: string;
}

// ── Other types ───────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  site_id: string;
  audit_id: string;
  pdf_url?: string | null;
  portal_token: string;
  overall_score?: number | null;
  status: "pending" | "completed" | "failed";
  sent_to?: string | null;
  sent_at?: string | null;
  created_at: string;
  completed_at?: string | null;
  performance_score?: number | null;
  seo_score?: number | null;
  security_score?: number | null;
  malware_score?: number | null;
  annotations?: string | null;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  email?: string;
  company?: string;
  site_count?: number;
  created_at: string;
  invite_token?: string | null;
  invite_accepted?: boolean;
  portal_last_login?: string | null;
}

export type TeamRole = "owner" | "admin" | "manager" | "analyst" | "viewer";

export interface TeamMember {
  id: string;
  agency_id: string;
  name: string | null;
  email: string;
  role: Exclude<TeamRole, "owner">;
  invite_accepted: boolean;
  created_at: string;
}

export interface AlertSettings {
  site_id: string;
  performance_threshold: number;
  seo_threshold: number;
  security_threshold: number;
  malware_alerts: boolean;
  channel: "email" | "slack";
  alert_email?: string;
  slack_webhook_url?: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

export interface ToolCall {
  tool: string;
  result: string;
}

export interface AuthResponse {
  token: string;
  agency: Agency;
}
