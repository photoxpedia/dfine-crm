import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Loader2,
  X,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadSourcesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { LeadSource } from '@/types';

export default function LeadSourcesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['lead-sources', { includeInactive: showInactive }],
    queryFn: async () => {
      const response = await leadSourcesApi.list(showInactive);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; sortOrder?: number }) =>
      leadSourcesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source created');
      setShowForm(false);
    },
    onError: () => toast.error('Failed to create lead source'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeadSource> }) =>
      leadSourcesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source updated');
      setEditingSource(null);
    },
    onError: () => toast.error('Failed to update lead source'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadSourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      toast.success('Lead source deleted');
    },
    onError: () => toast.error('Failed to delete lead source'),
  });

  const sources = (data?.sources || []) as LeadSource[];

  const handleEdit = (source: LeadSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSource(null);
  };

  const toggleActive = (source: LeadSource) => {
    updateMutation.mutate({
      id: source.id,
      data: { isActive: !source.isActive },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Sources</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage where your leads come from
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-admin-600 focus:ring-admin-500"
            />
            Show inactive
          </label>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <LeadSourceForm
          source={editingSource}
          onClose={handleCloseForm}
          onSubmit={(data) => {
            if (editingSource) {
              updateMutation.mutate({ id: editingSource.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Sources List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : sources.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No lead sources found
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first lead source to start tracking where leads come from
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th>Name</th>
                <th>Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className={cn(!source.isActive && 'opacity-50 bg-gray-50')}
                >
                  <td>
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                  </td>
                  <td>
                    <span className="font-medium text-gray-900">{source.name}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(source)}
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full transition-colors',
                        source.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {source.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(source)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this lead source? Leads using this source will keep their value.')) {
                            deleteMutation.mutate(source.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>
          Lead sources help you track where your leads are coming from. You can
          use these when creating or editing leads.
        </p>
      </div>
    </div>
  );
}

function LeadSourceForm({
  source,
  onClose,
  onSubmit,
  isLoading,
}: {
  source: LeadSource | null;
  onClose: () => void;
  onSubmit: (data: { name: string }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(source?.name || '');
  const isEditing = !!source;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    onSubmit({ name: name.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Lead Source' : 'Add Lead Source'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Website, Referral, Google Ads"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Source'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
