import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DollarSign,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  HardHat,
  FileText,
  Tag,
  UserPlus,
  Shield,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { authApi, organizationApi } from '@/lib/api';
import NotificationBell from './NotificationBell';
import EmailVerificationBanner from './EmailVerificationBanner';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Leads', href: '/admin/leads', icon: UserPlus },
  { name: 'Projects', href: '/admin/projects', icon: FolderKanban },
  { name: 'Estimates', href: '/admin/estimates', icon: FileText },
  { name: 'Documents', href: '/admin/documents', icon: FileText },
  { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
  { name: 'Purchasing', href: '/admin/purchasing', icon: ShoppingCart },
  { name: 'Vendors', href: '/admin/vendors', icon: Building2 },
  { name: 'Crews', href: '/admin/crews', icon: HardHat },
  { name: 'Contracts', href: '/admin/contracts', icon: FileText },
  { name: 'Lead Sources', href: '/admin/lead-sources', icon: Tag },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Team', href: '/admin/team', icon: UserPlus },
  { name: 'Financial Reports', href: '/admin/reports/financial', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: orgsData } = useQuery({
    queryKey: ['my-orgs'],
    queryFn: () => organizationApi.getMyOrgs().then((res) => res.data),
  });

  const organizations = orgsData?.organizations || [];
  const currentOrg = organizations.find((o: any) => o.isDefault);
  const hasMultipleOrgs = organizations.length > 1;

  const handleSwitchOrg = async (orgId: string) => {
    setSwitching(true);
    try {
      await organizationApi.switchOrg(orgId);
      setOrgMenuOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600/75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-admin-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <span className="text-white font-semibold">ReModel Sync</span>
          </Link>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          {user?.isSuperAdmin && (
            <NavLink
              to="/super-admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-3 transition-colors bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30"
            >
              <Shield className="w-5 h-5" />
              Super Admin
            </NavLink>
          )}
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors',
                  isActive
                    ? 'bg-admin-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {hasMultipleOrgs && (
              <div className="relative ml-2">
                <button
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                  disabled={switching}
                >
                  {switching ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                  ) : (
                    <Building2 className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-700 max-w-[150px] truncate">
                    {currentOrg?.name || 'Select Org'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {orgMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOrgMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase">Switch Organization</p>
                      </div>
                      {organizations.map((org: any) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            if (!org.isDefault) {
                              handleSwitchOrg(org.id);
                            } else {
                              setOrgMenuOpen(false);
                            }
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between',
                            org.isDefault && 'bg-admin-50'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{org.name}</span>
                          </div>
                          {org.isDefault && (
                            <span className="text-xs bg-admin-100 text-admin-700 px-2 py-0.5 rounded-full flex-shrink-0">Current</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 lg:ml-0" />

            <div className="flex items-center gap-4">
              <NotificationBell basePath="/admin" />

              <div className="relative">
                <button
                  className="flex items-center gap-2 text-sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 bg-admin-100 text-admin-700 rounded-full flex items-center justify-center font-medium">
                    {user?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="hidden sm:block font-medium text-gray-700">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link
                        to="/admin/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <EmailVerificationBanner />

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
