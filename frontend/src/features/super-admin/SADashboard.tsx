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
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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

export default function SADashboard() {
  const { data: stats, isLoading } = useQuery<PlatformStats>({
    queryKey: ['super-admin', 'stats'],
    queryFn: async () => {
      const response = await api.get('/super-admin/stats');
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
    </div>
  );
}
