'use client';

import { useState } from 'react';
import { Shield, Clock, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
  site_url: string;
  psi_mobile_before: number;
  psi_desktop_before: number;
  tier: 'low' | 'medium' | 'high';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  site_url,
  psi_mobile_before,
  psi_desktop_before,
  tier,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const riskLevel = tier === 'low' ? 'Low' : tier === 'medium' ? 'Medium' : 'High';
  const riskColor = tier === 'low' ? 'text-green-600' : tier === 'medium' ? 'text-yellow-600' : 'text-red-600';
  const bgColor = tier === 'low' ? 'bg-green-50' : tier === 'medium' ? 'bg-yellow-50' : 'bg-red-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white font-bold text-lg">PSI Autonomous Optimization</h2>
          <p className="text-blue-100 text-sm mt-1">Review & confirm optimization settings</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Site Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">URL</p>
                <p className="text-sm font-mono text-gray-900 break-all">{site_url}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current PSI Score</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded text-sm font-semibold">
                    Mobile: {psi_mobile_before}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-900 rounded text-sm font-semibold">
                    Desktop: {psi_desktop_before}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${bgColor} border border-gray-200 rounded-lg p-4`}>
            <h3 className="font-semibold text-gray-900 mb-3">Risk Tier</h3>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${riskColor}`} />
              <span className={`font-semibold ${riskColor}`}>{riskLevel} Risk</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">
              {tier === 'low' && 'Only CSS-only, no-risk optimizations will be applied.'}
              {tier === 'medium' && 'Both CSS and isolated PHP changes will be deployed.'}
              {tier === 'high' && 'All optimizations including functionality changes may be deployed.'}
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  1
                </span>
                <span className="text-gray-700">
                  <strong>Deploy Fix</strong> — A single optimization is deployed to your site
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  2
                </span>
                <span className="text-gray-700">
                  <strong>Verify</strong> — You review 6 quality checks to ensure nothing broke
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  3
                </span>
                <span className="text-gray-700">
                  <strong>Approve or Rollback</strong> — Either approve the change or instantly rollback
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  4
                </span>
                <span className="text-gray-700">
                  <strong>Repeat</strong> — Continue with next fix or stop optimization
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Your site is safe</p>
              <p className="mt-1">
                If any fix causes issues, we automatically rollback within seconds. You maintain full control at every step.
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estimated Duration
            </h3>
            <p className="text-sm text-gray-700">
              Each optimization iteration typically takes <strong>2-5 minutes</strong> depending on your site size and complexity.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
              I understand the optimization process and risks involved. I authorize the agent to deploy fixes iteratively with my approval at each step.
            </label>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!termsAccepted || isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Starting...
              </>
            ) : (
              'Start Optimization'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
