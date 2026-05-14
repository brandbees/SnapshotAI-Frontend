"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Shield, CheckCircle2, XCircle } from "lucide-react";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { API_BASE_URL } from "@/lib/constants";

interface PortalData {
  site_name: string;
  site_url: string;
  agency_logo_url: string | null;
  agency_brand_name: string | null;
  agency_tagline: string | null;
  accent_color: string | null;
  agency_plan: string;
  overall_score: number | null;
  performance_score: number | null;
  seo_score: number | null;
  security_score: number | null;
  malware_score: number | null;
  ai_narrative: Record<string, string> | null;
  ai_recommendations: { title: string; description: string; effort: string }[] | null;
  is_clean: boolean | null;
  report_date: string;
  completed_at: string | null;
}

const EFFORT_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/portal/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((d: PortalData | null) => {
        if (!d) return;
        setData(d);
        // Bug 3 fix — apply agency accent color as CSS variable
        if (d.accent_color) {
          document.documentElement.style.setProperty("--accent", d.accent_color);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
        <Shield size={32} className="text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Report not found</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This report link may have expired or is invalid. Contact your agency for a fresh link.
        </p>
      </div>
    );
  }

  const agencyName = data.agency_brand_name || "BrandBees SnapshotAI";
  const isPaid = data.agency_plan !== "free";
  const isClean = data.malware_score != null ? data.malware_score >= 80 : data.is_clean !== false;

  const pillars: { key: string; label: string; score: number | null; isMalware?: boolean }[] = [
    { key: "performance", label: "Performance", score: data.performance_score },
    { key: "seo",         label: "SEO",         score: data.seo_score },
    { key: "security",    label: "Security",     score: data.security_score },
    { key: "malware",     label: "Malware",      score: data.malware_score, isMalware: true },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Bug 2 fix — agency logo with fallback */}
          {data.agency_logo_url ? (
            <img
              src={data.agency_logo_url}
              alt={agencyName}
              className="h-9 max-w-[140px] object-contain"
            />
          ) : (
            <div
              className="h-9 px-3 flex items-center rounded-lg text-white text-sm font-bold"
              style={{ background: data.accent_color || "var(--accent)" }}
            >
              {agencyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{agencyName}</p>
            {data.agency_tagline && (
              <p className="text-xs text-muted-foreground truncate">{data.agency_tagline}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-foreground truncate max-w-[180px]">{data.site_name}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
              {data.site_url.replace(/^https?:\/\//, "")}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Malware status banner */}
        <div
          className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${
            isClean
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {isClean ? (
            <CheckCircle2 size={28} className="text-green-600 shrink-0" />
          ) : (
            <XCircle size={28} className="text-red-600 shrink-0" />
          )}
          <div>
            <p className={`font-semibold ${isClean ? "text-green-800" : "text-red-800"}`}>
              {isClean ? "No Malware Detected" : "Threats Detected"}
            </p>
            <p className={`text-sm mt-0.5 ${isClean ? "text-green-700" : "text-red-700"}`}>
              {isClean
                ? "Your site is clean. No malicious files or code were found."
                : "Malicious files or code were detected. Contact your agency immediately."}
            </p>
          </div>
        </div>

        {/* Overall score */}
        {data.overall_score != null && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Overall Health Score
            </p>
            <ScoreGauge
              score={data.overall_score}
              label="Overall"
              sublabel={data.overall_score >= 80 ? "Healthy" : data.overall_score >= 50 ? "Needs Attention" : "Critical"}
              sublabelVariant={data.overall_score >= 80 ? "good" : data.overall_score >= 50 ? "warn" : "bad"}
              size="lg"
            />
          </div>
        )}

        {/* Pillar scores */}
        {pillars.some((p) => p.score != null) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {pillars.map(({ key, label, score, isMalware }) =>
              score != null ? (
                <div
                  key={key}
                  className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col items-center"
                >
                  <ScoreGauge
                    score={score}
                    label={label}
                    size="md"
                    isMalware={!!isMalware}
                  />
                </div>
              ) : null
            )}
          </div>
        )}

        {/* AI Recommendations */}
        {Array.isArray(data.ai_recommendations) && data.ai_recommendations.length > 0 && (
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-4">
              Recommendations
            </p>
            <ol className="space-y-4">
              {data.ai_recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ background: data.accent_color || "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                      {rec.effort && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${EFFORT_COLOR[rec.effort] ?? "bg-muted text-muted-foreground"}`}>
                          {rec.effort.charAt(0).toUpperCase() + rec.effort.slice(1)} effort
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{rec.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Report date */}
        <p className="text-xs text-muted-foreground text-center">
          Report generated{" "}
          {new Date(data.completed_at || data.report_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-4">
        <p className="text-center text-xs text-muted-foreground">
          {isPaid ? `Powered by ${agencyName}` : "Powered by BrandBees SnapshotAI"}
        </p>
      </footer>
    </div>
  );
}
