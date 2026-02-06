import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Bell, Palette, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Tab = 'profile' | 'password' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account settings</p>
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
