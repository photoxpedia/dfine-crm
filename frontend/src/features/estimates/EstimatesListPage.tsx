import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Calculator,
  Filter,
  Loader2,
  Calendar,
  DollarSign,
  ExternalLink,
  CheckCircle,
  Clock,
  Send,
  XCircle,
} from 'lucide-react';
import { projectsApi, estimatesApi } from '@/lib/api';
import { formatDate, formatCurrency, cn, formatStatus, getBasePath } from '@/lib/utils';

type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired';

const statusColors: Record<EstimateStatus, string> = {
  draft: 'badge-gray',
  sent: 'badge-blue',
  viewed: 'badge-purple',
  approved: 'badge-green',
  rejected: 'badge-red',
  expired: 'badge-yellow',
};

const statusIcons: Record<EstimateStatus, React.ReactNode> = {
  draft: <Clock className="w-4 h-4" />,
  sent: <Send className="w-4 h-4" />,
  viewed: <ExternalLink className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  expired: <Clock className="w-4 h-4" />,
};

export default function EstimatesListPage() {
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all projects first
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-estimates'],
    queryFn: async () => {
      const response = await projectsApi.list({ limit: 100 });
      return response.data;
    },
  });

  const projects = projectsData?.projects || [];

  // Fetch estimates for all projects
  const { data: allEstimates, isLoading: estimatesLoading } = useQuery({
    queryKey: ['all-estimates', projects.map((p: any) => p.id)],
    queryFn: async () => {
      const estimatePromises = projects.map(async (project: any) => {
        try {
          const response = await estimatesApi.listForProject(project.id);
          return (response.data.estimates || []).map((est: any) => ({
            ...est,
            project,
          }));
        } catch {
          return [];
        }
      });
      const results = await Promise.all(estimatePromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  const isLoading = projectsLoading || estimatesLoading;
  const estimates = allEstimates || [];

  // Filter estimates
  const filteredEstimates = estimates.filter((est: any) => {
    if (statusFilter && est.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        est.name?.toLowerCase().includes(searchLower) ||
        est.project?.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Sort by most recent first
  const sortedEstimates = [...filteredEstimates].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage all project estimates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', status: 'draft', color: 'text-gray-600' },
          { label: 'Sent', status: 'sent', color: 'text-blue-600' },
          { label: 'Approved', status: 'approved', color: 'text-green-600' },
          { label: 'Rejected', status: 'rejected', color: 'text-red-600' },
        ].map((stat) => {
          const count = estimates.filter((est: any) => est.status === stat.status).length;
          return (
            <div key={stat.status} className="card p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search estimates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn btn-outline', statusFilter && 'border-designer-300 text-designer-700')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as EstimateStatus | '')}
                className="input"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Estimates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
        </div>
      ) : sortedEstimates.length === 0 ? (
        <div className="card p-12 text-center">
          <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates found</h3>
          <p className="text-gray-500">
            Create estimates from within a project.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Estimate</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEstimates.map((estimate: any) => (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Calculator className="w-5 h-5 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">
                          {estimate.name || `Estimate v${estimate.version}`}
                        </span>
                        <p className="text-xs text-gray-500">v{estimate.version}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <Link
                      to={`${basePath}/projects/${estimate.project?.id}`}
                      className="hover:text-designer-600"
                    >
                      {estimate.project?.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      {formatCurrency(estimate.total)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn('badge inline-flex items-center gap-1', statusColors[estimate.status as EstimateStatus])}>
                      {statusIcons[estimate.status as EstimateStatus]}
                      {formatStatus(estimate.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(estimate.createdAt)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`${basePath}/estimates/${estimate.id}`}
                      className="btn btn-sm btn-outline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
