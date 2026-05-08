export type Plan = "free" | "freemium" | "premium" | "agency_plus";

export interface Agency {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  sites_count: number;
  logo_url?: string;
  brand_name?: string;
  brand_tagline?: string;
  accent_color?: string;
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
  scan_schedule: "manual" | "weekly" | "monthly";
  last_audit_at?: string;
  created_at: string;
  latest_scores?: PillarScores;
  malware_status?: "clean" | "threat";
  plugin_data?: PluginData;
}

export interface PillarScores {
  performance: number;
  seo: number;
  security: number;
  malware: number;
}

export interface Audit {
  id: string;
  site_id: string;
  status: "pending" | "running" | "completed" | "failed";
  audit_type: "manual" | "scheduled";
  scores?: PillarScores;
  overall_score?: number;
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

export interface Plugin {
  name: string;
  version: string;
  status: "active" | "inactive";
  update_available: boolean;
}

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

export interface TeamMember {
  id: string;
  agency_id: string;
  name: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  status: "active" | "invited";
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
