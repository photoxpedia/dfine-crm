import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight, Phone, Loader2 } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { formatDate, getFollowUpReasonLabel, cn } from '@/lib/utils';
import type { FollowUp } from '@/types';

interface FollowUpsWidgetProps {
  basePath: string;
}

export default function FollowUpsWidget({ basePath }: FollowUpsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'followups'],
    queryFn: async () => {
      const response = await dashboardApi.getFollowups();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-designer-600" />
          <h3 className="font-semibold text-gray-900">Upcoming Follow-ups</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  const followups = data?.followups || [];
  const grouped = data?.grouped || {};

  if (followups.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-designer-600" />
          <h3 className="font-semibold text-gray-900">Upcoming Follow-ups</h3>
        </div>
        <div className="text-center py-6 text-gray-500">
          <CalendarClock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No follow-ups scheduled</p>
          <p className="text-xs text-gray-400 mt-1">
            Follow-ups from the next 7 days will appear here
          </p>
        </div>
      </div>
    );
  }

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const getDateLabel = (dateStr: string) => {
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    return formatDate(dateStr);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-designer-600" />
          <h3 className="font-semibold text-gray-900">Upcoming Follow-ups</h3>
        </div>
        <span className="px-2 py-0.5 text-xs font-medium bg-designer-100 text-designer-700 rounded-full">
          {followups.length}
        </span>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {Object.entries(grouped).map(([date, leads]) => (
          <div key={date}>
            <h4
              className={cn(
                'text-xs font-medium uppercase tracking-wide mb-2',
                date === today ? 'text-red-600' : 'text-gray-500'
              )}
            >
              {getDateLabel(date)}
            </h4>
            <div className="space-y-2">
              {(leads as FollowUp[]).map((lead) => (
                <Link
                  key={lead.id}
                  to={`${basePath}/leads/${lead.id}`}
                  className={cn(
                    'block p-3 rounded-lg border transition-colors hover:border-designer-300',
                    date === today
                      ? 'bg-red-50 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {lead.projectType}
                      </p>
                      {lead.followUpReason && (
                        <p className="text-xs text-gray-400 mt-1">
                          {getFollowUpReasonLabel(lead.followUpReason)}
                          {lead.followUpReasonOther && `: ${lead.followUpReasonOther}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          to={`${basePath}/leads?status=on_hold`}
          className="text-sm text-designer-600 hover:text-designer-700 flex items-center gap-1"
        >
          View all leads on hold
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
