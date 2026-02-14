import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
  FolderKanban,
  Target,
  DollarSign,
  Loader2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

interface OrgMember {
  id: string;
  role: string;
  isDefault: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  updatedAt: string;
  members: OrgMember[];
  _count: {
    projects: number;
    leads: number;
    subscriptions: number;
  };
}

interface ProjectStat {
  status: string;
  _count: number;
}

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'past_due', label: 'Past Due' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  designer: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  owner: 'bg-purple-100 text-purple-700',
};

export default function SAOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin', 'organizations', id],
    queryFn: async () => {
      const response = await api.get(`/super-admin/organizations/${id}`);
      return response.data as {
        organization: OrgDetail;
        projectStats: ProjectStat[];
        totalRevenue: number;
      };
    },
    enabled: !!id,
  });

  const org = data?.organization;
  const projectStats = data?.projectStats || [];
  const totalRevenue = data?.totalRevenue ?? 0;

  const [subPlan, setSubPlan] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form values when data loads
  if (org && !initialized) {
    setSubPlan(org.subscriptionPlan);
    setSubStatus(org.subscriptionStatus);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await api.put(`/super-admin/organizations/${id}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'organizations'] });
      toast.success('Subscription updated');
    },
    onError: () => toast.error('Failed to update subscription'),
  });

  const handleSaveSubscription = () => {
    updateMutation.mutate({
      subscriptionPlan: subPlan,
      subscriptionStatus: subStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-24">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Organization not found</h3>
        <Link to="/super-admin/organizations" className="text-amber-600 hover:text-amber-700">
          Back to organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/super-admin/organizations"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5 font-mono">{org.slug}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Organization Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Info</h2>
            <dl className="grid sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{org.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{org.email || '--'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-4 h-4" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{org.phone || '--'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Website
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {org.website ? (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
                      {org.website}
                    </a>
                  ) : (
                    '--'
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Address
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {[org.address, org.city, org.state, org.zip].filter(Boolean).join(', ') || '--'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Members */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">
                Members ({org.members.length})
              </h2>
            </div>
            {org.members.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No members</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Org Role</th>
                    <th>User Role</th>
                    <th>Active</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {org.members.map((member) => (
                    <tr key={member.id}>
                      <td className="font-medium text-gray-900">{member.user.name || '--'}</td>
                      <td className="text-sm text-gray-500">{member.user.email}</td>
                      <td>
                        <span
                          className={cn(
                            'badge',
                            ROLE_BADGE_COLORS[member.role] || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'badge',
                            ROLE_BADGE_COLORS[member.user.role] || 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {member.user.role.charAt(0).toUpperCase() + member.user.role.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'inline-block w-2 h-2 rounded-full',
                            member.user.isActive ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        />
                      </td>
                      <td className="text-sm text-gray-500">{formatDate(member.user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={subPlan}
                  onChange={(e) => setSubPlan(e.target.value)}
                  className="input"
                >
                  {PLAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="input"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveSubscription}
                disabled={updateMutation.isPending}
                className="btn btn-primary w-full"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Subscription
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stats</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4" /> Total Projects
                </span>
                <span className="font-semibold text-gray-900">{org._count.projects}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Total Leads
                </span>
                <span className="font-semibold text-gray-900">{org._count.leads}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Members
                </span>
                <span className="font-semibold text-gray-900">{org.members.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Total Revenue
                </span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Project Stats by Status */}
          {projectStats.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects by Status</h2>
              <div className="space-y-2">
                {projectStats.map((stat) => (
                  <div key={stat.status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {stat.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{stat._count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Meta</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{formatDate(org.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-900">{formatDate(org.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="text-gray-900 font-mono text-xs">{org.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
