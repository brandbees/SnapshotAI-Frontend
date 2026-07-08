'use client';

import { TrendingUp, Clock, Zap, AlertCircle, Share2 } from 'lucide-react';

interface FixApplied {
  fix_id: string;
  risk_tier: string;
  improvement: number;
}

interface ResultsDashboardProps {
  session_id: string;
  site_id: string;
  status: string;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
  psi_mobile_before: number;
  psi_mobile_after: number;
  psi_improvement: number;
  fixes_deployed: number;
  fixes_rejected: number;
  rollbacks: number;
  iterations_total: number;
  fixes_applied: FixApplied[];
  onNewOptimization?: () => void;
}

export function ResultsDashboard({
  session_id,
  site_id,
  status,
  duration_ms,
  started_at,
  completed_at,
  psi_mobile_before,
  psi_mobile_after,
  psi_improvement,
  fixes_deployed,
  fixes_rejected,
  rollbacks,
  iterations_total,
  fixes_applied,
  onNewOptimization,
}: ResultsDashboardProps) {
  const durationSeconds = Math.round(duration_ms / 1000);
  const durationMins = Math.round(durationSeconds / 60);
  const successRate = fixes_deployed > 0 ? Math.round((fixes_deployed / iterations_total) * 100) : 0;

  const getImprovementColor = (improvement: number) => {
    if (improvement >= 10) return 'text-green-600';
    if (improvement >= 5) return 'text-emerald-600';
    return 'text-gray-600';
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-2xl">Optimization Complete! 🎉</h2>
            <p className="text-emerald-100 text-sm mt-1">Session {session_id.slice(0, 8)}...</p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100 text-xs uppercase tracking-wide mb-1">Total Improvement</p>
            <p className={`text-4xl font-bold ${getImprovementColor(psi_improvement)} text-white`}>
              +{psi_improvement}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Final Mobile PSI</p>
            <p className="text-2xl font-bold text-blue-700">{psi_mobile_after}</p>
            <p className="text-xs text-gray-600 mt-1">from {psi_mobile_before}</p>
          </div>
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <p className="text-xs text-gray-600 mb-1">Fixes Applied</p>
            <p className="text-2xl font-bold text-green-700">{fixes_deployed}</p>
            <p className="text-xs text-gray-600 mt-1">approved</p>
          </div>
          <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
            <p className="text-xs text-gray-600 mb-1">Rollbacks</p>
            <p className="text-2xl font-bold text-orange-700">{rollbacks}</p>
            <p className="text-xs text-gray-600 mt-1">auto-recovered</p>
          </div>
          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Duration</p>
            <p className="text-2xl font-bold text-purple-700">{durationMins}m</p>
            <p className="text-xs text-gray-600 mt-1">{durationSeconds}s total</p>
          </div>
        </div>

        {/* Session Summary */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Session Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Total Iterations</p>
              <p className="text-lg font-bold text-gray-900">{iterations_total}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Approval Rate</p>
              <p className="text-lg font-bold text-gray-900">{successRate}%</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Fixes Rejected</p>
              <p className="text-lg font-bold text-orange-600">{fixes_rejected}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Status</p>
              <p className="text-lg font-bold capitalize text-gray-900">{status}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Started</p>
              <p className="text-xs font-mono text-gray-900">
                {new Date(started_at).toLocaleTimeString()}
              </p>
            </div>
            {completed_at && (
              <div>
                <p className="text-gray-600 mb-1">Completed</p>
                <p className="text-xs font-mono text-gray-900">
                  {new Date(completed_at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fixes Applied */}
        {fixes_applied.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Optimizations Applied
            </h3>
            <div className="space-y-2">
              {fixes_applied.map((fix, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 font-mono">{fix.fix_id}</p>
                      <p className={`text-xs font-semibold capitalize ${
                        fix.risk_tier === 'low' ? 'text-green-600' :
                        fix.risk_tier === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {fix.risk_tier} risk
                      </p>
                    </div>
                  </div>
                  <div className={`text-right ${getImprovementColor(fix.improvement)}`}>
                    <p className="font-bold text-lg">
                      {fix.improvement > 0 ? '+' : ''}{fix.improvement}
                    </p>
                    <p className="text-xs text-gray-600">PSI pts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Next Steps
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Monitor your site for 24 hours to ensure stability with these changes.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Run another PSI audit in PageSpeed Insights to verify the improvements.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>If any issues arise, we can quickly rollback the changes.</span>
            </li>
          </ul>
        </div>

        {/* Learning Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900 font-semibold mb-1">📚 System Learning</p>
          <p className="text-xs text-amber-800">
            This optimization session has been recorded in our knowledge base. Future optimizations on similar sites will benefit from these results.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
        <button
          onClick={() => {
            const text = `PSI Optimization Results\nSession: ${session_id}\nImprovement: +${psi_improvement} pts\nFixes Applied: ${fixes_deployed}\nDuration: ${durationMins}m`;
            navigator.clipboard.writeText(text);
            alert('Results copied to clipboard!');
          }}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share Results
        </button>
        {onNewOptimization && (
          <button
            onClick={onNewOptimization}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            New Optimization
          </button>
        )}
      </div>
    </div>
  );
}
