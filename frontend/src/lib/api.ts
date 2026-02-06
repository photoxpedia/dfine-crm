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

  getMe: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// Leads API
export const leadsApi = {
  list: (params?: { status?: string; projectType?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/leads', { params }),

  get: (id: string) => api.get(`/leads/${id}`),

  create: (data: any) => api.post('/leads', data),

  update: (id: string, data: any) => api.put(`/leads/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch(`/leads/${id}/status`, { status }),

  convert: (id: string) => api.post(`/leads/${id}/convert`),

  delete: (id: string) => api.delete(`/leads/${id}`),
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
};
