import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  FileText,
  Send,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi, invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { PaymentSchedule, Invoice, PaymentStatus, InvoiceStatus } from '@/types';

interface ProjectPaymentsTabProps {
  projectId: string;
}

const MILESTONE_LABELS: Record<string, string> = {
  contract_signing: 'Deposit - Contract Signing',
  project_start: 'Project Start',
  midpoint: 'Midpoint (50%)',
  completion: 'Final - Completion',
};

const getPaymentStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    case 'invoiced':
      return 'bg-blue-100 text-blue-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getInvoiceStatusColor = (status: InvoiceStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'sent':
      return 'bg-blue-100 text-blue-700';
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default function ProjectPaymentsTab({ projectId }: ProjectPaymentsTabProps) {
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // Fetch payment schedule
  const { data: scheduleData, isLoading: loadingSchedule } = useQuery({
    queryKey: ['payment-schedule', projectId],
    queryFn: async () => {
      const response = await paymentsApi.getSchedule(projectId);
      return response.data;
    },
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['project-invoices', projectId],
    queryFn: async () => {
      const response = await invoicesApi.listForProject(projectId);
      return response.data;
    },
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      return invoicesApi.createFromSchedule(scheduleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedule', projectId] });
      toast.success('Invoice created');
    },
    onError: () => {
      toast.error('Failed to create invoice');
    },
  });

  // Send invoice mutation
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return invoicesApi.send(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invoices', projectId] });
      toast.success('Invoice sent to client');
    },
    onError: () => {
      toast.error('Failed to send invoice');
    },
  });

  // Mark invoice paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return invoicesApi.markPaid(invoiceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-invoices', projectId] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedule', projectId] });
      toast.success('Invoice marked as paid');
    },
    onError: () => {
      toast.error('Failed to mark invoice as paid');
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      return paymentsApi.recordPayment({
        scheduleId: selectedSchedule!.id,
        projectId,
        amount: parseFloat(paymentAmount),
        paymentMethod,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-schedule', projectId] });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setSelectedSchedule(null);
      setPaymentAmount('');
      setPaymentMethod('');
    },
    onError: () => {
      toast.error('Failed to record payment');
    },
  });

  const schedules = scheduleData?.schedules || [];
  const summary = scheduleData?.summary || { totalDue: 0, totalPaid: 0, totalRemaining: 0 };
  const invoices = invoicesData?.invoices || [];

  const isLoading = loadingSchedule || loadingInvoices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Schedule</h3>
        <p className="text-gray-500">
          Payment schedule will be created when an estimate is finalized and approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Project Value
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(summary.totalDue)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <Check className="w-4 h-4" />
            Paid
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalPaid)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Remaining
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(summary.totalRemaining)}
          </p>
        </div>
      </div>

      {/* Payment Schedule */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Payment Schedule</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {schedules.map((schedule: PaymentSchedule & { invoices?: Invoice[] }) => {
            const hasInvoice = schedule.invoices && schedule.invoices.length > 0;

            return (
              <div key={schedule.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          schedule.status === 'completed'
                            ? 'bg-green-100'
                            : schedule.status === 'overdue'
                            ? 'bg-red-100'
                            : 'bg-gray-100'
                        )}
                      >
                        {schedule.status === 'completed' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : schedule.status === 'overdue' ? (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {MILESTONE_LABELS[schedule.milestone] || schedule.milestone}
                        </p>
                        <p className="text-sm text-gray-500">
                          {schedule.percentage}% - {formatCurrency(schedule.amountDue)}
                        </p>
                      </div>
                    </div>
                    {schedule.dueDate && (
                      <p className="text-sm text-gray-500 mt-2 ml-13">
                        Due: {formatDate(schedule.dueDate)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium capitalize',
                        getPaymentStatusColor(schedule.status)
                      )}
                    >
                      {schedule.status}
                    </span>

                    {schedule.status !== 'completed' && (
                      <div className="flex gap-2">
                        {!hasInvoice && (
                          <button
                            onClick={() => createInvoiceMutation.mutate(schedule.id)}
                            disabled={createInvoiceMutation.isPending}
                            className="btn btn-outline btn-sm"
                            title="Create Invoice"
                          >
                            {createInvoiceMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setPaymentAmount(schedule.amountDue.toString());
                            setShowPaymentModal(true);
                          }}
                          className="btn btn-designer btn-sm"
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Record Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice: Invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium capitalize',
                          getInvoiceStatusColor(invoice.status)
                        )}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                            disabled={sendInvoiceMutation.isPending}
                            className="btn btn-outline btn-sm"
                          >
                            {sendInvoiceMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </>
                            )}
                          </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                          <button
                            onClick={() => markPaidMutation.mutate(invoice.id)}
                            disabled={markPaidMutation.isPending}
                            className="btn btn-designer btn-sm"
                          >
                            {markPaidMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Mark Paid
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Record Payment
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {MILESTONE_LABELS[selectedSchedule.milestone]}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                >
                  <option value="">Select method...</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => recordPaymentMutation.mutate()}
                disabled={
                  recordPaymentMutation.isPending ||
                  !paymentAmount ||
                  !paymentMethod
                }
                className="btn btn-designer flex-1"
              >
                {recordPaymentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
