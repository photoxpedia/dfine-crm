import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  _count: {
    members: number;
    projects: number;
    leads: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'inactive', label: 'Inactive' },
];

const PLAN_BADGE_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-amber-100 text-amber-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-700',
  inactive: 'bg-gray-100 text-gray-500',
};

export default function SAOrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'organizations', { search, plan: planFilter, page }],
    queryFn: async () => {
      const response = await api.get('/super-admin/organizations', {
        params: {
          search: search || undefined,
          plan: planFilter || undefined,
          page,
          limit: 20,
        },
      });
      return response.data as { organizations: Organization[]; pagination: Pagination };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: any }) => {
      const response = await api.put(`/super-admin/organizations/${id}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
      toast.success('Organization updated');
      setEditingOrg(null);
    },
    onError: () => toast.error('Failed to update organization'),
  });

  const organizations = data?.organizations || [];
  const pagination = data?.pagination;

  const startEditing = (org: Organization) => {
    setEditingOrg(org.id);
    setEditPlan(org.subscriptionPlan);
    setEditStatus(org.subscriptionStatus);
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      data: {
        subscriptionPlan: editPlan,
        subscriptionStatus: editStatus,
      },
    });
  };

  const cancelEdit = () => {
    setEditingOrg(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage all organizations on the platform
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, slug, or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto"
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
          <p className="text-gray-500">
            {search || planFilter ? 'Try different search criteria' : 'No organizations on the platform yet'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Members</th>
                  <th>Projects</th>
                  <th>Leads</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-900">
                      <Link
                        to={`/super-admin/organizations/${org.id}`}
                        className="hover:text-amber-600"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="text-sm text-gray-500 font-mono">{org.slug}</td>
                    <td>
                      {editingOrg === org.id ? (
                        <select
                          value={editPlan}
                          onChange={(e) => setEditPlan(e.target.value)}
                          className="input py-1 text-xs w-32"
                        >
                          <option value="starter">Starter</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      ) : (
                        <span
                          className={cn(
                            'badge cursor-pointer',
                            PLAN_BADGE_COLORS[org.subscriptionPlan] || 'bg-gray-100 text-gray-700'
                          )}
                          onClick={() => startEditing(org)}
                          title="Click to edit"
                        >
                          {org.subscriptionPlan.charAt(0).toUpperCase() + org.subscriptionPlan.slice(1)}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingOrg === org.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="input py-1 text-xs w-28"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveEdit(org.id)}
                            disabled={updateMutation.isPending}
                            className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'badge',
                            STATUS_BADGE_COLORS[org.subscriptionStatus] || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {org.subscriptionStatus.replace('_', ' ').charAt(0).toUpperCase() +
                            org.subscriptionStatus.replace('_', ' ').slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{org._count.members}</td>
                    <td className="text-sm text-gray-600">{org._count.projects}</td>
                    <td className="text-sm text-gray-600">{org._count.leads}</td>
                    <td className="text-sm text-gray-500">{formatDate(org.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} organizations
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
