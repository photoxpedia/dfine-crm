import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users as UsersIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface SAUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  organizationMemberships: {
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'designer', label: 'Designer' },
  { value: 'client', label: 'Client' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  designer: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
};

export default function SAUsersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'users', { search, role: roleFilter, isActive: activeFilter, page }],
    queryFn: async () => {
      const response = await api.get('/super-admin/users', {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
          isActive: activeFilter || undefined,
          page,
          limit: 20,
        },
      });
      return response.data as { users: SAUser[]; pagination: Pagination };
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.put(`/super-admin/users/${id}`, { isActive });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      toast.success('User status updated');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update user';
      toast.error(message);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/super-admin/users/${id}/impersonate`);
      return response.data as { token: string; user: any };
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      // Redirect based on user role
      const role = data.user.role;
      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'designer') {
        navigate('/designer');
      } else if (role === 'client') {
        navigate('/client');
      } else {
        navigate('/');
      }
      toast.success(`Now impersonating ${data.user.name || data.user.email}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to impersonate user';
      toast.error(message);
    },
  });

  const users = data?.users || [];
  const pagination = data?.pagination;

  const handleImpersonate = (user: SAUser) => {
    if (
      confirm(
        `Impersonate ${user.name || user.email}? You will be logged in as this user and redirected away from the Super Admin panel.`
      )
    ) {
      impersonateMutation.mutate(user.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage all users across all organizations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto"
        >
          {ACTIVE_OPTIONS.map((opt) => (
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
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">
            {search || roleFilter || activeFilter
              ? 'Try different search criteria'
              : 'No users on the platform yet'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Organizations</th>
                  <th>Created</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {user.name || '--'}
                        {user.isSuperAdmin && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                            SA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-sm text-gray-500">{user.email}</td>
                    <td>
                      <span
                        className={cn(
                          'badge',
                          ROLE_BADGE_COLORS[user.role] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            id: user.id,
                            isActive: !user.isActive,
                          })
                        }
                        disabled={toggleActiveMutation.isPending}
                        className={cn(
                          'flex items-center gap-1.5 text-sm font-medium transition-colors',
                          user.isActive
                            ? 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-gray-500'
                        )}
                        title={user.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {user.isActive ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {user.organizationMemberships.length === 0 ? (
                          <span className="text-sm text-gray-400">None</span>
                        ) : (
                          user.organizationMemberships.map((membership) => (
                            <div key={membership.id} className="text-sm">
                              <span className="text-gray-900">{membership.organization.name}</span>
                              <span className="text-gray-400 ml-1">({membership.role})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => handleImpersonate(user)}
                        disabled={!user.isActive || impersonateMutation.isPending}
                        className={cn(
                          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-colors',
                          user.isActive
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        )}
                        title={user.isActive ? 'Login as this user' : 'Cannot impersonate inactive user'}
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        Impersonate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
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
