import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Loader2,
  ExternalLink,
  Banknote,
} from 'lucide-react';
import { paymentsApi, projectsApi, stripePaymentsApi } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

type PaymentStatus = 'pending' | 'invoiced' | 'processing' | 'completed' | 'failed' | 'refunded' | 'overdue';
type PaymentMilestone = 'contract_signing' | 'project_start' | 'midpoint' | 'completion';

const milestoneLabels: Record<PaymentMilestone, string> = {
  contract_signing: 'Contract Signing',
  project_start: 'Project Start',
  midpoint: 'Midpoint',
  completion: 'Completion',
};

const statusColors: Record<PaymentStatus, string> = {
  pending: 'text-gray-500 bg-gray-100',
  invoiced: 'text-blue-600 bg-blue-100',
  processing: 'text-yellow-600 bg-yellow-100',
  completed: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  refunded: 'text-purple-600 bg-purple-100',
  overdue: 'text-red-600 bg-red-100',
};

const statusIcons: Record<PaymentStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  invoiced: <DollarSign className="w-4 h-4" />,
  processing: <Loader2 className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4" />,
  failed: <AlertCircle className="w-4 h-4" />,
  refunded: <DollarSign className="w-4 h-4" />,
  overdue: <AlertCircle className="w-4 h-4" />,
};

const paymentMethodBadge: Record<string, { label: string; className: string }> = {
  stripe: { label: 'Card (Stripe)', className: 'bg-purple-100 text-purple-700' },
  manual: { label: 'Manual', className: 'bg-gray-100 text-gray-700' },
  cash: { label: 'Cash', className: 'bg-green-100 text-green-700' },
  check: { label: 'Check', className: 'bg-blue-100 text-blue-700' },
  bank_transfer: { label: 'Bank Transfer', className: 'bg-indigo-100 text-indigo-700' },
};

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const isClient = user?.role === 'client';
  const [payingScheduleId, setPayingScheduleId] = useState<string | null>(null);

  // For clients, fetch their projects first
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['client-projects'],
    queryFn: async () => {
      const response = await projectsApi.list({ limit: 100 });
      return response.data;
    },
  });

  const projects = projectsData?.projects || [];
  const firstProject = projects[0];

  // Fetch payment schedule for the first project
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payment-schedule', firstProject?.id],
    queryFn: async () => {
      if (!firstProject?.id) return { schedule: [] };
      const response = await paymentsApi.getSchedule(firstProject.id);
      return response.data;
    },
    enabled: !!firstProject?.id,
  });

  const schedule = paymentsData?.schedule || paymentsData?.schedules || [];
  const isLoading = projectsLoading || paymentsLoading;

  // Calculate totals
  const totalAmount = schedule.reduce((sum: number, item: any) => sum + Number(item.amountDue), 0);
  const paidAmount = schedule
    .filter((item: any) => item.status === 'completed')
    .reduce((sum: number, item: any) => sum + Number(item.amountDue), 0);
  const pendingAmount = totalAmount - paidAmount;

  const handlePayNow = async (scheduleId: string) => {
    try {
      setPayingScheduleId(scheduleId);
      const response = await stripePaymentsApi.createCheckout(scheduleId);
      const { sessionUrl } = response.data;
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.response?.data?.error || 'Failed to start payment. Please try again.');
      setPayingScheduleId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-client-600" />
      </div>
    );
  }

  if (!firstProject) {
    return (
      <div className="card p-12 text-center">
        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No project found</h3>
        <p className="text-gray-500">
          You don't have any projects with payment schedules yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">
          Payment schedule for {firstProject.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm text-gray-500">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Paid</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Remaining</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
        </div>
      </div>

      {/* Payment Schedule */}
      {schedule.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment schedule</h3>
          <p className="text-gray-500">
            A payment schedule will be created once your estimate is approved.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Payment Schedule</h2>
          </div>

          <div className="divide-y">
            {schedule.map((item: any, index: number) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                      item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {milestoneLabels[item.milestone as PaymentMilestone] || item.milestone}
                      </p>
                      <p className="text-sm text-gray-500">
                        {item.percentage}% of total
                        {item.dueDate && ` · Due ${formatDate(item.dueDate)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.amountDue)}
                      </p>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        statusColors[item.status as PaymentStatus]
                      )}>
                        {statusIcons[item.status as PaymentStatus]}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </div>

                    {(item.status === 'pending' || item.status === 'invoiced') && isClient && (
                      <button
                        onClick={() => handlePayNow(item.id)}
                        disabled={payingScheduleId === item.id}
                        className="btn btn-client btn-sm flex items-center gap-1.5"
                      >
                        {payingScheduleId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>

                {/* Show payments made for this schedule item */}
                {item.payments && item.payments.length > 0 && (
                  <div className="mt-3 ml-14 pl-4 border-l-2 border-gray-200">
                    {item.payments.map((payment: any) => (
                      <div key={payment.id} className="py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Paid {payment.paidAt ? formatDate(payment.paidAt) : ''}</span>
                          {payment.paymentMethod && (
                            <span className={cn(
                              'inline-flex px-1.5 py-0.5 rounded text-xs font-medium',
                              paymentMethodBadge[payment.paymentMethod]?.className || 'bg-gray-100 text-gray-600'
                            )}>
                              {paymentMethodBadge[payment.paymentMethod]?.label || payment.paymentMethod}
                            </span>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Accepted Payment Methods</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard className="w-5 h-5" />
            <span>Credit/Debit Card</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Banknote className="w-5 h-5" />
            <span>Bank Transfer</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <DollarSign className="w-5 h-5" />
            <span>Cash / Check</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Secure online payments powered by Stripe. For offline payments, please contact your designer.
        </p>
      </div>
    </div>
  );
}
