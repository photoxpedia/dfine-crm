import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import { projectsApi } from '@/lib/api';
import LeadStatsWidget from './LeadStatsWidget';
import FollowUpsWidget from './FollowUpsWidget';
import type { Project } from '@/types';

const stats = [
  {
    name: 'Active Projects',
    value: '12',
    change: '+2',
    trend: 'up',
    icon: FolderKanban,
  },
  {
    name: 'Total Revenue',
    value: formatCurrency(287500),
    change: '+12%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    name: 'Pending Payments',
    value: formatCurrency(45200),
    change: '-8%',
    trend: 'down',
    icon: TrendingUp,
  },
  {
    name: 'Active Designers',
    value: '5',
    change: '0',
    trend: 'neutral',
    icon: Users,
  },
];

export default function AdminDashboard() {
  const basePath = '/admin';

  // Fetch recent projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { limit: 5 }],
    queryFn: async () => {
      const response = await projectsApi.list({ limit: 5 });
      return response.data;
    },
  });

  const recentProjects = (projectsData?.projects || []) as Project[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-admin-50 rounded-lg">
                <stat.icon className="w-6 h-6 text-admin-600" />
              </div>
              <span
                className={`flex items-center text-sm font-medium ${
                  stat.trend === 'up'
                    ? 'text-green-600'
                    : stat.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.change}
                {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4 ml-1" />}
                {stat.trend === 'down' && <ArrowDownRight className="w-4 h-4 ml-1" />}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lead Stats + Follow-ups */}
      <div className="grid lg:grid-cols-2 gap-6">
        <LeadStatsWidget basePath={basePath} />
        <FollowUpsWidget basePath={basePath} />
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <Link to={`${basePath}/projects`} className="text-sm text-admin-600 hover:text-admin-700 font-medium">
            View all
          </Link>
        </div>
        {projectsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No projects yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Designer</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="font-medium text-gray-900">
                      <Link
                        to={`${basePath}/projects/${project.id}`}
                        className="hover:text-admin-600"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td>{project.designer?.name || 'Unassigned'}</td>
                    <td className="capitalize">{project.projectType}</td>
                    <td>
                      <span className={`badge ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
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
