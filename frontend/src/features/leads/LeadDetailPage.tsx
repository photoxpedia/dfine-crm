import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Building,
  Clock,
  CalendarClock,
  ArrowRight,
  MoreVertical,
  Trash2,
  MessageSquare,
  Users,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsApi, usersApi } from '@/lib/api';
import {
  formatDate,
  formatPhone,
  cn,
  getStatusColor,
  getLeadStatusLabel,
  getFollowUpReasonLabel,
  getBasePath,
} from '@/lib/utils';
import { useIsAdmin } from '@/store/authStore';
import { LeadTimeline, StatusChangeModal, PhotoUploader, PhotoGrid } from './components';
import type { Lead, LeadStatus, SubStatus, FollowUpReason, LeadHistory, LeadPhoto, User as UserType } from '@/types';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'timeline'>('details');
  const [quickNote, setQuickNote] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [contactType, setContactType] = useState<'call' | 'email' | 'meeting' | 'site_visit'>('call');

  // Get lead details
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await leadsApi.get(id!);
      return response.data as Lead;
    },
    enabled: !!id,
  });

  // Get lead history
  const { data: historyData } = useQuery({
    queryKey: ['lead', id, 'history'],
    queryFn: async () => {
      const response = await leadsApi.getHistory(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Get lead photos
  const { data: photosData } = useQuery({
    queryKey: ['lead', id, 'photos'],
    queryFn: async () => {
      const response = await leadsApi.getPhotos(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Get designers for assignment (admin only)
  const { data: designersData } = useQuery({
    queryKey: ['users', 'designers'],
    queryFn: async () => {
      const response = await usersApi.getDesigners();
      return response.data;
    },
    enabled: isAdmin,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      status: LeadStatus;
      subStatus?: SubStatus;
      note: string;
      followUpDate?: string;
      followUpReason?: FollowUpReason;
      followUpReasonOther?: string;
    }) => {
      return leadsApi.updateStatus(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
      setShowStatusModal(false);
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Assign lead mutation
  const assignMutation = useMutation({
    mutationFn: async (designerId: string) => {
      return leadsApi.assign(id!, designerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead assigned');
    },
    onError: () => {
      toast.error('Failed to assign lead');
    },
  });

  // Convert lead mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      return leadsApi.convert(id!);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead converted to project!');
      navigate(`${basePath}/projects/${response.data.id}`);
    },
    onError: () => {
      toast.error('Failed to convert lead');
    },
  });

  // Delete lead mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return leadsApi.delete(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted');
      navigate(`${basePath}/leads`);
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  // Upload photos mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async ({ files, tag }: { files: File[]; tag: string }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      formData.append('tag', tag);
      return leadsApi.uploadPhotos(id!, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'photos'] });
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'history'] });
      toast.success('Photos uploaded');
    },
    onError: () => {
      toast.error('Failed to upload photos');
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return leadsApi.deletePhoto(id!, photoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'photos'] });
      toast.success('Photo deleted');
    },
    onError: () => {
      toast.error('Failed to delete photo');
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return leadsApi.addNote(id!, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'history'] });
      toast.success('Note added');
      setQuickNote('');
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });

  // Log contact mutation
  const logContactMutation = useMutation({
    mutationFn: async ({ type, note }: { type: string; note: string }) => {
      return leadsApi.logContact(id!, type, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id, 'history'] });
      toast.success('Contact logged');
      setContactNote('');
    },
    onError: () => {
      toast.error('Failed to log contact');
    },
  });

  const history = (historyData?.history || []) as LeadHistory[];
  const photos = (photosData?.photos || []) as LeadPhoto[];
  const designers = (designersData?.users || []) as UserType[];

  const canConvert = lead && !['converted', 'dropped'].includes(lead.status);
  const showFollowUpInfo = lead && ['on_hold', 'future_client'].includes(lead.status) && lead.followUpDate;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lead not found</h3>
        <p className="text-gray-500 mb-4">This lead may have been deleted or you don't have access.</p>
        <Link to={`${basePath}/leads`} className="btn btn-designer">
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(`${basePath}/leads`)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <button
                onClick={() => setShowStatusModal(true)}
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity',
                  getStatusColor(lead.status)
                )}
              >
                {getLeadStatusLabel(lead.status, lead.subStatus)}
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1 capitalize">{lead.projectType} Project</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`${basePath}/leads/${id}/edit`} className="btn btn-outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn btn-outline p-2"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {canConvert && (
                    <button
                      onClick={() => {
                        convertMutation.mutate();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-designer-600 hover:bg-designer-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convert to Project
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this lead? This cannot be undone.')) {
                        deleteMutation.mutate();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Lead
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Follow-up Alert */}
      {showFollowUpInfo && (
        <div className="card bg-yellow-50 border-yellow-200 p-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                Follow-up scheduled for {formatDate(lead.followUpDate)}
              </p>
              {lead.followUpReason && (
                <p className="text-sm text-yellow-700 mt-0.5">
                  Reason: {getFollowUpReasonLabel(lead.followUpReason)}
                  {lead.followUpReasonOther && ` - ${lead.followUpReasonOther}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin: Designer Assignment */}
      {isAdmin && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Assigned Designer</span>
            </div>
            <select
              value={lead.designerId || ''}
              onChange={(e) => {
                if (e.target.value && e.target.value !== lead.designerId) {
                  assignMutation.mutate(e.target.value);
                }
              }}
              disabled={assignMutation.isPending}
              className="input w-auto"
            >
              <option value="">Select designer...</option>
              {designers.map((designer) => (
                <option key={designer.id} value={designer.id}>
                  {designer.name || designer.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['details', 'photos', 'timeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-designer-600 text-designer-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab}
              {tab === 'photos' && photos.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {photos.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-4">
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-gray-900 hover:text-designer-600"
                    >
                      {formatPhone(lead.phone)}
                    </a>
                  </div>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-gray-900 hover:text-designer-600"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}
              {(lead.address || lead.city || lead.state || lead.zip) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">
                      {lead.address && <span>{lead.address}<br /></span>}
                      {lead.city && <span>{lead.city}, </span>}
                      {lead.state && <span>{lead.state} </span>}
                      {lead.zip && <span>{lead.zip}</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Details */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Project Type</p>
                  <p className="text-gray-900 capitalize">{lead.projectType}</p>
                </div>
              </div>
              {lead.source && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Lead Source</p>
                    <p className="text-gray-900">{lead.source}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900">{formatDate(lead.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-900">{formatDate(lead.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="card p-6 md:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Designer Info (non-admin view) */}
          {!isAdmin && lead.designer && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Assigned To</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-designer-100 flex items-center justify-center text-designer-700 font-medium">
                  {lead.designer.name?.charAt(0) || lead.designer.email.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{lead.designer.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-500">{lead.designer.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-6">
          <PhotoUploader
            onUpload={async (files, tag) => {
              await uploadPhotosMutation.mutateAsync({ files, tag });
            }}
            isUploading={uploadPhotosMutation.isPending}
          />
          <PhotoGrid
            photos={photos}
            onDelete={(photoId) => deletePhotoMutation.mutate(photoId)}
            isDeleting={deletePhotoMutation.isPending}
          />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Quick Actions Row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Add Quick Note */}
            <div className="card p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Quick Note
              </h4>
              <div className="flex gap-2">
                <textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Add a note..."
                  className="input text-sm min-h-[60px] flex-1"
                  rows={2}
                />
                <button
                  onClick={() => addNoteMutation.mutate(quickNote)}
                  disabled={!quickNote.trim() || addNoteMutation.isPending}
                  className="btn btn-designer self-end"
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Log Contact Activity */}
            <div className="card p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Log Contact
              </h4>
              <div className="flex gap-1.5 mb-2">
                {([
                  { value: 'call', label: 'Call', icon: Phone },
                  { value: 'email', label: 'Email', icon: Mail },
                  { value: 'meeting', label: 'Meeting', icon: Users },
                  { value: 'site_visit', label: 'Site Visit', icon: MapPin },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setContactType(value)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium transition-colors',
                      contactType === value
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  placeholder={`What happened during the ${contactType.replace('_', ' ')}?`}
                  className="input text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && contactNote.trim()) {
                      logContactMutation.mutate({ type: contactType, note: contactNote });
                    }
                  }}
                />
                <button
                  onClick={() => logContactMutation.mutate({ type: contactType, note: contactNote })}
                  disabled={!contactNote.trim() || logContactMutation.isPending}
                  className="btn btn-designer"
                >
                  {logContactMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            <LeadTimeline history={history} />
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <StatusChangeModal
          currentStatus={lead.status}
          currentSubStatus={lead.subStatus}
          onClose={() => setShowStatusModal(false)}
          onSubmit={(data) => updateStatusMutation.mutate(data)}
          isLoading={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
}
