import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Package,
  Loader2,
  ExternalLink,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { purchasingApi } from '@/lib/api';
import { formatDate, formatCurrency, cn, formatStatus } from '@/lib/utils';

type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

const STATUS_OPTIONS: POStatus[] = ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'];

const statusColors: Record<POStatus, string> = {
  draft: 'badge-gray',
  sent: 'badge-blue',
  confirmed: 'badge-purple',
  partial: 'badge-yellow',
  received: 'badge-green',
  cancelled: 'badge-red',
};

export default function PurchasingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['purchaseOrders', { status: statusFilter, page }],
    queryFn: async () => {
      const response = await purchasingApi.list({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      return response.data;
    },
  });

  const purchaseOrders = data?.purchaseOrders || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchasing</h1>
          <p className="text-gray-500 text-sm mt-1">Manage purchase orders and deliveries</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', status: 'draft', color: 'text-gray-600' },
          { label: 'Sent', status: 'sent', color: 'text-blue-600' },
          { label: 'Partial', status: 'partial', color: 'text-yellow-600' },
          { label: 'Received', status: 'received', color: 'text-green-600' },
        ].map((stat) => {
          const count = purchaseOrders.filter((po: any) => po.status === stat.status).length;
          return (
            <div key={stat.status} className="card p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn btn-outline', statusFilter && 'border-admin-300 text-admin-700')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as POStatus | '')}
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
          </div>
        )}
      </div>

      {/* Purchase Orders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
          <p className="text-gray-500">
            Purchase orders are created from project material lists.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">PO #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Project</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchaseOrders.map((po: any) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{po.poNumber}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{po.project?.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {po.vendor?.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(po.total)}</td>
                  <td className="py-3 px-4">
                    <span className={cn('badge', statusColors[po.status as POStatus])}>
                      {formatStatus(po.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(po.createdAt)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/purchasing/${po.id}`}
                      className="text-admin-600 hover:text-admin-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
