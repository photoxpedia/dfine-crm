import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Loader2,
  Building2,
  MoreVertical,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Vendor } from '@/types';

// Vendors API
const vendorsApi = {
  list: (params?: { search?: string; isActive?: boolean }) =>
    api.get('/vendors', { params }),
  get: (id: string) => api.get(`/vendors/${id}`),
  create: (data: Partial<Vendor>) => api.post('/vendors', data),
  update: (id: string, data: Partial<Vendor>) => api.put(`/vendors/${id}`, data),
  delete: (id: string) => api.delete(`/vendors/${id}`),
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', { search }],
    queryFn: async () => {
      const response = await vendorsApi.list({ search: search || undefined });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted');
    },
    onError: () => toast.error('Failed to delete vendor'),
  });

  const vendors = data?.vendors || [];

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingVendor(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your suppliers and vendors</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Vendor Form Modal */}
      {showForm && (
        <VendorFormModal
          vendor={editingVendor}
          onClose={handleCloseForm}
        />
      )}

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-500 mb-4">
            {search ? 'Try a different search term' : 'Add your first vendor to get started'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor: Vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={() => handleEdit(vendor)}
              onDelete={() => {
                if (confirm('Delete this vendor?')) {
                  deleteMutation.mutate(vendor.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorCard({
  vendor,
  onEdit,
  onDelete,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-admin-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-admin-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
            {vendor.contactName && (
              <p className="text-sm text-gray-500">{vendor.contactName}</p>
            )}
          </div>
        </div>

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
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete();
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

      <div className="space-y-2 text-sm">
        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <Phone className="w-4 h-4" />
            {vendor.phone}
          </a>
        )}
        {vendor.email && (
          <a
            href={`mailto:${vendor.email}`}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <Mail className="w-4 h-4" />
            {vendor.email}
          </a>
        )}
        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <Globe className="w-4 h-4" />
            {vendor.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        {vendor.address && (
          <div className="flex items-start gap-2 text-gray-500">
            <MapPin className="w-4 h-4 mt-0.5" />
            <span>{vendor.address}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className={cn(
          'text-xs font-medium px-2 py-1 rounded-full',
          vendor.isActive
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        )}>
          {vendor.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function VendorFormModal({
  vendor,
  onClose,
}: {
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!vendor;

  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    contactName: vendor?.contactName || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    website: vendor?.website || '',
    notes: vendor?.notes || '',
    isActive: vendor?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created');
      onClose();
    },
    onError: () => toast.error('Failed to create vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => vendorsApi.update(vendor!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor updated');
      onClose();
    },
    onError: () => toast.error('Failed to update vendor'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Vendor name is required');
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
        <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Vendor' : 'Add Vendor'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="ABC Supplies"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="input"
                placeholder="John Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="contact@abc.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input"
                placeholder="https://www.abc.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                placeholder="123 Industrial Blvd, City, ST 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="input"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300 text-admin-600 focus:ring-admin-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Active vendor
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isEditing ? 'Save Changes' : 'Add Vendor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
