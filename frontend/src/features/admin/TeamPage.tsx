import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users, Mail, Plus, Trash2, Shield, ShieldCheck, Crown,
  Loader2, Clock, X, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { organizationApi } from '@/lib/api';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  userRole: z.enum(['admin', 'designer']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Crown className="w-3 h-3" /> Owner
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Shield className="w-3 h-3" /> Member
        </span>
      );
  }
}

function getUserRoleBadge(role: string) {
  switch (role) {
    case 'admin':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Admin</span>;
    case 'designer':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Designer</span>;
    case 'client':
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">Client</span>;
    default:
      return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{role}</span>;
  }
}

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['organization-members'],
    queryFn: () => organizationApi.listMembers(),
  });

  const { data: invitesData } = useQuery({
    queryKey: ['organization-invites'],
    queryFn: () => organizationApi.listInvites(),
  });

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { userRole: 'designer' },
  });

  const sendInviteMutation = useMutation({
    mutationFn: (data: InviteFormData) =>
      organizationApi.sendInvite({ email: data.email, userRole: data.userRole }),
    onSuccess: () => {
      toast.success('Invitation sent!');
      queryClient.invalidateQueries({ queryKey: ['organization-invites'] });
      form.reset();
      setShowInviteForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => organizationApi.removeMember(memberId),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => organizationApi.revokeInvite(inviteId),
    onSuccess: () => {
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({ queryKey: ['organization-invites'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to revoke invitation');
    },
  });

  const members = membersData?.data?.members || [];
  const invites = invitesData?.data?.invites || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600 mt-1">Manage your team members and invitations</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="btn btn-designer"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Team Member
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Send Invitation</h2>
            <button onClick={() => setShowInviteForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={form.handleSubmit((data) => sendInviteMutation.mutate(data))} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  {...form.register('email')}
                  type="email"
                  placeholder="teammate@company.com"
                  className={`input pl-10 ${form.formState.errors.email ? 'input-error' : ''}`}
                />
              </div>
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select {...form.register('userRole')} className="input">
                <option value="designer">Designer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={sendInviteMutation.isPending}
              className="btn btn-designer whitespace-nowrap"
            >
              {sendInviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" /> Send
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Invitations ({invites.length})
            </h2>
          </div>
          <div className="divide-y">
            {invites.map((invite: any) => (
              <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{invite.email}</p>
                  <p className="text-sm text-gray-500">
                    Invited by {invite.invitedBy?.name} &middot; Expires{' '}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(invite.role)}
                  <button
                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Revoke invitation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-designer-500" />
            Team Members ({members.length})
          </h2>
        </div>
        {membersLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No team members yet</div>
        ) : (
          <div className="divide-y">
            {members.map((member: any) => (
              <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-designer-100 flex items-center justify-center">
                    <span className="text-designer-700 font-semibold text-sm">
                      {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.user?.name}</p>
                      {getUserRoleBadge(member.user?.role)}
                    </div>
                    <p className="text-sm text-gray-500">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(member.role)}
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.user?.name} from the team?`)) {
                          removeMemberMutation.mutate(member.id);
                        }
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
