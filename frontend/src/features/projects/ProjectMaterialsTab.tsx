import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ShoppingCart,
  Truck,
  CheckCircle,
  Loader2,
  Search,
  ExternalLink,
  Calendar,
  PauseCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import api from '@/lib/api';

interface MaterialItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  productUrl?: string;
  imageUrl?: string;
  estimatedCost?: number;
  actualCost?: number;
  purchaseStatus: string;
  holdReason?: string;
  isPurchaseable: boolean;
  readyToPurchaseAt?: string;
  purchasedAt?: string;
  deliveredAt?: string;
  installedAt?: string;
}

interface ProjectMaterialsTabProps {
  projectId: string;
}

type MaterialStatus = 'pending' | 'on_hold' | 'ordered' | 'shipped' | 'delivered' | 'installed' | 'cancelled';

const STATUS_CONFIG: Record<MaterialStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Package;
}> = {
  pending: {
    label: 'Ready to Purchase',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: ShoppingCart,
  },
  on_hold: {
    label: 'On Hold',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    icon: PauseCircle,
  },
  ordered: {
    label: 'Ordered',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: Package,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: Package,
  },
  installed: {
    label: 'Installed',
    color: 'text-green-700',
    bgColor: 'bg-green-200',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    icon: Package,
  },
};

const STATUS_ORDER: MaterialStatus[] = ['pending', 'on_hold', 'ordered', 'shipped', 'delivered', 'installed'];

export default function ProjectMaterialsTab({ projectId }: ProjectMaterialsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | 'all'>('all');
  const queryClient = useQueryClient();

  // Fetch materials
  const { data: materialsData, isLoading } = useQuery({
    queryKey: ['project-materials', projectId, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get(`/purchasing/materials/${projectId}`, { params });
      return response.data;
    },
  });

  const materials: MaterialItem[] = materialsData?.materials || [];

  // Filter by search
  const filteredMaterials = materials.filter((m) => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search.toLowerCase());
  });

  // Group by status
  const groupedMaterials = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = filteredMaterials.filter((m) => m.purchaseStatus === status);
    return acc;
  }, {} as Record<MaterialStatus, MaterialItem[]>);

  // Calculate summary
  const summary = {
    total: materials.length,
    pending: materials.filter((m) => m.purchaseStatus === 'pending').length,
    onHold: materials.filter((m) => m.purchaseStatus === 'on_hold').length,
    ordered: materials.filter((m) => ['ordered', 'shipped'].includes(m.purchaseStatus)).length,
    delivered: materials.filter((m) => m.purchaseStatus === 'delivered').length,
    installed: materials.filter((m) => m.purchaseStatus === 'installed').length,
    estimatedCost: materials.reduce((sum, m) => sum + Number(m.estimatedCost || 0), 0),
    actualCost: materials.reduce((sum, m) => sum + Number(m.actualCost || 0), 0),
  };

  // Update material status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, holdReason }: { id: string; status: string; holdReason?: string }) => {
      return api.patch(`/purchasing/materials/${id}/status`, {
        status,
        statusDate: new Date().toISOString(),
        holdReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', projectId] });
      toast.success('Status updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Ready to Purchase</p>
          <p className="text-2xl font-bold text-gray-600">{summary.pending}</p>
        </div>
        {summary.onHold > 0 && (
          <div className="card p-4 border-amber-200">
            <p className="text-sm text-amber-600">On Hold</p>
            <p className="text-2xl font-bold text-amber-600">{summary.onHold}</p>
          </div>
        )}
        <div className="card p-4">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="text-2xl font-bold text-blue-600">{summary.ordered}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{summary.delivered}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Installed</p>
          <p className="text-2xl font-bold text-green-700">{summary.installed}</p>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Estimated Cost</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.estimatedCost)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Actual Cost</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.actualCost)}</p>
          </div>
          {summary.actualCost > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Variance</p>
              <p className={cn(
                'text-xl font-bold',
                summary.actualCost > summary.estimatedCost ? 'text-red-600' : 'text-green-600'
              )}>
                {summary.actualCost > summary.estimatedCost ? '+' : ''}
                {formatCurrency(summary.actualCost - summary.estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MaterialStatus | 'all')}
          className="input w-auto"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-500">
            Materials will be auto-generated when an estimate is approved
          </p>
        </div>
      ) : statusFilter === 'all' ? (
        // Show grouped by status
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const items = groupedMaterials[status];
            if (items.length === 0) return null;

            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className={cn('w-5 h-5', config.color)} />
                  <h3 className="font-medium text-gray-900">{config.label}</h3>
                  <span className="text-sm text-gray-500">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((material) => (
                    <MaterialCard
                      key={material.id}
                      material={material}
                      onStatusChange={(newStatus) => {
                        updateStatusMutation.mutate({ id: material.id, status: newStatus });
                      }}
                      onHold={(holdReason) => {
                        updateStatusMutation.mutate({ id: material.id, status: 'on_hold', holdReason });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Show flat list
        <div className="space-y-2">
          {filteredMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onStatusChange={(newStatus) => {
                updateStatusMutation.mutate({ id: material.id, status: newStatus });
              }}
              onHold={(holdReason) => {
                updateStatusMutation.mutate({ id: material.id, status: 'on_hold', holdReason });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Material Card Component
function MaterialCard({
  material,
  onStatusChange,
  onHold,
}: {
  material: MaterialItem;
  onStatusChange: (status: string) => void;
  onHold: (holdReason: string) => void;
}) {
  const [showHoldInput, setShowHoldInput] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const status = material.purchaseStatus as MaterialStatus;
  const config = STATUS_CONFIG[status];

  const getNextStatus = (current: MaterialStatus): MaterialStatus | null => {
    if (current === 'on_hold') return 'ordered'; // From hold, next is ordered (release)
    const normalOrder: MaterialStatus[] = ['pending', 'ordered', 'shipped', 'delivered', 'installed'];
    const index = normalOrder.indexOf(current);
    if (index >= 0 && index < normalOrder.length - 1) {
      return normalOrder[index + 1];
    }
    return null;
  };

  const nextStatus = getNextStatus(status);
  const canHold = status === 'pending'; // Only pending items can be put on hold

  return (
    <div className={cn(
      'card p-4',
      status === 'on_hold' && 'border-amber-200 bg-amber-50/50'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-medium text-gray-900 truncate">{material.name}</h4>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              config.bgColor,
              config.color
            )}>
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Qty: {material.quantity}</span>
            {material.estimatedCost && (
              <span>Est: {formatCurrency(Number(material.estimatedCost))}</span>
            )}
            {material.actualCost && (
              <span>Actual: {formatCurrency(Number(material.actualCost))}</span>
            )}
            {material.productUrl && (
              <a
                href={material.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-designer-600 hover:text-designer-700"
              >
                <ExternalLink className="w-3 h-3" />
                View Product
              </a>
            )}
          </div>

          {/* Hold reason */}
          {status === 'on_hold' && material.holdReason && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-3 py-1.5 rounded">
              <PauseCircle className="w-4 h-4 flex-shrink-0" />
              <span>{material.holdReason}</span>
            </div>
          )}

          {/* Status dates */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            {material.purchasedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Purchased: {formatDate(material.purchasedAt)}
              </span>
            )}
            {material.deliveredAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Delivered: {formatDate(material.deliveredAt)}
              </span>
            )}
            {material.installedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Installed: {formatDate(material.installedAt)}
              </span>
            )}
          </div>

          {/* Hold reason input */}
          {showHoldInput && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Reason for hold (e.g. Out of stock, Checking availability)"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="input text-sm flex-1"
                autoFocus
              />
              <button
                onClick={() => {
                  onHold(holdReason);
                  setShowHoldInput(false);
                  setHoldReason('');
                }}
                className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600"
              >
                Hold
              </button>
              <button
                onClick={() => {
                  setShowHoldInput(false);
                  setHoldReason('');
                }}
                className="btn btn-sm btn-outline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {canHold && !showHoldInput && (
            <button
              onClick={() => setShowHoldInput(true)}
              className="btn btn-outline text-sm text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <PauseCircle className="w-4 h-4 mr-1" />
              Hold
            </button>
          )}
          {status === 'on_hold' && (
            <button
              onClick={() => onStatusChange('pending')}
              className="btn btn-outline text-sm"
            >
              Release Hold
            </button>
          )}
          {nextStatus && status !== 'on_hold' && (
            <button
              onClick={() => onStatusChange(nextStatus)}
              className="btn btn-outline text-sm"
            >
              Mark as {STATUS_CONFIG[nextStatus].label}
            </button>
          )}
          {status === 'on_hold' && (
            <button
              onClick={() => onStatusChange('ordered')}
              className="btn btn-designer text-sm"
            >
              Mark Ordered
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
