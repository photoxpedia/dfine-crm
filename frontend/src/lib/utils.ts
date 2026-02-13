import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Lead statuses
    new: 'badge-blue',
    contacted: 'badge-yellow',
    pre_estimate: 'badge-purple',
    estimated: 'badge-purple',
    converted: 'badge-green',
    on_hold: 'badge-yellow',
    future_client: 'badge-gray',
    dropped: 'badge-red',

    // Sub-statuses
    in_progress: 'badge-blue',
    complete: 'badge-green',

    // Project statuses
    draft: 'badge-gray',
    pending_approval: 'badge-yellow',
    approved: 'badge-green',
    completed: 'badge-green',
    cancelled: 'badge-red',

    // Estimate statuses
    sent: 'badge-blue',
    viewed: 'badge-purple',
    rejected: 'badge-red',
    expired: 'badge-gray',

    // Payment statuses
    pending: 'badge-yellow',
    invoiced: 'badge-blue',
    processing: 'badge-blue',
    paid: 'badge-green',
    failed: 'badge-red',
    refunded: 'badge-gray',
    overdue: 'badge-red',

    // Purchase statuses
    ordered: 'badge-blue',
    shipped: 'badge-purple',
    delivered: 'badge-green',
    installed: 'badge-green',
  };

  return colors[status] || 'badge-gray';
}

export function getLeadStatusLabel(status: string, subStatus?: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    pre_estimate: 'Pre-Estimate',
    estimated: 'Estimated',
    converted: 'Converted',
    on_hold: 'On Hold',
    future_client: 'Future Client',
    dropped: 'Dropped',
  };

  let label = labels[status] || formatStatus(status);
  if (subStatus && ['pre_estimate', 'estimated', 'converted'].includes(status)) {
    label += ` (${subStatus === 'in_progress' ? 'In Progress' : 'Complete'})`;
  }
  return label;
}

export function getFollowUpReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    budget: 'Budget constraints',
    timing: 'Timing not right',
    permits: 'Waiting on permits',
    comparing: 'Comparing quotes',
    personal: 'Personal circumstances',
    other: 'Other',
  };
  return labels[reason] || reason;
}

export function getEventTypeLabel(eventType: string, metadata?: any): string {
  if (eventType === 'contact_logged' && metadata?.contactType) {
    const contactLabels: Record<string, string> = {
      call: 'Phone Call',
      email: 'Email Sent',
      meeting: 'Meeting',
      site_visit: 'Site Visit',
    };
    return contactLabels[metadata.contactType] || 'Contact Logged';
  }
  const labels: Record<string, string> = {
    created: 'Lead Created',
    status_change: 'Status Changed',
    substatus_change: 'Progress Updated',
    note_added: 'Note Added',
    contact_logged: 'Contact Logged',
    photo_uploaded: 'Photos Uploaded',
    assigned: 'Lead Assigned',
    followup_set: 'Follow-up Scheduled',
    reactivated: 'Lead Reactivated',
  };
  return labels[eventType] || formatStatus(eventType);
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function calculateMargin(contractorCost: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - contractorCost) / sellingPrice) * 100;
}

export function calculateSellingPrice(contractorCost: number, marginPercentage: number): number {
  if (marginPercentage >= 100) return contractorCost * 2;
  return contractorCost / (1 - marginPercentage / 100);
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function getBasePath(pathname: string): string {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/designer')) return '/designer';
  if (pathname.startsWith('/client')) return '/client';
  return '/designer';
}
