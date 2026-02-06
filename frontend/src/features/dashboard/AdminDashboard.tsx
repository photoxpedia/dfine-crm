import {
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

const recentProjects = [
  { name: 'Barbara Levin - Master Bath', designer: 'Tanya', status: 'In Progress', amount: 29154 },
  { name: 'Nora Zimmerman - Kitchen', designer: 'Tanya', status: 'Pending Approval', amount: 42500 },
  { name: 'Liu/Santillo - Kitchen', designer: 'Dan', status: 'Completed', amount: 38750 },
  { name: 'Christopher Linz - Multi-room', designer: 'Tanya', status: 'In Progress', amount: 67000 },
];

export default function AdminDashboard() {
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

      {/* Recent Projects */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <a href="/admin/projects" className="text-sm text-admin-600 hover:text-admin-700 font-medium">
            View all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Designer</th>
                <th>Status</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((project, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900">{project.name}</td>
                  <td>{project.designer}</td>
                  <td>
                    <span
                      className={`badge ${
                        project.status === 'Completed'
                          ? 'badge-green'
                          : project.status === 'In Progress'
                          ? 'badge-blue'
                          : 'badge-yellow'
                      }`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="text-right font-medium">{formatCurrency(project.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
