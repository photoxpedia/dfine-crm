import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  FileEdit,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  Loader2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectManagementApi } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  reason?: string;
  costImpact: number;
  scheduleImpact?: string;
  status: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionNote?: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: FileEdit },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-400', icon: XCircle },
};

export default function ProjectChangeOrdersTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reason: '',
    costImpact: 0,
    scheduleImpact: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['project-change-orders', projectId],
    queryFn: async () => {
      const response = await projectManagementApi.listChangeOrders(projectId);
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return projectManagementApi.createChangeOrder(projectId, {
        ...formData,
        costImpact: formData.costImpact || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      toast.success('Change order created');
      setShowForm(false);
      setFormData({ title: '', description: '', reason: '', costImpact: 0, scheduleImpact: '' });
    },
    onError: () => {
      toast.error('Failed to create change order');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionNote }: { id: string; status: string; rejectionNote?: string }) => {
      return projectManagementApi.updateChangeOrderStatus(projectId, id, status, rejectionNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      toast.success('Change order updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return projectManagementApi.deleteChangeOrder(projectId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      toast.success('Change order deleted');
    },
  });

  const changeOrders: ChangeOrder[] = data?.changeOrders || [];
  const totalCostImpact = data?.totalCostImpact || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
          {totalCostImpact !== 0 && (
            <p className="text-sm text-gray-500">
              Total approved impact:{' '}
              <span className={cn('font-medium', totalCostImpact > 0 ? 'text-red-600' : 'text-green-600')}>
                {totalCostImpact > 0 ? '+' : ''}{formatCurrency(totalCostImpact)}
              </span>
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-designer">
          <Plus className="w-4 h-4 mr-2" />
          New Change Order
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-5 border-designer-200">
          <h3 className="font-medium text-gray-900 mb-4">New Change Order</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="e.g. Add tile backsplash"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[80px]"
                placeholder="Describe what needs to change..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="input"
                  placeholder="Client request, design issue, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Impact ($)</label>
                <input
                  type="number"
                  value={formData.costImpact}
                  onChange={(e) => setFormData({ ...formData, costImpact: parseFloat(e.target.value) || 0 })}
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Impact</label>
              <input
                type="text"
                value={formData.scheduleImpact}
                onChange={(e) => setFormData({ ...formData, scheduleImpact: e.target.value })}
                className="input"
                placeholder="e.g. +3 days, No impact"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!formData.title || !formData.description || createMutation.isPending}
                className="btn btn-designer"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Change Order
              </button>
              <button onClick={() => setShowForm(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Orders List */}
      {changeOrders.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <FileEdit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No change orders</h3>
          <p className="text-gray-500">Create a change order when the project scope needs to be modified</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => {
            const config = STATUS_CONFIG[co.status] || STATUS_CONFIG.draft;
            const StatusIcon = config.icon;

            return (
              <div key={co.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <StatusIcon className={cn('w-5 h-5', config.color.split(' ')[1])} />
                      <h4 className="font-medium text-gray-900">{co.title}</h4>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', config.color)}>
                        {config.label}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{co.description}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      {co.reason && <span>Reason: {co.reason}</span>}
                      {co.costImpact !== 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span className={cn('font-medium', Number(co.costImpact) > 0 ? 'text-red-600' : 'text-green-600')}>
                            {Number(co.costImpact) > 0 ? '+' : ''}{formatCurrency(Number(co.costImpact))}
                          </span>
                        </span>
                      )}
                      {co.scheduleImpact && <span>Schedule: {co.scheduleImpact}</span>}
                      <span>Created {formatDate(co.createdAt)}</span>
                      {co.createdBy && <span>by {co.createdBy.name}</span>}
                    </div>

                    {co.status === 'rejected' && co.rejectionNote && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{co.rejectionNote}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-3">
                    {co.status === 'draft' && (
                      <>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: co.id, status: 'pending_approval' })}
                          className="btn btn-outline btn-sm"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          Submit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this change order?')) deleteMutation.mutate(co.id);
                          }}
                          className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {co.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: co.id, status: 'approved' })}
                          className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const note = prompt('Rejection reason:');
                            if (note !== null) {
                              updateStatusMutation.mutate({ id: co.id, status: 'rejected', rejectionNote: note });
                            }
                          }}
                          className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
