import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Loader2,
  FolderKanban,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi } from '@/lib/api';
import { formatDate, formatCurrency, cn, getStatusColor, formatStatus, getBasePath } from '@/lib/utils';
import { downloadCSV } from '@/lib/export';
import type { Project, ProjectStatus, ProjectType } from '@/types';

const STATUS_OPTIONS: ProjectStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
];
const PROJECT_TYPES: ProjectType[] = ['bathroom', 'kitchen', 'general'];

export default function ProjectsListPage() {
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<ProjectType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: statusFilter, projectType: projectTypeFilter, page }],
    queryFn: async () => {
      const response = await projectsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        projectType: projectTypeFilter || undefined,
        page,
        limit: 20,
      });
      return response.data;
    },
  });

  const projects = data?.projects || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your active projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button
              onClick={() => {
                const csvData = projects.map((project: Project) => ({
                  'Name': project.name,
                  'Client': project.lead
                    ? `${project.lead.firstName} ${project.lead.lastName}`
                    : '',
                  'Address': project.address || '',
                  'City': project.city || '',
                  'State': project.state || '',
                  'Project Type': project.projectType || '',
                  'Status': formatStatus(project.status),
                  'Start Date': project.startDate
                    ? new Date(project.startDate).toLocaleDateString()
                    : '',
                  'End Date': project.endDate
                    ? new Date(project.endDate).toLocaleDateString()
                    : '',
                  'Created': project.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
                    : '',
                }));
                downloadCSV(csvData, `projects-export-${new Date().toISOString().split('T')[0]}`);
                toast.success('Projects exported to CSV');
              }}
              className="btn btn-outline"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          )}
          <Link to={`${basePath}/projects/new`} className="btn btn-designer">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'btn btn-outline',
              (statusFilter || projectTypeFilter) && 'border-designer-300 text-designer-700'
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
                className="input"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
              <select
                value={projectTypeFilter}
                onChange={(e) => setProjectTypeFilter(e.target.value as ProjectType | '')}
                className="input"
              >
                <option value="">All Types</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatStatus(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter || projectTypeFilter
              ? 'Try adjusting your filters'
              : 'Create your first project or convert a lead'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: Project) => (
            <ProjectCard key={project.id} project={project} basePath={basePath} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, basePath }: { project: Project; basePath: string }) {
  const navigate = useNavigate();
  const latestEstimate = project.estimates?.[0];

  return (
    <div
      onClick={() => navigate(`${basePath}/projects/${project.id}`)}
      className="card p-5 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          {project.lead && (
            <p className="text-sm text-gray-500 truncate">
              {project.lead.firstName} {project.lead.lastName}
            </p>
          )}
        </div>
        <span className={cn('badge ml-2 flex-shrink-0', getStatusColor(project.status))}>
          {formatStatus(project.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {project.address && (
          <p className="text-gray-500 truncate">
            {project.address}, {project.city}
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{project.startDate ? formatDate(project.startDate) : 'Not scheduled'}</span>
          </div>
        </div>

        {latestEstimate && (
          <div className="flex items-center gap-1 text-gray-900 font-medium">
            <DollarSign className="w-4 h-4" />
            <span>{formatCurrency(latestEstimate.total)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{project.projectType}</span>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </div>
    </div>
  );
}
