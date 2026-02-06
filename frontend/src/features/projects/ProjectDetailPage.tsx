import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Edit,
  Trash2,
  Copy,
  Eye,
  XCircle,
  X,
  LayoutTemplate,
  FileSpreadsheet,
  ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi, estimatesApi } from '@/lib/api';
import { formatDate, formatCurrency, cn, getStatusColor, formatStatus, getBasePath } from '@/lib/utils';
import ProjectPaymentsTab from './ProjectPaymentsTab';
import ProjectMaterialsTab from './ProjectMaterialsTab';
import ProjectManagementTab from './ProjectManagementTab';
import ProjectCompletionReport from './ProjectCompletionReport';
import type { Project, Estimate, ProjectStatus } from '@/types';

const STATUS_OPTIONS: ProjectStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'estimates' | 'materials' | 'management' | 'documents' | 'payments'>('estimates');
  const [showNewEstimateModal, setShowNewEstimateModal] = useState(false);
  const [showCompletionReport, setShowCompletionReport] = useState(false);

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await projectsApi.get(id!);
      return response.data as Project;
    },
    enabled: !!id,
  });

  // Fetch estimates for this project
  const { data: estimatesData } = useQuery({
    queryKey: ['project-estimates', id],
    queryFn: async () => {
      const response = await estimatesApi.list(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: ProjectStatus) => {
      return projectsApi.updateStatus(id!, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Create estimate mutation
  const createEstimateMutation = useMutation({
    mutationFn: async ({ fromTemplate }: { fromTemplate: boolean }) => {
      return estimatesApi.create(id!, {
        name: `Estimate v${(estimatesData?.estimates?.length || 0) + 1}`,
        fromTemplate
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['project-estimates', id] });
      setShowNewEstimateModal(false);
      toast.success('Estimate created');
      navigate(`${basePath}/estimates/${response.data.id}`);
    },
    onError: () => {
      toast.error('Failed to create estimate');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return projectsApi.delete(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate(`${basePath}/projects`);
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
        <Link to={`${basePath}/projects`} className="text-designer-600 hover:text-designer-700">
          Back to projects
        </Link>
      </div>
    );
  }

  const estimates = estimatesData?.estimates || [];
  const latestEstimate = estimates[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to={`${basePath}/projects`}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={cn('badge', getStatusColor(project.status))}>
                {formatStatus(project.status)}
              </span>
            </div>
            {project.lead && (
              <p className="text-gray-500">
                {project.lead.firstName} {project.lead.lastName}
                {project.lead.email && ` - ${project.lead.email}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => updateStatusMutation.mutate(e.target.value as ProjectStatus)}
            className="input w-auto"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn btn-outline p-2"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      navigate(`${basePath}/projects/${id}/edit`);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Project
                  </button>
                  <button
                    onClick={() => {
                      setShowCompletionReport(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Completion Report
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-designer-100 rounded-lg">
              <MapPin className="w-5 h-5 text-designer-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              {project.address ? (
                <p className="font-medium text-gray-900">
                  {project.address}
                  {project.city && `, ${project.city}`}
                  {project.state && ` ${project.state}`}
                  {project.zip && ` ${project.zip}`}
                </p>
              ) : (
                <p className="text-gray-400">Not specified</p>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Schedule</p>
              {project.startDate ? (
                <p className="font-medium text-gray-900">
                  {formatDate(project.startDate)}
                  {project.endDate && ` - ${formatDate(project.endDate)}`}
                </p>
              ) : (
                <p className="text-gray-400">Not scheduled</p>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Estimate Total</p>
              {latestEstimate ? (
                <p className="font-medium text-gray-900">
                  {formatCurrency(latestEstimate.total)}
                </p>
              ) : (
                <p className="text-gray-400">No estimate</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('estimates')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              activeTab === 'estimates'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Estimates
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              activeTab === 'materials'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              activeTab === 'management'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Project Mgmt
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              activeTab === 'documents'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap',
              activeTab === 'payments'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Payments
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'estimates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Estimates</h2>
            <button
              onClick={() => setShowNewEstimateModal(true)}
              className="btn btn-designer"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Estimate
            </button>
          </div>

          {estimates.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates yet</h3>
              <p className="text-gray-500 mb-4">Create an estimate to start pricing this project</p>
              <button
                onClick={() => setShowNewEstimateModal(true)}
                className="btn btn-designer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Estimate
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {estimates.map((estimate: Estimate) => (
                <EstimateCard key={estimate.id} estimate={estimate} projectId={id!} basePath={basePath} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <ProjectMaterialsTab projectId={id!} />
      )}

      {activeTab === 'management' && (
        <ProjectManagementTab projectId={id!} />
      )}

      {activeTab === 'documents' && (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Documents</h3>
          <p className="text-gray-500">Document management coming soon</p>
        </div>
      )}

      {activeTab === 'payments' && (
        <ProjectPaymentsTab projectId={id!} />
      )}

      {/* Notes Section */}
      {project.notes && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{project.notes}</p>
        </div>
      )}

      {/* New Estimate Modal */}
      {showNewEstimateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500/75 transition-opacity"
              onClick={() => setShowNewEstimateModal(false)}
            />

            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Create New Estimate
                </h2>
                <button
                  onClick={() => setShowNewEstimateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-500 mb-4">
                  Choose how to start your estimate:
                </p>

                {/* Start Blank Option */}
                <button
                  onClick={() => createEstimateMutation.mutate({ fromTemplate: false })}
                  disabled={createEstimateMutation.isPending}
                  className="w-full flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-designer-300 hover:bg-designer-50 transition-colors text-left group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-designer-100">
                    <FileSpreadsheet className="w-6 h-6 text-gray-600 group-hover:text-designer-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Start Blank</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Create an empty estimate and add sections manually
                    </p>
                  </div>
                </button>

                {/* Use Template Option */}
                <button
                  onClick={() => createEstimateMutation.mutate({ fromTemplate: true })}
                  disabled={createEstimateMutation.isPending}
                  className="w-full flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-designer-300 hover:bg-designer-50 transition-colors text-left group"
                >
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-designer-100">
                    <LayoutTemplate className="w-6 h-6 text-gray-600 group-hover:text-designer-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Use {project.projectType === 'bathroom' ? 'Bathroom' : project.projectType === 'kitchen' ? 'Kitchen' : 'Standard'} Template
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Pre-populate sections from pricing categories
                    </p>
                  </div>
                </button>

                {createEstimateMutation.isPending && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-designer-600" />
                    <span className="ml-2 text-sm text-gray-600">Creating estimate...</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => setShowNewEstimateModal(false)}
                  className="w-full btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Report Modal */}
      {showCompletionReport && (
        <ProjectCompletionReport
          projectId={id!}
          projectStatus={project.status}
          onClose={() => setShowCompletionReport(false)}
        />
      )}
    </div>
  );
}

function EstimateCard({ estimate, projectId, basePath }: { estimate: Estimate; projectId: string; basePath: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.duplicate(estimate.id);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] });
      toast.success('Estimate duplicated');
      navigate(`${basePath}/estimates/${response.data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.delete(estimate.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] });
      toast.success('Estimate deleted');
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.updateStatus(estimate.id, 'sent');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] });
      toast.success('Estimate sent to client');
    },
  });

  const statusIcon = {
    draft: <Clock className="w-4 h-4 text-gray-400" />,
    sent: <Send className="w-4 h-4 text-blue-500" />,
    viewed: <Eye className="w-4 h-4 text-blue-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <AlertCircle className="w-4 h-4 text-red-500" />,
    expired: <XCircle className="w-4 h-4 text-gray-400" />,
  }[estimate.status] || <Clock className="w-4 h-4 text-gray-400" />;

  const statusColor = {
    draft: 'badge-gray',
    sent: 'badge-blue',
    viewed: 'badge-blue',
    approved: 'badge-green',
    rejected: 'badge-red',
    expired: 'badge-gray',
  }[estimate.status] || 'badge-gray';

  return (
    <div
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`${basePath}/estimates/${estimate.id}`)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <p className="font-medium text-gray-900">
              {estimate.name || `Estimate v${estimate.version}`}
            </p>
            <p className="text-sm text-gray-500">
              Created {formatDate(estimate.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-gray-900">{formatCurrency(estimate.total)}</p>
            <p className="text-xs text-gray-500">{estimate.marginPercentage}% margin</p>
          </div>

          <span className={cn('badge', statusColor)}>
            {estimate.status}
          </span>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      navigate(`${basePath}/estimates/${estimate.id}`);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Estimate
                  </button>
                  {estimate.status === 'draft' && (
                    <button
                      onClick={() => {
                        sendMutation.mutate();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Send className="w-4 h-4" />
                      Send to Client
                    </button>
                  )}
                  <button
                    onClick={() => {
                      duplicateMutation.mutate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      if (confirm('Delete this estimate?')) {
                        deleteMutation.mutate();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
