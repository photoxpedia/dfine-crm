import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';

// Layouts
import AdminLayout from '@/components/layout/AdminLayout';
import DesignerLayout from '@/components/layout/DesignerLayout';
import ClientLayout from '@/components/layout/ClientLayout';

// Auth pages
import LoginPage from '@/features/auth/LoginPage';
import VerifyPage from '@/features/auth/VerifyPage';
import ClientInvitePage from '@/features/auth/ClientInvitePage';

// Dashboard pages
import AdminDashboard from '@/features/dashboard/AdminDashboard';
import DesignerDashboard from '@/features/dashboard/DesignerDashboard';
import ClientDashboard from '@/features/dashboard/ClientDashboard';

// Lead pages
import LeadsListPage from '@/features/leads/LeadsListPage';
import LeadFormPage from '@/features/leads/LeadFormPage';

// Project pages
import ProjectsListPage from '@/features/projects/ProjectsListPage';
import ProjectDetailPage from '@/features/projects/ProjectDetailPage';

// Estimate pages
import EstimatesListPage from '@/features/estimates/EstimatesListPage';
import EstimateBuilderPage from '@/features/estimates/EstimateBuilderPage';
import EstimateApprovalPage from '@/features/estimates/EstimateApprovalPage';

// Admin pages
import UsersPage from '@/features/admin/UsersPage';
import PricingConfigPage from '@/features/admin/PricingConfigPage';
import VendorsPage from '@/features/admin/VendorsPage';
import CrewsPage from '@/features/admin/CrewsPage';
import PurchasingPage from '@/features/admin/PurchasingPage';
import SettingsPage from '@/features/admin/SettingsPage';
import ContractTemplatesPage from '@/features/admin/ContractTemplatesPage';

// Document pages
import DocumentsPage from '@/features/documents/DocumentsPage';

// Payment pages
import PaymentsPage from '@/features/payments/PaymentsPage';

// Project form
import ProjectFormPage from '@/features/projects/ProjectFormPage';

// Protected route component
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-designer-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'designer':
        return <Navigate to="/designer" replace />;
      case 'client':
        return <Navigate to="/client" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

// Placeholder page for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">This page is coming soon.</p>
    </div>
  );
}

export default function App() {
  const { setUser, setLoading, token, user } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authApi.getMe();
          setUser(response.data.user);
        } catch {
          // Token is invalid
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token, setUser, setLoading]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route path="/client/invite" element={<ClientInvitePage />} />
      <Route path="/estimate/approve/:token" element={<EstimateApprovalPage />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="leads" element={<LeadsListPage />} />
        <Route path="leads/new" element={<LeadFormPage />} />
        <Route path="leads/:id" element={<LeadFormPage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="estimates" element={<EstimatesListPage />} />
        <Route path="estimates/:id" element={<EstimateBuilderPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="pricing" element={<PricingConfigPage />} />
        <Route path="purchasing" element={<PurchasingPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="crews" element={<CrewsPage />} />
        <Route path="contracts" element={<ContractTemplatesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Designer routes */}
      <Route
        path="/designer"
        element={
          <ProtectedRoute allowedRoles={['admin', 'designer']}>
            <DesignerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DesignerDashboard />} />
        <Route path="leads" element={<LeadsListPage />} />
        <Route path="leads/new" element={<LeadFormPage />} />
        <Route path="leads/:id" element={<LeadFormPage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="estimates" element={<EstimatesListPage />} />
        <Route path="estimates/:id" element={<EstimateBuilderPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="purchasing" element={<PurchasingPage />} />
      </Route>

      {/* Client routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ClientDashboard />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate
              to={
                user.role === 'admin'
                  ? '/admin'
                  : user.role === 'designer'
                  ? '/designer'
                  : '/client'
              }
              replace
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
              <p className="text-gray-600 mb-4">Page not found</p>
              <a href="/" className="text-designer-600 hover:text-designer-700 font-medium">
                Go home
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
