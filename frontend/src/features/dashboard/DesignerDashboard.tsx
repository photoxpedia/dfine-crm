import { Link } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  FileText,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const stats = [
  { name: 'Active Leads', value: '8', icon: Users, color: 'bg-blue-50 text-blue-600' },
  { name: 'Projects in Progress', value: '4', icon: FolderKanban, color: 'bg-green-50 text-green-600' },
  { name: 'Pending Estimates', value: '3', icon: FileText, color: 'bg-yellow-50 text-yellow-600' },
  { name: 'Due This Week', value: '2', icon: Clock, color: 'bg-purple-50 text-purple-600' },
];

const recentLeads = [
  { id: '1', name: 'John Smith', projectType: 'Master Bathroom', status: 'new', date: '2024-01-15' },
  { id: '2', name: 'Sarah Johnson', projectType: 'Kitchen', status: 'contacted', date: '2024-01-14' },
  { id: '3', name: 'Mike Davis', projectType: 'Powder Room', status: 'qualified', date: '2024-01-13' },
];

const activeProjects = [
  { id: '1', name: 'Barbara Levin - Master Bath', status: 'in_progress', total: 29154, progress: 65 },
  { id: '2', name: 'Nora Zimmerman - Kitchen', status: 'approved', total: 42500, progress: 15 },
  { id: '3', name: 'Carlo Pio Roda - Bathroom', status: 'pending_approval', total: 18500, progress: 0 },
];

export default function DesignerDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Here's your overview for today.</p>
        </div>
        <Link to="/designer/leads/new" className="btn btn-designer">
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <Link
              to="/designer/leads"
              className="text-sm text-designer-600 hover:text-designer-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                to={`/designer/leads/${lead.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{lead.name}</p>
                  <p className="text-sm text-gray-500">{lead.projectType}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`badge ${
                      lead.status === 'new'
                        ? 'badge-blue'
                        : lead.status === 'contacted'
                        ? 'badge-yellow'
                        : 'badge-purple'
                    }`}
                  >
                    {lead.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(lead.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active Projects */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link
              to="/designer/projects"
              className="text-sm text-designer-600 hover:text-designer-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {activeProjects.map((project) => (
              <Link
                key={project.id}
                to={`/designer/projects/${project.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{project.name}</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(project.total)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-designer-500 h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-10">{project.progress}%</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
