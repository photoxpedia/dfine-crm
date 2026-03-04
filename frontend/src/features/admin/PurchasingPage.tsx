import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Package,
  Loader2,
  ExternalLink,
  Calendar,
  Building2,
  FileText,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { purchasingApi, organizationApi } from '@/lib/api';
import { formatDate, formatCurrency, cn, formatStatus } from '@/lib/utils';
import PurchaseOrderPdf from '@/components/pdf/PurchaseOrderPdf';

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
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

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
      {selectedPOId ? (
        <PODetailView
          poId={selectedPOId}
          onBack={() => setSelectedPOId(null)}
        />
      ) : (
        <>
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
                        <button
                          onClick={() => setSelectedPOId(po.id)}
                          className="text-admin-600 hover:text-admin-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
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
        </>
      )}
    </div>
  );
}

function PODetailView({ poId, onBack }: { poId: string; onBack: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['purchaseOrder', poId],
    queryFn: async () => {
      const response = await purchasingApi.get(poId);
      return response.data;
    },
  });

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await organizationApi.get();
      return response.data;
    },
  });

  const po = poData;
  const org = orgData;

  const handleDownloadPdf = async () => {
    if (!po) return;
    setDownloading(true);
    try {
      const blob = await pdf(
        <PurchaseOrderPdf
          po={po}
          companyName={org?.name || 'Company'}
          companyAddress={[org?.address, org?.city, org?.state, org?.zip].filter(Boolean).join(', ') || undefined}
          companyPhone={org?.phone || undefined}
          companyEmail={org?.email || undefined}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${po.poNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (poLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase order not found</h3>
        <button onClick={onBack} className="btn btn-outline mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {po.project?.name} - {po.vendor?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('badge', statusColors[po.status as POStatus])}>
            {formatStatus(po.status)}
          </span>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="btn btn-designer"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Vendor Information</h3>
          <p className="font-semibold text-gray-900">{po.vendor?.name}</p>
          {po.vendor?.contactName && (
            <p className="text-sm text-gray-600">Contact: {po.vendor.contactName}</p>
          )}
          {po.vendor?.email && (
            <p className="text-sm text-gray-600">{po.vendor.email}</p>
          )}
          {po.vendor?.phone && (
            <p className="text-sm text-gray-600">{po.vendor.phone}</p>
          )}
          {po.vendor?.address && (
            <p className="text-sm text-gray-600 mt-1">
              {po.vendor.address}
              {po.vendor.city && `, ${po.vendor.city}`}
              {po.vendor.state && `, ${po.vendor.state}`}
              {po.vendor.zip && ` ${po.vendor.zip}`}
            </p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Order Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Date Created</span>
              <span className="text-sm font-medium">{formatDate(po.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created By</span>
              <span className="text-sm font-medium">{po.createdBy?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Project</span>
              <span className="text-sm font-medium">{po.project?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Items ({po.items?.length || 0})
          </h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Item</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Qty Ordered</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Qty Received</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Unit Cost</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {po.items?.map((item: any) => (
              <tr key={item.id}>
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">
                    {item.materialItem?.name || 'Unknown'}
                  </p>
                  {item.materialItem?.description && (
                    <p className="text-sm text-gray-500">{item.materialItem.description}</p>
                  )}
                </td>
                <td className="py-3 px-4 text-center">{Number(item.quantityOrdered)}</td>
                <td className="py-3 px-4 text-center">{Number(item.quantityReceived)}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(item.unitCost)}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.totalCost)}</td>
              </tr>
            ))}
            {(!po.items || po.items.length === 0) && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No items in this purchase order
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t bg-gray-50 p-5">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span>{formatCurrency(po.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span>{formatCurrency(po.shipping)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-lg">{formatCurrency(po.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
