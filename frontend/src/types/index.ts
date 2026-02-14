// User types
export type UserRole = 'admin' | 'designer' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Lead types
export type LeadStatus = 'new' | 'contacted' | 'pre_estimate' | 'estimated' | 'converted' | 'on_hold' | 'future_client' | 'dropped';
export type SubStatus = 'in_progress' | 'complete';
export type FollowUpReason = 'budget' | 'timing' | 'permits' | 'comparing' | 'personal' | 'other';
export type LeadEventType = 'created' | 'status_change' | 'substatus_change' | 'note_added' | 'contact_logged' | 'photo_uploaded' | 'assigned' | 'followup_set' | 'reactivated';
export type PhotoTag = 'before_photo' | 'measurement' | 'other';
export type ProjectType = 'bathroom' | 'kitchen' | 'general';

export interface Lead {
  id: string;
  organizationId: string;
  designerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  status: LeadStatus;
  subStatus?: SubStatus;
  projectType: ProjectType;
  notes?: string;
  followUpDate?: string;
  followUpReason?: FollowUpReason;
  followUpReasonOther?: string;
  createdAt: string;
  updatedAt: string;
  designer?: User;
  photos?: LeadPhoto[];
  history?: LeadHistory[];
}

export interface LeadHistory {
  id: string;
  leadId: string;
  userId: string;
  eventType: LeadEventType;
  oldValue?: string;
  newValue?: string;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: User;
}

export interface LeadPhoto {
  id: string;
  leadId: string;
  userId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tag: PhotoTag;
  historyId?: string;
  createdAt: string;
  user?: User;
}

export interface LeadSource {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  data?: Record<string, any>;
  readAt?: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  firstName: string;
  lastName: string;
  projectType: ProjectType;
  status: LeadStatus;
  followUpDate: string;
  followUpReason?: FollowUpReason;
  followUpReasonOther?: string;
  designer?: User;
}

// Project types
export type ProjectStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  leadId?: string;
  designerId: string;
  clientId?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  projectType: ProjectType;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  startDate?: string;
  endDate?: string;
  expectedLaborCost?: number;
  actualLaborCost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  designer?: User;
  client?: User;
  lead?: Lead;
  estimates?: Estimate[];
}

// Pricing types
export type UnitOfMeasure = 'EA' | 'LF' | 'SF' | 'SQ' | 'PC';

export interface PricingCategory {
  id: string;
  name: string;
  description?: string;
  projectType: ProjectType;
  sortOrder: number;
  isActive: boolean;
  items?: PricingItem[];
}

export interface PricingItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  unitOfMeasure: UnitOfMeasure;
  contractorCost: number;
  sellingPrice: number;
  sortOrder: number;
  isActive: boolean;
  category?: PricingCategory;
}

// Estimate types
export type EstimateStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired';

export interface Estimate {
  id: string;
  projectId: string;
  version: number;
  name?: string;
  status: EstimateStatus;
  marginPercentage: number;
  subtotalContractor: number;
  subtotalSelling: number;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number;
  discountAmount: number;
  total: number;
  notes?: string;
  scopeOfWork?: string;
  countyLicensing?: boolean;
  projectStartDate?: string;
  validUntil?: string;
  sentAt?: string;
  viewedAt?: string;
  approvedAt?: string;
  approvalToken?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    designerId: string;
    clientId?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    client?: User;
    designer?: User;
  };
  sections?: EstimateSection[];
}

export interface EstimateSection {
  id: string;
  estimateId: string;
  categoryId?: string;
  name: string;
  sortOrder: number;
  subtotalContractor: number;
  subtotalSelling: number;
  category?: PricingCategory;
  lineItems?: EstimateLineItem[];
}

export interface EstimateLineItem {
  id: string;
  sectionId: string;
  pricingItemId?: string;
  name: string;
  description?: string;
  unitOfMeasure: UnitOfMeasure;
  quantity: number;
  contractorCost: number;
  sellingPrice: number;
  totalContractor: number;
  totalSelling: number;
  sortOrder: number;
  isCustom: boolean;
  productUrl?: string;
  imageUrl?: string;
  notes?: string;
  pricingItem?: PricingItem;
}

// Document types
export type DocumentType = 'estimate' | 'invoice' | 'material_list' | 'scope_of_work' | 'contract' | 'change_order';
export type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'expired';

export interface Document {
  id: string;
  projectId: string;
  estimateId?: string;
  type: DocumentType;
  name: string;
  version: number;
  fileUrl?: string;
  status: DocumentStatus;
  createdAt: string;
}

// Payment types
export type PaymentMilestone = 'contract_signing' | 'project_start' | 'midpoint' | 'completion';
export type PaymentStatus = 'pending' | 'invoiced' | 'processing' | 'completed' | 'failed' | 'refunded' | 'overdue';

export interface PaymentSchedule {
  id: string;
  projectId: string;
  milestone: PaymentMilestone;
  percentage: number;
  amountDue: number;
  dueDate?: string;
  status: PaymentStatus;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  scheduleId?: string;
  projectId: string;
  amount: number;
  paymentMethod?: string;
  status: PaymentStatus;
  paidAt?: string;
}

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  projectId: string;
  scheduleId?: string;
  amount: number;
  status: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  sentAt?: string;
  pdfUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  project?: Project;
  schedule?: PaymentSchedule;
}

// Vendor types
export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Crew types
export interface Crew {
  id: string;
  name: string;
  leadMemberName?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  hourlyRate?: number;
  dailyRate?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Purchase Order types
export type POStatus = 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  projectId: string;
  vendorId: string;
  createdById: string;
  status: POStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  project?: Project;
  vendor?: Vendor;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  materialListItemId?: string;
  name: string;
  description?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered';
}

// Crew Assignment types
export interface CrewAssignment {
  id: string;
  projectId: string;
  crewId: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  dailyRate?: number;
  notes?: string;
  crew?: Crew;
}

// Labor Log types
export interface LaborLog {
  id: string;
  projectId: string;
  crewId: string;
  date: string;
  hoursWorked: number;
  description?: string;
  cost?: number;
  crew?: Crew;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
