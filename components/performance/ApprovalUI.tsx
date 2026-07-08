'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, RotateCcw, Square } from 'lucide-react';

interface ApprovalUIProps {
  fix_id: string;
  risk_tier: string;
  psi_improvement_mobile: number;
  psi_improvement_desktop: number;
  health_check_status: string;
  cache_cleared: boolean;
  onApprove: () => void;
  onRollback: () => void;
  onStop: () => void;
  isLoading?: boolean;
}

const VERIFICATION_ITEMS = [
  {
    id: 'fonts',
    question: 'Do fonts load correctly?',
    tip: 'Check if web fonts are displaying without fallbacks. Look for proper font styling and no visible FOUT (Flash of Unstyled Text).',
  },
  {
    id: 'layout',
    question: 'Is layout intact?',
    tip: 'Verify no layout shifts, broken columns, or misaligned elements. Sections should be properly spaced.',
  },
  {
    id: 'images',
    question: 'Are images displaying?',
    tip: 'All images should load properly with correct dimensions. No broken images or missing assets.',
  },
  {
    id: 'interactions',
    question: 'Are interactions working?',
    tip: 'Test buttons, forms, menus, and modals. Ensure click handlers and hover effects work as expected.',
  },
  {
    id: 'glitches',
    question: 'No flashing or glitches?',
    tip: 'No visual flicker, layout thrashing, or unprofessional rendering. Everything should feel smooth.',
  },
  {
    id: 'animations',
    question: 'Animations as expected?',
    tip: 'Transitions and animations should be smooth and intentional. No lag or jank.',
  },
];

export function ApprovalUI({
  fix_id,
  risk_tier,
  psi_improvement_mobile,
  psi_improvement_desktop,
  health_check_status,
  cache_cleared,
  onApprove,
  onRollback,
  onStop,
  isLoading = false,
}: ApprovalUIProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const allChecked = Object.keys(checklist).length === 6 && Object.values(checklist).every(v => v);
  const checkedCount = Object.values(checklist).filter(v => v).length;

  const riskBg = risk_tier === 'low' ? 'bg-green-50 border-green-200' :
                 risk_tier === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                 'bg-red-50 border-red-200';
  const riskText = risk_tier === 'low' ? 'text-green-700' :
                   risk_tier === 'medium' ? 'text-yellow-700' :
                   'text-red-700';

  const toggleItem = (id: string) => {
    setChecklist(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
        <h2 className="text-white font-bold text-lg">Fix Deployed & Ready for Verification</h2>
        <p className="text-emerald-100 text-sm mt-1">Review the changes on your live site before approving</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Fix Info Card */}
        <div className={`${riskBg} border rounded-lg p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fix Applied</p>
              <p className={`text-lg font-bold font-mono ${riskText}`}>{fix_id}</p>
              <p className="text-xs text-gray-600 mt-1 capitalize">
                Risk Tier: <strong>{risk_tier}</strong>
              </p>
            </div>
            {health_check_status === 'healthy' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Site OK
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <p className="text-xs text-gray-600 mb-2">Mobile PSI Improvement</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-blue-700">
                {psi_improvement_mobile > 0 ? '+' : ''}{psi_improvement_mobile}
              </span>
              <span className="text-sm text-gray-600">points</span>
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
            <p className="text-xs text-gray-600 mb-2">Desktop PSI Improvement</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-purple-700">
                {psi_improvement_desktop > 0 ? '+' : ''}{psi_improvement_desktop}
              </span>
              <span className="text-sm text-gray-600">points</span>
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Quality Verification Checklist</h3>
            <p className="text-sm text-gray-600">
              Visit your site in a new tab and verify these {checkedCount} of {VERIFICATION_ITEMS.length} items:
            </p>
          </div>

          <div className="space-y-3">
            {VERIFICATION_ITEMS.map(item => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`border rounded-lg p-3 cursor-pointer transition ${
                  checklist[item.id]
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 ${
                    checklist[item.id]
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300'
                  }`}>
                    {checklist[item.id] && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{item.question}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-1">💡 Verification Tip</p>
            <p>Open your site in a private/incognito window to bypass any local cache and see the actual deployed version.</p>
          </div>
        </div>

        {/* Deployment Status */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <CheckCircle2 className={`w-4 h-4 ${cache_cleared ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-gray-900">
              Cache <strong>{cache_cleared ? 'Cleared' : 'Not Detected'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <CheckCircle2 className={`w-4 h-4 ${health_check_status === 'healthy' ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="text-gray-900">
              Site <strong>{health_check_status === 'healthy' ? 'Healthy' : 'Not Checked'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t px-6 py-4 bg-gray-50 space-y-3">
        {/* Main Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRollback}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Rollback
          </button>
          <button
            onClick={onApprove}
            disabled={!allChecked || isLoading}
            className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isLoading ? 'Approving...' : 'Approve & Continue'}
          </button>
        </div>

        {/* Secondary Button */}
        <button
          onClick={onStop}
          disabled={isLoading}
          className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          <Square className="w-4 h-4" />
          Stop Optimization
        </button>

        {/* Info message */}
        {!allChecked && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Please verify all items</strong> before approving. You can still rollback if something looks wrong.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
