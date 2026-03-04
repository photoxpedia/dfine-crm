import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  FolderKanban,
  Target,
  DollarSign,
  CreditCard,
  TrendingUp,
  UserPlus,
  Loader2,
  Shield,
} from 'lucide-react';
import api, { superAdminApi } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  totalProjects: number;
  totalLeads: number;
  totalRevenue: number;
  activeSubscriptions: number;
  newOrgsThisMonth: number;
  newUsersThisMonth: number;
}

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldData: Record<string, any> | null;
  newData: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string } | null;
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getActionColor(action: string): string {
  if (action.includes('impersonate')) return 'bg-red-100 text-red-700';
  if (action.includes('update_organization')) return 'bg-blue-100 text-blue-700';
  if (action.includes('update_user')) return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export default function SADashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: async () => {
      const response = await api.get('/super-admin/stats');
      return response.data;
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{
    logs: AuditLogEntry[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: ['super-admin', 'audit-log'],
    queryFn: async () => {
      const response = await superAdminApi.getAuditLog({ limit: 20 });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Organizations',
      value: stats?.totalOrgs ?? 0,
      icon: Building2,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      name: 'Total Projects',
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Total Leads',
      value: stats?.totalLeads ?? 0,
      icon: Target,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue ?? 0),
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      name: 'Active Subscriptions',
      value: stats?.activeSubscriptions ?? 0,
      icon: CreditCard,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      name: 'New Orgs (30d)',
      value: stats?.newOrgsThisMonth ?? 0,
      icon: TrendingUp,
      color: 'bg-cyan-50 text-cyan-600',
    },
    {
      name: 'New Users (30d)',
      value: stats?.newUsersThisMonth ?? 0,
      icon: UserPlus,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of the entire platform across all organizations.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.color.split(' ')[0]}`}>
                <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity / Audit Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {auditLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : !auditData?.logs || auditData.logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            No activity logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    When
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditData.logs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                      {entry.user?.name || entry.user?.email || 'System'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(entry.action)}`}>
                        {formatAction(entry.action)}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                      {entry.entityType} ({entry.entityId.slice(0, 8)}...)
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {entry.newData
                        ? Object.entries(entry.newData)
                            .filter(([, v]) => v !== undefined)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')
                        : '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400">
                      {entry.ipAddress || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
