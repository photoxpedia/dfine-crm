import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Bell, Palette, Loader2, Check, Building, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'profile' | 'password' | 'organization' | 'billing' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    { id: 'organization', label: 'Organization', icon: <Building className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and organization settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="card p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-admin-50 text-admin-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'password' && <PasswordSettings />}
          {activeTab === 'organization' && <OrganizationSettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuthStore();

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            defaultValue={user?.name}
            className="input max-w-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            defaultValue={user?.email}
            disabled
            className="input max-w-md bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            disabled
            className="input max-w-md bg-gray-50"
          />
        </div>

        <div className="pt-4">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            required
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn btn-primary"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}

function OrganizationSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.get(),
  });

  const org = data?.data;

  const [formData, setFormData] = useState<any>(null);

  // Initialize form when data loads
  if (org && !formData) {
    setFormData({
      name: org.name || '',
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      city: org.city || '',
      state: org.state || '',
      zip: org.zip || '',
    });
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => organizationApi.update(data),
    onSuccess: () => {
      toast.success('Organization updated');
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update organization');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
      </div>
    );
  }

  if (!formData) return null;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="input"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="(555) 555-5555"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="info@company.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {org?.slug && (
          <div className="bg-gray-50 rounded-lg p-3 mt-4">
            <p className="text-sm text-gray-600">
              Organization slug: <code className="bg-gray-200 px-1 rounded">{org.slug}</code>
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Organization
          </button>
        </div>
      </form>
    </div>
  );
}

function BillingSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.get(),
  });

  const org = data?.data;

  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
      </div>
    );
  }

  const planName = org?.subscriptionPlan
    ? org.subscriptionPlan.charAt(0).toUpperCase() + org.subscriptionPlan.slice(1)
    : 'Unknown';

  const statusColors: Record<string, string> = {
    trialing: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    past_due: 'bg-red-100 text-red-800',
    canceled: 'bg-gray-100 text-gray-800',
    unpaid: 'bg-red-100 text-red-800',
  };

  const statusLabel: Record<string, string> = {
    trialing: 'Free Trial',
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$49',
      period: '/mo',
      features: ['Up to 3 team members', 'Up to 50 projects', 'Basic reporting', 'Email support'],
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$99',
      period: '/mo',
      features: ['Up to 10 team members', 'Unlimited projects', 'Advanced reporting', 'Priority support', 'Custom branding'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$249',
      period: '/mo',
      features: ['Unlimited team members', 'Unlimited projects', 'Custom integrations', 'Dedicated support', 'API access', 'SSO'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-gray-900">{planName}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                statusColors[org?.subscriptionStatus || 'trialing'] || statusColors.trialing
              }`}>
                {statusLabel[org?.subscriptionStatus || 'trialing'] || org?.subscriptionStatus}
              </span>
            </div>
            {org?.trialEndsAt && org?.subscriptionStatus === 'trialing' && (
              <p className="text-sm text-gray-500 mt-1">
                Trial ends on {new Date(org.trialEndsAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {org?._count && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
            <div>
              <p className="text-2xl font-bold text-gray-900">{org._count.members}</p>
              <p className="text-sm text-gray-500">Team Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{org._count.projects}</p>
              <p className="text-sm text-gray-500">Projects</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{org._count.leads}</p>
              <p className="text-sm text-gray-500">Leads</p>
            </div>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = org?.subscriptionPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`border rounded-xl p-6 ${
                  isCurrent ? 'border-designer-500 bg-designer-50 ring-1 ring-designer-500' : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-6 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-designer-100 text-designer-700 cursor-default'
                      : 'bg-designer-600 text-white hover:bg-designer-700'
                  }`}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Stripe billing integration coming soon. Contact support for plan changes.
        </p>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);

  const notifications = [
    {
      id: 'email',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      value: emailNotifications,
      onChange: setEmailNotifications,
    },
    {
      id: 'projects',
      label: 'Project Updates',
      description: 'Get notified when projects are updated',
      value: projectUpdates,
      onChange: setProjectUpdates,
    },
    {
      id: 'payments',
      label: 'Payment Alerts',
      description: 'Receive alerts for payment status changes',
      value: paymentAlerts,
      onChange: setPaymentAlerts,
    },
  ];

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-center justify-between py-3 border-b last:border-0">
            <div>
              <p className="font-medium text-gray-900">{notification.label}</p>
              <p className="text-sm text-gray-500">{notification.description}</p>
            </div>
            <button
              onClick={() => notification.onChange(!notification.value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notification.value ? 'bg-admin-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notification.value ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <button className="btn btn-primary">Save Preferences</button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState('light');

  const themes = [
    { id: 'light', label: 'Light', description: 'Default light theme' },
    { id: 'dark', label: 'Dark', description: 'Dark theme for low-light environments' },
    { id: 'system', label: 'System', description: 'Follow system preference' },
  ];

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>

      <div className="space-y-3">
        {themes.map((t) => (
          <label
            key={t.id}
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
              theme === t.id ? 'border-admin-500 bg-admin-50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="theme"
                value={t.id}
                checked={theme === t.id}
                onChange={(e) => setTheme(e.target.value)}
                className="sr-only"
              />
              <div>
                <p className="font-medium text-gray-900">{t.label}</p>
                <p className="text-sm text-gray-500">{t.description}</p>
              </div>
            </div>
            {theme === t.id && (
              <Check className="w-5 h-5 text-admin-600" />
            )}
          </label>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Note: Dark theme is coming soon. Currently only light theme is available.
      </p>
    </div>
  );
}
