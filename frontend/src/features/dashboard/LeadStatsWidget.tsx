import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Pause, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { getLeadStatusLabel, cn } from '@/lib/utils';

interface LeadStatsWidgetProps {
  basePath: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  new: <Users className="w-4 h-4" />,
  contacted: <TrendingUp className="w-4 h-4" />,
  pre_estimate: <Clock className="w-4 h-4" />,
  estimated: <Clock className="w-4 h-4" />,
  converted: <CheckCircle className="w-4 h-4" />,
  on_hold: <Pause className="w-4 h-4" />,
  future_client: <Clock className="w-4 h-4" />,
  dropped: <XCircle className="w-4 h-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-600',
  contacted: 'bg-yellow-100 text-yellow-600',
  pre_estimate: 'bg-purple-100 text-purple-600',
  estimated: 'bg-purple-100 text-purple-600',
  converted: 'bg-green-100 text-green-600',
  on_hold: 'bg-orange-100 text-orange-600',
  future_client: 'bg-gray-100 text-gray-600',
  dropped: 'bg-red-100 text-red-600',
};

export default function LeadStatsWidget({ basePath }: LeadStatsWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'lead-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getLeadStats();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-designer-600" />
          <h3 className="font-semibold text-gray-900">Lead Pipeline</h3>
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

  const byStatus = data?.byStatus || [];
  const summary = data?.summary || { total: 0, active: 0, converted: 0, dropped: 0 };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-designer-600" />
        <h3 className="font-semibold text-gray-900">Lead Pipeline</h3>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.active}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{summary.converted}</p>
          <p className="text-xs text-gray-500">Converted</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">
            {summary.onHold + summary.futureClient}
          </p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-2">
        {byStatus.map(({ status, count }: { status: string; count: number }) => (
          <Link
            key={status}
            to={`${basePath}/leads?status=${status}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
                )}
              >
                {STATUS_ICONS[status] || <Users className="w-4 h-4" />}
              </span>
              <span className="text-sm text-gray-700">
                {getLeadStatusLabel(status)}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900">{count}</span>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
        <Link
          to={`${basePath}/leads/new`}
          className="btn btn-outline btn-sm flex-1"
        >
          Add Lead
        </Link>
        <Link
          to={`${basePath}/leads`}
          className="btn btn-designer btn-sm flex-1"
        >
          View All
        </Link>
      </div>
    </div>
  );
}
