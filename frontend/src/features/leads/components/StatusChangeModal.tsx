import { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { cn, getLeadStatusLabel, getFollowUpReasonLabel } from '@/lib/utils';
import type { LeadStatus, SubStatus, FollowUpReason } from '@/types';

interface StatusChangeModalProps {
  currentStatus: LeadStatus;
  currentSubStatus?: SubStatus;
  onClose: () => void;
  onSubmit: (data: {
    status: LeadStatus;
    subStatus?: SubStatus;
    note: string;
    followUpDate?: string;
    followUpReason?: FollowUpReason;
    followUpReasonOther?: string;
  }) => void;
  isLoading?: boolean;
}

const LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'pre_estimate',
  'estimated',
  'converted',
  'on_hold',
  'future_client',
  'dropped',
];

const SUB_STATUSES: SubStatus[] = ['in_progress', 'complete'];

const FOLLOW_UP_REASONS: FollowUpReason[] = [
  'budget',
  'timing',
  'permits',
  'comparing',
  'personal',
  'other',
];

const QUICK_DATES = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
];

function hasSubStatus(status: LeadStatus): boolean {
  return ['pre_estimate', 'estimated', 'converted'].includes(status);
}

function requiresFollowUp(status: LeadStatus): boolean {
  return ['on_hold', 'future_client'].includes(status);
}

export default function StatusChangeModal({
  currentStatus,
  currentSubStatus,
  onClose,
  onSubmit,
  isLoading = false,
}: StatusChangeModalProps) {
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [subStatus, setSubStatus] = useState<SubStatus | undefined>(
    hasSubStatus(currentStatus) ? currentSubStatus : undefined
  );
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpReason, setFollowUpReason] = useState<FollowUpReason | ''>('');
  const [followUpReasonOther, setFollowUpReasonOther] = useState('');

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    if (hasSubStatus(newStatus)) {
      setSubStatus('in_progress');
    } else {
      setSubStatus(undefined);
    }
    if (!requiresFollowUp(newStatus)) {
      setFollowUpDate('');
      setFollowUpReason('');
      setFollowUpReasonOther('');
    }
  };

  const handleQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFollowUpDate(date.toISOString().split('T')[0]);
  };

  const handleSubmit = () => {
    if (!note.trim()) return;
    if (requiresFollowUp(status) && !followUpReason) return;

    onSubmit({
      status,
      subStatus: hasSubStatus(status) ? subStatus : undefined,
      note: note.trim(),
      followUpDate: followUpDate || undefined,
      followUpReason: followUpReason || undefined,
      followUpReasonOther: followUpReason === 'other' ? followUpReasonOther : undefined,
    });
  };

  const isValid = note.trim().length > 0 && (!requiresFollowUp(status) || followUpReason);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Change Status</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LEAD_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-colors',
                      status === s
                        ? 'border-designer-500 bg-designer-50 text-designer-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    )}
                  >
                    {getLeadStatusLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Status (for applicable statuses) */}
            {hasSubStatus(status) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress
                </label>
                <div className="flex gap-2">
                  {SUB_STATUSES.map((ss) => (
                    <button
                      key={ss}
                      type="button"
                      onClick={() => setSubStatus(ss)}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                        subStatus === ss
                          ? 'border-designer-500 bg-designer-50 text-designer-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      )}
                    >
                      {ss === 'in_progress' ? 'In Progress' : 'Complete'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Section (for on_hold and future_client) */}
            {requiresFollowUp(status) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={followUpReason}
                    onChange={(e) => setFollowUpReason(e.target.value as FollowUpReason)}
                    className="input"
                  >
                    <option value="">Select a reason...</option>
                    {FOLLOW_UP_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {getFollowUpReasonLabel(r)}
                      </option>
                    ))}
                  </select>
                  {followUpReason === 'other' && (
                    <input
                      type="text"
                      value={followUpReasonOther}
                      onChange={(e) => setFollowUpReasonOther(e.target.value)}
                      placeholder="Specify reason..."
                      className="input mt-2"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Date
                  </label>
                  <div className="flex gap-2 mb-2">
                    {QUICK_DATES.map((qd) => (
                      <button
                        key={qd.days}
                        type="button"
                        onClick={() => handleQuickDate(qd.days)}
                        className="px-2 py-1 text-xs rounded border border-gray-200 hover:border-gray-300 text-gray-600"
                      >
                        {qd.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="input pl-10"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this status change..."
                rows={3}
                className="input resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                A note is required for all status changes
              </p>
            </div>

            {/* Warning for dropped */}
            {status === 'dropped' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Dropping this lead will archive it. You can reactivate it later if needed.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button onClick={onClose} className="btn btn-outline" disabled={isLoading}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="btn btn-designer"
            >
              {isLoading ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
