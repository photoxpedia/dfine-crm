import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear both the direct token and zustand persisted auth
      localStorage.removeItem('token');
      localStorage.removeItem('zenith-auth');
      // Only redirect if not already on login page to prevent infinite loop
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string; companyName: string }) =>
    api.post('/auth/register', data),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  requestMagicLink: (email: string) =>
    api.post('/auth/magic-link', { email }),

  verifyMagicLink: (token: string) =>
    api.get(`/auth/verify?token=${token}`),

  createClientInvite: (projectId: string, email: string) =>
    api.post('/auth/client-invite', { projectId, email }),

  verifyClientInvite: (token: string) =>
    api.get(`/auth/client-invite/verify?token=${token}`),

  setPassword: (password: string) =>
    api.post('/auth/set-password', { password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  verifyEmail: (token: string) =>
    api.get(`/auth/verify-email?token=${token}`),

  resendVerification: () =>
    api.post('/auth/resend-verification'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),

  getMe: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// Leads API
export const leadsApi = {
  list: (params?: { status?: string; projectType?: string; search?: string; designerId?: string; page?: number; limit?: number }) =>
    api.get('/leads', { params }),

  get: (id: string) => api.get(`/leads/${id}`),

  create: (data: any) => api.post('/leads', data),

  update: (id: string, data: any) => api.put(`/leads/${id}`, data),

  updateStatus: (id: string, data: {
    status: string;
    subStatus?: string;
    note: string;
    followUpDate?: string;
    followUpReason?: string;
    followUpReasonOther?: string;
  }) => api.patch(`/leads/${id}/status`, data),

  assign: (id: string, designerId: string) =>
    api.patch(`/leads/${id}/assign`, { designerId }),

  addNote: (id: string, note: string) =>
    api.post(`/leads/${id}/notes`, { note }),

  logContact: (id: string, contactType: string, note: string) =>
    api.post(`/leads/${id}/contact`, { contactType, note }),

  getHistory: (id: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/leads/${id}/history`, { params }),

  uploadPhotos: (id: string, formData: FormData) =>
    api.post(`/leads/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getPhotos: (id: string) => api.get(`/leads/${id}/photos`),

  deletePhoto: (id: string, photoId: string) =>
    api.delete(`/leads/${id}/photos/${photoId}`),

  convert: (id: string) => api.post(`/leads/${id}/convert`),

  delete: (id: string) => api.delete(`/leads/${id}`),
};

// Lead Sources API
export const leadSourcesApi = {
  list: (includeInactive = false) =>
    api.get('/lead-sources', { params: { includeInactive } }),

  create: (data: { name: string; sortOrder?: number }) =>
    api.post('/lead-sources', data),

  update: (id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) =>
    api.put(`/lead-sources/${id}`, data),

  reorder: (sourceIds: string[]) =>
    api.patch('/lead-sources/reorder', { sourceIds }),

  delete: (id: string) => api.delete(`/lead-sources/${id}`),
};

// Notifications API
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),

  getUnreadCount: () => api.get('/notifications/unread-count'),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats').then(res => res.data),

  getFollowups: () => api.get('/dashboard/followups'),

  getTodayFollowups: () => api.get('/dashboard/followups/today'),

  getLeadStats: () => api.get('/dashboard/lead-stats'),

  getRecentActivity: (limit = 10) =>
    api.get('/dashboard/recent-activity', { params: { limit } }),
};

// Projects API
export const projectsApi = {
  list: (params?: { status?: string; projectType?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/projects', { params }),

  get: (id: string) => api.get(`/projects/${id}`),

  create: (data: any) => api.post('/projects', data),

  update: (id: string, data: any) => api.put(`/projects/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/projects/${id}/status`, { status }),

  getTimeline: (id: string) => api.get(`/projects/${id}/timeline`),

  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Estimates API
export const estimatesApi = {
  list: (projectId: string) =>
    api.get(`/estimates/project/${projectId}`),

  listForProject: (projectId: string) =>
    api.get(`/estimates/project/${projectId}`),

  get: (id: string) => api.get(`/estimates/${id}`),

  create: (projectId: string, data?: { name?: string; marginPercentage?: number; fromTemplate?: boolean }) =>
    api.post(`/estimates/project/${projectId}`, data),

  delete: (id: string) => api.delete(`/estimates/${id}`),

  addSection: (estimateId: string, name: string, categoryId?: string) =>
    api.post(`/estimates/${estimateId}/sections`, { name, categoryId }),

  updateSection: (estimateId: string, sectionId: string, data: any) =>
    api.put(`/estimates/${estimateId}/sections/${sectionId}`, data),

  deleteSection: (estimateId: string, sectionId: string) =>
    api.delete(`/estimates/${estimateId}/sections/${sectionId}`),

  addLineItem: (estimateId: string, sectionId: string, data: any) =>
    api.post(`/estimates/${estimateId}/items`, { sectionId, ...data }),

  updateLineItem: (estimateId: string, itemId: string, data: any) =>
    api.put(`/estimates/${estimateId}/items/${itemId}`, data),

  deleteLineItem: (estimateId: string, itemId: string) =>
    api.delete(`/estimates/${estimateId}/items/${itemId}`),

  recalculate: (estimateId: string) =>
    api.post(`/estimates/${estimateId}/calculate`),

  applyMargin: (estimateId: string, marginPercentage: number) =>
    api.post(`/estimates/${estimateId}/apply-margin`, { marginPercentage }),

  updateStatus: (estimateId: string, status: string) =>
    api.patch(`/estimates/${estimateId}/status`, { status }),

  duplicate: (estimateId: string) =>
    api.post(`/estimates/${estimateId}/duplicate`),

  duplicateToProject: (estimateId: string, targetProjectId: string) =>
    api.post(`/estimates/${estimateId}/duplicate-to/${targetProjectId}`),

  listRecent: (excludeProjectId?: string) =>
    api.get('/estimates/recent', { params: { excludeProjectId } }),

  applyDiscount: (estimateId: string, discountType: 'percentage' | 'fixed' | null, discountValue: number) =>
    api.post(`/estimates/${estimateId}/discount`, { discountType, discountValue }),

  updateSettings: (estimateId: string, data: {
    scopeOfWork?: string;
    countyLicensing?: boolean;
    projectStartDate?: string;
    notes?: string;
    validUntil?: string;
  }) => api.put(`/estimates/${estimateId}/settings`, data),

  // Finalization & Approval
  finalize: (estimateId: string, sendEmail = true) =>
    api.post(`/estimates/${estimateId}/finalize`, { sendEmail }),

  getByApprovalToken: (token: string) =>
    api.get(`/estimates/approval/${token}`),

  approveByToken: (token: string, data?: { signature?: string; approvedBy?: string }) =>
    api.post(`/estimates/approval/${token}/approve`, data),

  rejectByToken: (token: string, reason?: string) =>
    api.post(`/estimates/approval/${token}/reject`, { reason }),
};

// Pricing API
export const pricingApi = {
  listCategories: (params?: { projectType?: string; includeItems?: boolean }) =>
    api.get('/pricing/categories', { params }),

  getCategory: (id: string) => api.get(`/pricing/categories/${id}`),

  createCategory: (data: any) => api.post('/pricing/categories', data),

  updateCategory: (id: string, data: any) => api.put(`/pricing/categories/${id}`, data),

  deleteCategory: (id: string) => api.delete(`/pricing/categories/${id}`),

  listItems: (params?: { categoryId?: string; projectType?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/pricing/items', { params }),

  getItem: (id: string) => api.get(`/pricing/items/${id}`),

  createItem: (data: any) => api.post('/pricing/items', data),

  updateItem: (id: string, data: any) => api.put(`/pricing/items/${id}`, data),

  deleteItem: (id: string, hard?: boolean) =>
    api.delete(`/pricing/items/${id}`, { params: { hard } }),

  import: (categories: any[]) => api.post('/pricing/import', { categories }),

  reorderCategories: (order: string[]) =>
    api.put('/pricing/categories/reorder', { order }),

  reorderItems: (order: string[]) =>
    api.put('/pricing/items/reorder', { order }),
};

// Vendors API
export const vendorsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/vendors', { params }),

  get: (id: string) => api.get(`/vendors/${id}`),

  create: (data: any) => api.post('/vendors', data),

  update: (id: string, data: any) => api.put(`/vendors/${id}`, data),

  delete: (id: string) => api.delete(`/vendors/${id}`),
};

// Crews API
export const crewsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/crews', { params }),

  get: (id: string) => api.get(`/crews/${id}`),

  create: (data: any) => api.post('/crews', data),

  update: (id: string, data: any) => api.put(`/crews/${id}`, data),

  delete: (id: string) => api.delete(`/crews/${id}`),

  assign: (projectId: string, data: { crewId: string; role?: string; startDate?: string; endDate?: string; dailyRate?: number }) =>
    api.post(`/crews/assign/${projectId}`, data),

  getAssignments: (projectId: string) =>
    api.get(`/crews/assignments/${projectId}`),

  logLabor: (projectId: string, data: { crewId: string; date: string; hoursWorked: number; description?: string; cost?: number }) =>
    api.post(`/crews/labor/${projectId}`, data),

  getLaborLogs: (projectId: string) =>
    api.get(`/crews/labor/${projectId}`),
};

// Purchasing API
export const purchasingApi = {
  list: (params?: { status?: string; projectId?: string; vendorId?: string; page?: number; limit?: number }) =>
    api.get('/purchasing', { params }),

  get: (id: string) => api.get(`/purchasing/${id}`),

  create: (data: { projectId: string; vendorId: string; items: any[]; notes?: string }) =>
    api.post('/purchasing', data),

  update: (id: string, data: any) => api.put(`/purchasing/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/purchasing/${id}/status`, { status }),

  receiveItem: (poId: string, itemId: string, quantityReceived: number) =>
    api.post(`/purchasing/${poId}/items/${itemId}/receive`, { quantityReceived }),

  delete: (id: string) => api.delete(`/purchasing/${id}`),
};

// Documents API
export const documentsApi = {
  listForProject: (projectId: string, params?: { type?: string }) =>
    api.get(`/documents/project/${projectId}`, { params }),

  get: (id: string) => api.get(`/documents/${id}`),

  create: (data: { projectId: string; type: string; name: string; estimateId?: string; fileUrl?: string }) =>
    api.post('/documents', data),

  update: (id: string, data: any) => api.put(`/documents/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/documents/${id}/status`, { status }),

  sign: (id: string, signatureData: string) =>
    api.post(`/documents/${id}/sign`, { signatureData }),

  getSignatures: (id: string) => api.get(`/documents/${id}/signatures`),

  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),

  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Payments API
export const paymentsApi = {
  getSchedule: (projectId: string) =>
    api.get(`/payments/schedule/${projectId}`),

  createSchedule: (projectId: string, total: number) =>
    api.post(`/payments/schedule/${projectId}`, { total }),

  updateScheduleItem: (scheduleId: string, data: { dueDate?: string; status?: string }) =>
    api.patch(`/payments/schedule/${scheduleId}`, data),

  recordPayment: (data: { scheduleId: string; projectId: string; amount: number; paymentMethod?: string }) =>
    api.post('/payments', data),

  getPayments: (projectId: string) =>
    api.get(`/payments/project/${projectId}`),

  get: (id: string) => api.get(`/payments/${id}`),
};

// Invoices API
export const invoicesApi = {
  list: (params?: { projectId?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/invoices', { params }),

  listForProject: (projectId: string) =>
    api.get(`/invoices/project/${projectId}`),

  get: (id: string) => api.get(`/invoices/${id}`),

  createFromSchedule: (scheduleId: string, dueDate?: string) =>
    api.post(`/invoices/from-schedule/${scheduleId}`, { dueDate }),

  createManual: (data: { projectId: string; amount: number; dueDate?: string; notes?: string }) =>
    api.post('/invoices', data),

  updateStatus: (id: string, status: string, paidAt?: string) =>
    api.patch(`/invoices/${id}/status`, { status, paidAt }),

  send: (id: string) => api.post(`/invoices/${id}/send`),

  markPaid: (id: string, paidAt?: string) =>
    api.post(`/invoices/${id}/mark-paid`, { paidAt }),

  delete: (id: string) => api.delete(`/invoices/${id}`),

  getDashboardSummary: () => api.get('/invoices/summary/dashboard'),
};

// Contracts API
export const contractsApi = {
  listTemplates: (activeOnly = true) =>
    api.get('/contracts/templates', { params: { activeOnly } }),

  getTemplate: (id: string) => api.get(`/contracts/templates/${id}`),

  getDefaultTemplate: () => api.get('/contracts/templates/default'),

  createTemplate: (formData: FormData) =>
    api.post('/contracts/templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateTemplate: (id: string, formData: FormData) =>
    api.put(`/contracts/templates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteTemplate: (id: string) => api.delete(`/contracts/templates/${id}`),
};

// Project Management API (Tasks & Daily Logs)
export const projectManagementApi = {
  // Tasks
  listTasks: (projectId: string, params?: { status?: string; priority?: string; parentOnly?: boolean }) =>
    api.get(`/projects/${projectId}/tasks`, { params }),

  createTask: (projectId: string, data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    assigneeType?: string;
    dueDate?: string;
    parentId?: string;
  }) => api.post(`/projects/${projectId}/tasks`, data),

  updateTask: (projectId: string, taskId: string, data: any) =>
    api.put(`/projects/${projectId}/tasks/${taskId}`, data),

  deleteTask: (projectId: string, taskId: string) =>
    api.delete(`/projects/${projectId}/tasks/${taskId}`),

  reorderTasks: (projectId: string, tasks: { id: string; sortOrder: number }[]) =>
    api.post(`/projects/${projectId}/tasks/reorder`, { tasks }),

  // Daily Logs
  listDailyLogs: (projectId: string, params?: {
    startDate?: string;
    endDate?: string;
    crewId?: string;
    page?: number;
    limit?: number;
  }) => api.get(`/projects/${projectId}/daily-logs`, { params }),

  createDailyLog: (projectId: string, data: {
    date: string;
    crewId?: string;
    summary: string;
    workCompleted?: string;
    issues?: string;
    weather?: string;
    photoUrls?: string[];
    hoursWorked?: number;
  }) => api.post(`/projects/${projectId}/daily-logs`, data),

  updateDailyLog: (projectId: string, logId: string, data: any) =>
    api.put(`/projects/${projectId}/daily-logs/${logId}`, data),

  deleteDailyLog: (projectId: string, logId: string) =>
    api.delete(`/projects/${projectId}/daily-logs/${logId}`),

  // Photos
  getPhotos: (projectId: string, folder?: string) =>
    api.get(`/projects/${projectId}/photos`, { params: folder ? { folder } : {} }),

  uploadPhotos: (projectId: string, formData: FormData) =>
    api.post(`/projects/${projectId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deletePhoto: (projectId: string, photoId: string) =>
    api.delete(`/projects/${projectId}/photos/${photoId}`),

  // Change Orders
  listChangeOrders: (projectId: string) =>
    api.get(`/projects/${projectId}/change-orders`),

  createChangeOrder: (projectId: string, data: {
    title: string;
    description: string;
    reason?: string;
    costImpact?: number;
    scheduleImpact?: string;
  }) => api.post(`/projects/${projectId}/change-orders`, data),

  updateChangeOrderStatus: (projectId: string, coId: string, status: string, rejectionNote?: string) =>
    api.patch(`/projects/${projectId}/change-orders/${coId}/status`, { status, rejectionNote }),

  deleteChangeOrder: (projectId: string, coId: string) =>
    api.delete(`/projects/${projectId}/change-orders/${coId}`),
};

// Materials API
export const materialsApi = {
  listForProject: (projectId: string, params?: { status?: string }) =>
    api.get(`/materials/project/${projectId}`, { params }),

  get: (id: string) => api.get(`/materials/${id}`),

  create: (data: any) => api.post('/materials', data),

  update: (id: string, data: any) => api.put(`/materials/${id}`, data),

  updateStatus: (id: string, status: string, statusDate?: string) =>
    api.patch(`/materials/${id}/status`, { status, statusDate }),

  delete: (id: string) => api.delete(`/materials/${id}`),
};

// Reports API
export const reportsApi = {
  getProjectCompletionReport: (projectId: string) =>
    api.get(`/reports/projects/${projectId}/completion`),

  markProjectCompleted: (projectId: string) =>
    api.post(`/reports/projects/${projectId}/complete`),

  getFinancialReport: () =>
    api.get('/reports/financial'),
};

// Organization API
export const organizationApi = {
  get: () => api.get('/organization'),

  update: (data: {
    name?: string;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  }) => api.put('/organization', data),

  // Org switching
  getMyOrgs: () => api.get('/organization/my-orgs'),

  switchOrg: (orgId: string) => api.post(`/organization/switch/${orgId}`),

  // Members
  listMembers: () => api.get('/organization/members'),

  updateMemberRole: (memberId: string, role: string) =>
    api.put(`/organization/members/${memberId}`, { role }),

  removeMember: (memberId: string) =>
    api.delete(`/organization/members/${memberId}`),

  // Invites
  listInvites: () => api.get('/organization/invites'),

  sendInvite: (data: { email: string; role?: string; userRole?: string }) =>
    api.post('/organization/invites', data),

  revokeInvite: (inviteId: string) =>
    api.delete(`/organization/invites/${inviteId}`),

  resendInvite: (inviteId: string) =>
    api.post(`/organization/invites/${inviteId}/resend`),

  verifyInvite: (token: string) =>
    api.get(`/organization/invites/verify?token=${token}`),

  acceptInvite: (data: { token: string; name: string; password: string }) =>
    api.post('/organization/invites/accept', data),

  // Subscription billing
  subscribe: (plan: string) =>
    api.post('/organization/subscribe', { plan }).then(res => res.data),

  billingPortal: () =>
    api.post('/organization/billing-portal').then(res => res.data),
};

// Users API
export const usersApi = {
  list: (params?: { role?: string; search?: string }) =>
    api.get('/users', { params }),

  get: (id: string) => api.get(`/users/${id}`),

  getDesigners: () => api.get('/users', { params: { role: 'designer' } }),
};

// Super Admin API
export const superAdminApi = {
  getStats: () => api.get('/super-admin/stats'),

  // Organizations
  listOrganizations: (params?: { search?: string; plan?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/super-admin/organizations', { params }),

  getOrganization: (id: string) => api.get(`/super-admin/organizations/${id}`),

  updateOrganization: (id: string, data: { name?: string; subscriptionPlan?: string; subscriptionStatus?: string }) =>
    api.put(`/super-admin/organizations/${id}`, data),

  // Users
  listUsers: (params?: { search?: string; role?: string; isActive?: string; page?: number; limit?: number }) =>
    api.get('/super-admin/users', { params }),

  updateUser: (id: string, data: { isActive?: boolean; role?: string }) =>
    api.put(`/super-admin/users/${id}`, data),

  impersonateUser: (id: string) =>
    api.post(`/super-admin/users/${id}/impersonate`),

  // Audit Log
  getAuditLog: (params?: { action?: string; page?: number; limit?: number }) =>
    api.get('/super-admin/audit-log', { params }),
};

// Stripe Payments API (client-facing)
export const stripePaymentsApi = {
  createCheckout: (scheduleId: string) =>
    api.post(`/payments/checkout/${scheduleId}`),
};
