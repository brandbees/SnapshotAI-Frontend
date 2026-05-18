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
  trial_ends_at?: string | null;
  onboarding_complete?: boolean;
  role?: TeamRole;
  member_id?: string;
  member_name?: string;
}

export interface Site {
  id: string;
  agency_id: string;
  client_id?: string | null;
  name: string;
  url: string;
  site_token: string;
  plugin_connected: boolean;
  uptime_status: "up" | "down" | "unknown";
  uptime_percentage?: number;
  avg_response_ms?: number;
  scan_schedule: "manual" | "weekly" | "monthly";
  last_audit_at?: string;
  created_at: string;
  latest_scores?: PillarScores;
  malware_status?: "clean" | "threat";
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
}

export interface Recommendation {
  title: string;
  description: string;
  effort: "low" | "medium" | "high";
}

// ── Scan results ──────────────────────────────────────────────────────────────

export interface ScanResult {
  id: string;
  site_id: string;
  is_clean: boolean;
  threats?: ScanThreat[] | null;
  sources_used?: string[] | null;
  created_at: string;
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
}

// ── Plugin data ───────────────────────────────────────────────────────────────

export interface PluginData {
  wp_version?: string;
  php_version?: string;
  active_plugins_count?: number;
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

export interface Plugin {
  name: string;
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
  pdf_url: string;
  portal_token: string;
  overall_score: number;
  sent_to?: string;
  sent_at?: string;
  created_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  email?: string;
  company?: string;
  site_count?: number;
  created_at: string;
}

export type TeamRole = "owner" | "admin" | "manager" | "analyst";

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
