'use client';

import { useState } from 'react';
import { ChevronDown, Brain, Zap } from 'lucide-react';

interface ThinkingStep {
  fix_id: string;
  risk_tier: string;
  status: string;
  psi_improvement: number;
  timestamp: string;
}

interface ThinkingPanelProps {
  current_iteration: number;
  thinking_steps: ThinkingStep[];
  recent_decisions: Array<{
    fix_selected: string;
    confidence: number;
    reasoning: string;
    timestamp: string;
  }>;
  fixes_deployed: number;
  rollbacks: number;
  status: string;
  isCollapsed?: boolean;
}

export function ThinkingPanel({
  current_iteration,
  thinking_steps,
  recent_decisions,
  fixes_deployed,
  rollbacks,
  status,
  isCollapsed: initialCollapsed = true,
}: ThinkingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="w-full flex items-center gap-2 p-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 bg-blue-50"
      >
        <Brain className="w-4 h-4" />
        Agent Thinking Panel ({current_iteration} iteration{current_iteration !== 1 ? 's' : ''})
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50"
        onClick={() => setIsCollapsed(true)}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Agent Thinking Panel</h3>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
            Iteration {current_iteration}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Fixes Deployed</p>
            <p className="text-2xl font-bold text-green-600">{fixes_deployed}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Rollbacks</p>
            <p className="text-2xl font-bold text-orange-600">{rollbacks}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <p className={`text-sm font-bold ${status === 'active' ? 'text-blue-600' : 'text-gray-600'}`}>
              {status === 'active' ? 'Active' : 'Completed'}
            </p>
          </div>
        </div>

        {/* Recent Decisions */}
        {recent_decisions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Agent Decisions
            </h4>
            <div className="space-y-2">
              {recent_decisions.slice(0, 3).map((decision, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200 text-xs">
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-gray-900">{decision.fix_selected}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-xs">
                      {Math.round(decision.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-gray-700 text-xs">{decision.reasoning}</p>
                  <p className="text-gray-500 text-xs mt-1 font-mono">
                    {new Date(decision.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Iteration Timeline */}
        {thinking_steps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Iteration History</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {thinking_steps.map((step, idx) => (
                <div key={idx} className="bg-white rounded-lg p-2 border border-gray-200 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        step.status === 'deployed' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="font-mono font-semibold text-gray-900">{step.fix_id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        step.risk_tier === 'low' ? 'bg-green-100 text-green-700' :
                        step.risk_tier === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {step.risk_tier}
                      </span>
                    </div>
                    {step.psi_improvement > 0 && (
                      <span className="text-green-600 font-bold">+{step.psi_improvement} pts</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <p className="font-semibold mb-1">How Agent Thinks:</p>
          <p>
            Agent analyzes fix success history on similar sites, current PSI metrics, and applies 12 risk-classified optimizations. Each decision is scored based on 70% base confidence + historical success (±30%) + site-type performance (±15%) + improvement quality (±10%).
          </p>
        </div>
      </div>
    </div>
  );
}
