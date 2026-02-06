import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreVertical,
  Shield,
  UserCog,
  Users as UsersIcon,
  Loader2,
  X,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, cn, getInitials } from '@/lib/utils';
import type { User, UserRole } from '@/types';

// Users API
const usersApi = {
  list: (params?: { role?: string; search?: string }) =>
    api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: { email: string; name: string; role: UserRole }) =>
    api.post('/users', data),
  update: (id: string, data: Partial<User>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  sendInvite: (id: string) => api.post(`/users/${id}/send-invite`),
};

const ROLE_OPTIONS: { value: UserRole; label: string; icon: typeof Shield }[] = [
  { value: 'admin', label: 'Administrator', icon: Shield },
  { value: 'designer', label: 'Designer', icon: UserCog },
  { value: 'client', label: 'Client', icon: UsersIcon },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search, role: roleFilter }],
    queryFn: async () => {
      const response = await usersApi.list({
        search: search || undefined,
        role: roleFilter || undefined,
      });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const sendInviteMutation = useMutation({
    mutationFn: (id: string) => usersApi.sendInvite(id),
    onSuccess: () => {
      toast.success('Magic link sent!');
    },
    onError: () => toast.error('Failed to send invite'),
  });

  const users = data?.users || [];

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-admin-100 text-admin-700';
      case 'designer':
        return 'bg-designer-100 text-designer-700';
      case 'client':
        return 'bg-client-100 text-client-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team members and clients</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
          className="input w-auto"
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={handleCloseForm}
        />
      )}

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500 mb-4">
            {search || roleFilter ? 'Try a different search' : 'Add your first user to get started'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Created</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: User) => (
                <UserRow
                  key={user.id}
                  user={user}
                  roleColor={getRoleColor(user.role)}
                  onEdit={() => handleEdit(user)}
                  onDelete={() => {
                    if (confirm('Delete this user?')) {
                      deleteMutation.mutate(user.id);
                    }
                  }}
                  onSendInvite={() => sendInviteMutation.mutate(user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  roleColor,
  onEdit,
  onDelete,
  onSendInvite,
}: {
  user: User;
  roleColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onSendInvite: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
              {getInitials(user.name || user.email)}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user.name || 'No name'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td>
        <span className={cn('badge', roleColor)}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      </td>
      <td className="text-sm text-gray-500">
        {formatDate(user.createdAt)}
      </td>
      <td>
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
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </button>
                <button
                  onClick={() => {
                    onSendInvite();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Send className="w-4 h-4" />
                  Send Magic Link
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function UserFormModal({
  user,
  onClose,
}: {
  user: User | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'designer' as UserRole,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created! Magic link will be sent.');
      onClose();
    },
    onError: () => toast.error('Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.update(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
      onClose();
    },
    onError: () => toast.error('Failed to update user'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit User' : 'Add User'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="john@example.com"
                disabled={isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="input"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {!isEditing && (
              <p className="text-sm text-gray-500">
                A magic link will be sent to the user's email to set up their account.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isEditing ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
