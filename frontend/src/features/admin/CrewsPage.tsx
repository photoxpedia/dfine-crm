import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Loader2,
  X,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { crewsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Crew } from '@/types';

export default function CrewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['crews', search],
    queryFn: async () => {
      const response = await crewsApi.list({ search: search || undefined });
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: crewsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setEditingCrew(null);
      toast.success('Crew created');
    },
    onError: () => toast.error('Failed to create crew'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crewsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setEditingCrew(null);
      toast.success('Crew updated');
    },
    onError: () => toast.error('Failed to update crew'),
  });

  const deleteMutation = useMutation({
    mutationFn: crewsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success('Crew deleted');
    },
    onError: () => toast.error('Failed to delete crew'),
  });

  const crews = data?.crews || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      leadMemberName: formData.get('leadMemberName') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      email: formData.get('email') as string || undefined,
      specialty: formData.get('specialty') as string || undefined,
      hourlyRate: formData.get('hourlyRate') ? parseFloat(formData.get('hourlyRate') as string) : undefined,
      dailyRate: formData.get('dailyRate') ? parseFloat(formData.get('dailyRate') as string) : undefined,
      notes: formData.get('notes') as string || undefined,
    };

    if (editingCrew) {
      updateMutation.mutate({ id: editingCrew.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crews</h1>
          <p className="text-gray-500 text-sm mt-1">Manage work crews and labor</p>
        </div>
        <button
          onClick={() => {
            setEditingCrew(null);
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Crew
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search crews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Crews Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
        </div>
      ) : crews.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No crews found</h3>
          <p className="text-gray-500">Add your first crew to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crews.map((crew: Crew) => (
            <div key={crew.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{crew.name}</h3>
                  {crew.leadMemberName && (
                    <p className="text-sm text-gray-500">Lead: {crew.leadMemberName}</p>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(showMenu === crew.id ? null : crew.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showMenu === crew.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border py-1 z-10">
                      <button
                        onClick={() => {
                          setEditingCrew(crew);
                          setShowModal(true);
                          setShowMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this crew?')) {
                            deleteMutation.mutate(crew.id);
                          }
                          setShowMenu(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {crew.specialty && (
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded mb-3">
                  {crew.specialty}
                </span>
              )}

              <div className="space-y-2 text-sm">
                {crew.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    {crew.phone}
                  </div>
                )}
                {crew.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {crew.email}
                  </div>
                )}
              </div>

              {(crew.hourlyRate || crew.dailyRate) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-sm">
                  {crew.hourlyRate && (
                    <div>
                      <span className="text-gray-500">Hourly:</span>{' '}
                      <span className="font-medium">{formatCurrency(crew.hourlyRate)}</span>
                    </div>
                  )}
                  {crew.dailyRate && (
                    <div>
                      <span className="text-gray-500">Daily:</span>{' '}
                      <span className="font-medium">{formatCurrency(crew.dailyRate)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className={`${crew.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                  {crew.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingCrew ? 'Edit Crew' : 'Add Crew'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCrew(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crew Name *
                </label>
                <input
                  name="name"
                  defaultValue={editingCrew?.name}
                  required
                  className="input"
                  placeholder="e.g., Plumbing Team A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Member Name
                </label>
                <input
                  name="leadMemberName"
                  defaultValue={editingCrew?.leadMemberName || ''}
                  className="input"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    defaultValue={editingCrew?.phone || ''}
                    className="input"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingCrew?.email || ''}
                    className="input"
                    placeholder="crew@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialty
                </label>
                <input
                  name="specialty"
                  defaultValue={editingCrew?.specialty || ''}
                  className="input"
                  placeholder="e.g., Plumbing, Electrical, Tile"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <input
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    defaultValue={editingCrew?.hourlyRate || ''}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Rate
                  </label>
                  <input
                    name="dailyRate"
                    type="number"
                    step="0.01"
                    defaultValue={editingCrew?.dailyRate || ''}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingCrew?.notes || ''}
                  rows={3}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCrew(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn btn-primary"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingCrew ? 'Save Changes' : 'Create Crew'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
