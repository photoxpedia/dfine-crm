import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  ArrowRight,
  Loader2,
  CalendarClock,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsApi, dashboardApi } from '@/lib/api';
import { formatDate, formatPhone, cn, getStatusColor, getLeadStatusLabel, getBasePath } from '@/lib/utils';
import { StatusChangeModal } from './components';
import type { Lead, LeadStatus, ProjectType, SubStatus, FollowUpReason } from '@/types';

const STATUS_OPTIONS: LeadStatus[] = [
  'new',
  'contacted',
  'pre_estimate',
  'estimated',
  'converted',
  'on_hold',
  'future_client',
  'dropped',
];
const PROJECT_TYPES: ProjectType[] = ['bathroom', 'kitchen', 'general'];

export default function LeadsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<ProjectType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Get leads
  const { data, isLoading } = useQuery({
    queryKey: ['leads', { search, status: statusFilter, projectType: projectTypeFilter, page }],
    queryFn: async () => {
      const response = await leadsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        projectType: projectTypeFilter || undefined,
        page,
        limit: 20,
      });
      return response.data;
    },
  });

  // Get today's follow-ups for highlighting
  const { data: todayFollowups } = useQuery({
    queryKey: ['dashboard', 'followups', 'today'],
    queryFn: async () => {
      const response = await dashboardApi.getTodayFollowups();
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      status: LeadStatus;
      subStatus?: SubStatus;
      note: string;
      followUpDate?: string;
      followUpReason?: FollowUpReason;
      followUpReasonOther?: string;
    }) => {
      return leadsApi.updateStatus(data.id, {
        status: data.status,
        subStatus: data.subStatus,
        note: data.note,
        followUpDate: data.followUpDate,
        followUpReason: data.followUpReason,
        followUpReasonOther: data.followUpReasonOther,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
      setShowStatusModal(false);
      setSelectedLead(null);
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (id: string) => {
      return leadsApi.convert(id);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead converted to project!');
      navigate(`${basePath}/projects/${response.data.id}`);
    },
  });

  const leads = data?.leads || [];
  const pagination = data?.pagination;
  const todayLeadIds = new Set(todayFollowups?.leadIds || []);

  const handleStatusChange = (lead: Lead) => {
    setSelectedLead(lead);
    setShowStatusModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your potential clients
          </p>
        </div>
        <Link to={`${basePath}/leads/new`} className="btn btn-designer">
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
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
            {(statusFilter || projectTypeFilter) && (
              <span className="ml-2 w-5 h-5 bg-designer-100 text-designer-700 rounded-full text-xs flex items-center justify-center">
                {(statusFilter ? 1 : 0) + (projectTypeFilter ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
                className="input"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getLeadStatusLabel(status)}
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
                  <option key={type} value={type} className="capitalize">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Leads List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
        </div>
      ) : leads.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-500 mb-4">
            {search || statusFilter || projectTypeFilter
              ? 'Try adjusting your filters'
              : 'Get started by adding your first lead'}
          </p>
          <Link to={`${basePath}/leads/new`} className="btn btn-designer">
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Project Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead: Lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    basePath={basePath}
                    isFollowUpToday={todayLeadIds.has(lead.id)}
                    onStatusChange={() => handleStatusChange(lead)}
                    onConvert={() => convertMutation.mutate(lead.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * pagination.limit + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
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
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedLead && (
        <StatusChangeModal
          currentStatus={selectedLead.status}
          currentSubStatus={selectedLead.subStatus}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedLead(null);
          }}
          onSubmit={(data) => {
            updateStatusMutation.mutate({
              id: selectedLead.id,
              ...data,
            });
          }}
          isLoading={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
}

function LeadRow({
  lead,
  basePath,
  isFollowUpToday,
  onStatusChange,
  onConvert,
}: {
  lead: Lead;
  basePath: string;
  isFollowUpToday: boolean;
  onStatusChange: () => void;
  onConvert: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const canConvert = !['converted', 'dropped'].includes(lead.status);

  return (
    <tr
      className={cn(
        'cursor-pointer',
        isFollowUpToday && 'bg-yellow-50 hover:bg-yellow-100'
      )}
      onClick={() => navigate(`${basePath}/leads/${lead.id}`)}
    >
      <td>
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-gray-900">
              {lead.firstName} {lead.lastName}
            </p>
            {lead.address && (
              <p className="text-sm text-gray-500 truncate max-w-xs">
                {lead.address}, {lead.city}
              </p>
            )}
          </div>
          {isFollowUpToday && (
            <span title="Follow-up due today">
              <CalendarClock className="w-4 h-4 text-yellow-600" />
            </span>
          )}
        </div>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="text-gray-500 hover:text-gray-700"
              title={formatPhone(lead.phone)}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="text-gray-500 hover:text-gray-700"
              title={lead.email}
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
      </td>
      <td>
        <span className="capitalize text-sm">{lead.projectType}</span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onStatusChange}
          className={cn(
            'text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer hover:opacity-80 transition-opacity',
            getStatusColor(lead.status)
          )}
        >
          {getLeadStatusLabel(lead.status, lead.subStatus)}
        </button>
      </td>
      <td className="text-sm text-gray-500">
        {formatDate(lead.createdAt)}
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    navigate(`${basePath}/leads/${lead.id}`);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  View Details
                </button>
                <button
                  onClick={() => {
                    onStatusChange();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Change Status
                </button>
                {canConvert && (
                  <button
                    onClick={() => {
                      onConvert();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-designer-600 hover:bg-designer-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Convert to Project
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
