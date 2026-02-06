import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  FolderKanban,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { formatDate, getLeadStatusLabel, getStatusColor } from '@/lib/utils';
import { leadsApi, projectsApi } from '@/lib/api';
import LeadStatsWidget from './LeadStatsWidget';
import FollowUpsWidget from './FollowUpsWidget';
import type { Lead, Project } from '@/types';

export default function DesignerDashboard() {
  const basePath = '/designer';

  // Fetch recent leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', { limit: 5 }],
    queryFn: async () => {
      const response = await leadsApi.list({ limit: 5 });
      return response.data;
    },
  });

  // Fetch active projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { status: 'in_progress', limit: 5 }],
    queryFn: async () => {
      const response = await projectsApi.list({ status: 'in_progress', limit: 5 });
      return response.data;
    },
  });

  const recentLeads = (leadsData?.leads || []) as Lead[];
  const activeProjects = (projectsData?.projects || []) as Project[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Here's your overview for today.</p>
        </div>
        <Link to={`${basePath}/leads/new`} className="btn btn-designer">
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Link>
      </div>

      {/* Top Row: Lead Stats + Follow-ups */}
      <div className="grid lg:grid-cols-2 gap-6">
        <LeadStatsWidget basePath={basePath} />
        <FollowUpsWidget basePath={basePath} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <Link
              to={`${basePath}/leads`}
              className="text-sm text-designer-600 hover:text-designer-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {leadsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No leads yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`${basePath}/leads/${lead.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{lead.projectType}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusColor(lead.status)}`}>
                      {getLeadStatusLabel(lead.status)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(lead.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Projects */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link
              to={`${basePath}/projects`}
              className="text-sm text-designer-600 hover:text-designer-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No active projects</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activeProjects.map((project) => (
                <Link
                  key={project.id}
                  to={`${basePath}/projects/${project.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <span className={`badge ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{project.projectType}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
