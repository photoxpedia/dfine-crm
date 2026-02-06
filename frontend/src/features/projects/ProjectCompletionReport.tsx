import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  ClipboardList,
  Calendar,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface ProjectCompletionReportProps {
  projectId: string;
  projectStatus: string;
  onClose: () => void;
}

interface ReportData {
  projectId: string;
  generatedAt: string;
  projectSummary: {
    name: string;
    address: string;
    city?: string;
    state?: string;
    clientName?: string;
    clientEmail?: string;
    designerName?: string;
    projectType?: string;
    status: string;
    startDate?: string;
    completedDate?: string;
  };
  financialSummary: {
    estimatedTotal: number;
    actualTotal: number;
    variance: number;
    variancePercent: number;
    totalPaid: number;
    balance: number;
  };
  paymentHistory: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt?: string;
    notes?: string;
  }>;
  materialsSummary: {
    totalItems: number;
    itemsPurchased: number;
    itemsDelivered: number;
    itemsInstalled: number;
    estimatedMaterialCost: number;
    actualMaterialCost: number;
  };
  materials: Array<{
    name: string;
    quantity: number;
    estimatedCost?: number;
    actualCost?: number;
    status: string;
  }>;
  tasksSummary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  tasks: Array<{
    title: string;
    status: string;
    completedAt?: string;
  }>;
  dailyLogsSummary: {
    totalLogs: number;
    totalHoursWorked: number;
    dateRange: {
      start?: string;
      end?: string;
    };
  };
  timeline: Array<{
    date: string;
    event: string;
    type: 'milestone' | 'task' | 'payment' | 'material' | 'log';
  }>;
}

export default function ProjectCompletionReport({
  projectId,
  projectStatus,
  onClose,
}: ProjectCompletionReportProps) {
  const [activeSection, setActiveSection] = useState<'summary' | 'financials' | 'materials' | 'tasks' | 'timeline'>('summary');
  const queryClient = useQueryClient();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['project-report', projectId],
    queryFn: async () => {
      const response = await reportsApi.getProjectCompletionReport(projectId);
      return response.data as ReportData;
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => reportsApi.markProjectCompleted(projectId),
    onSuccess: () => {
      toast.success('Project marked as completed');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-report', projectId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to complete project');
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-designer-600 mx-auto" />
          <p className="mt-4 text-gray-600">Generating report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Failed to Generate Report
          </h3>
          <p className="text-gray-600 text-center mb-4">
            {(error as Error)?.message || 'An error occurred while generating the report.'}
          </p>
          <button onClick={onClose} className="btn btn-outline w-full">
            Close
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'materials', label: 'Materials', icon: Package },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ] as const;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-designer-600 text-white">
          <div>
            <h2 className="text-xl font-bold">Project Completion Report</h2>
            <p className="text-designer-100 text-sm">
              {report.projectSummary.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {projectStatus !== 'completed' && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || report.tasksSummary.pendingTasks > 0}
                className="btn bg-white text-designer-600 hover:bg-designer-50 disabled:opacity-50"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Mark Complete
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-designer-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200 px-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeSection === section.id
                    ? 'border-designer-600 text-designer-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'summary' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Project Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="font-medium text-gray-900">{report.projectSummary.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Address</dt>
                      <dd className="font-medium text-gray-900">
                        {report.projectSummary.address}
                        {report.projectSummary.city && `, ${report.projectSummary.city}`}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Type</dt>
                      <dd className="font-medium text-gray-900 capitalize">
                        {report.projectSummary.projectType || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Status</dt>
                      <dd className={cn(
                        'font-medium capitalize',
                        report.projectSummary.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                      )}>
                        {report.projectSummary.status}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Team & Client</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Client</dt>
                      <dd className="font-medium text-gray-900">
                        {report.projectSummary.clientName || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Designer</dt>
                      <dd className="font-medium text-gray-900">
                        {report.projectSummary.designerName || 'N/A'}
                      </dd>
                    </div>
                    {report.projectSummary.startDate && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Start Date</dt>
                        <dd className="font-medium text-gray-900">
                          {formatDate(report.projectSummary.startDate)}
                        </dd>
                      </div>
                    )}
                    {report.projectSummary.completedDate && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Completed</dt>
                        <dd className="font-medium text-gray-900">
                          {formatDate(report.projectSummary.completedDate)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-designer-600">
                    {formatCurrency(report.financialSummary.estimatedTotal)}
                  </p>
                  <p className="text-sm text-gray-500">Estimated Total</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.financialSummary.totalPaid)}
                  </p>
                  <p className="text-sm text-gray-500">Total Paid</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {report.tasksSummary.completionRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500">Tasks Complete</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {report.dailyLogsSummary.totalHoursWorked.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Hours Worked</p>
                </div>
              </div>

              {/* Warnings */}
              {report.tasksSummary.pendingTasks > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    {report.tasksSummary.pendingTasks} task(s) are not yet completed.
                    Complete all tasks before marking the project as done.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'financials' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Financial Overview */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Estimated Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.financialSummary.estimatedTotal)}
                  </p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Actual Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.financialSummary.actualTotal)}
                  </p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Variance</p>
                  <div className="flex items-center gap-2">
                    {report.financialSummary.variance > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    )}
                    <p className={cn(
                      'text-2xl font-bold',
                      report.financialSummary.variance > 0 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {report.financialSummary.variance > 0 ? '+' : ''}
                      {formatCurrency(report.financialSummary.variance)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    ({report.financialSummary.variancePercent.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.financialSummary.totalPaid)}
                  </p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Balance Due</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    report.financialSummary.balance > 0 ? 'text-red-600' : 'text-green-600'
                  )}>
                    {formatCurrency(report.financialSummary.balance)}
                  </p>
                </div>
              </div>

              {/* Payment History */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment History</h3>
                {report.paymentHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm">No payments recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-500">Date</th>
                          <th className="text-left py-2 font-medium text-gray-500">Amount</th>
                          <th className="text-left py-2 font-medium text-gray-500">Status</th>
                          <th className="text-left py-2 font-medium text-gray-500">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-b border-gray-100">
                            <td className="py-2">
                              {payment.paidAt ? formatDate(payment.paidAt) : '-'}
                            </td>
                            <td className="py-2 font-medium">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="py-2">
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs capitalize',
                                payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                {payment.status}
                              </span>
                            </td>
                            <td className="py-2 text-gray-500">
                              {payment.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'materials' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Materials Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {report.materialsSummary.totalItems}
                  </p>
                  <p className="text-sm text-gray-500">Total Items</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {report.materialsSummary.itemsPurchased}
                  </p>
                  <p className="text-sm text-gray-500">Purchased</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {report.materialsSummary.itemsDelivered}
                  </p>
                  <p className="text-sm text-gray-500">Delivered</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {report.materialsSummary.itemsInstalled}
                  </p>
                  <p className="text-sm text-gray-500">Installed</p>
                </div>
              </div>

              {/* Cost Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Estimated Material Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.materialsSummary.estimatedMaterialCost)}
                  </p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500 mb-1">Actual Material Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(report.materialsSummary.actualMaterialCost)}
                  </p>
                </div>
              </div>

              {/* Materials List */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Materials List</h3>
                {report.materials.length === 0 ? (
                  <p className="text-gray-500 text-sm">No materials recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-500">Item</th>
                          <th className="text-left py-2 font-medium text-gray-500">Qty</th>
                          <th className="text-left py-2 font-medium text-gray-500">Est. Cost</th>
                          <th className="text-left py-2 font-medium text-gray-500">Actual</th>
                          <th className="text-left py-2 font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.materials.map((material, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 font-medium">{material.name}</td>
                            <td className="py-2">{material.quantity}</td>
                            <td className="py-2">
                              {material.estimatedCost ? formatCurrency(material.estimatedCost) : '-'}
                            </td>
                            <td className="py-2">
                              {material.actualCost ? formatCurrency(material.actualCost) : '-'}
                            </td>
                            <td className="py-2">
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs capitalize',
                                material.status === 'installed' ? 'bg-green-100 text-green-700' :
                                material.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                                material.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                {material.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'tasks' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Tasks Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {report.tasksSummary.totalTasks}
                  </p>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {report.tasksSummary.completedTasks}
                  </p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.tasksSummary.pendingTasks}
                  </p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {report.tasksSummary.completionRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-500">Completion Rate</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="card p-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-gray-900">
                    {report.tasksSummary.completedTasks} / {report.tasksSummary.totalTasks}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${report.tasksSummary.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Task List</h3>
                {report.tasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tasks recorded</p>
                ) : (
                  <div className="space-y-2">
                    {report.tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                          <span className={cn(
                            task.status === 'completed' ? 'text-gray-500' : 'text-gray-900'
                          )}>
                            {task.title}
                          </span>
                        </div>
                        {task.completedAt && (
                          <span className="text-xs text-gray-500">
                            {formatDate(task.completedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Daily Logs Summary */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Work Summary</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Daily Logs</p>
                    <p className="text-xl font-bold text-gray-900">
                      {report.dailyLogsSummary.totalLogs}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Hours Worked</p>
                    <p className="text-xl font-bold text-gray-900">
                      {report.dailyLogsSummary.totalHoursWorked.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date Range</p>
                    <p className="text-sm font-medium text-gray-900">
                      {report.dailyLogsSummary.dateRange.start
                        ? `${formatDate(report.dailyLogsSummary.dateRange.start)} - ${formatDate(report.dailyLogsSummary.dateRange.end!)}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'timeline' && (
            <div className="max-w-3xl mx-auto">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-6">Project Timeline</h3>
                {report.timeline.length === 0 ? (
                  <p className="text-gray-500 text-sm">No timeline events</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-6">
                      {report.timeline.map((event, idx) => {
                        const typeColors: Record<string, string> = {
                          milestone: 'bg-designer-600 text-white',
                          payment: 'bg-green-600 text-white',
                          material: 'bg-blue-600 text-white',
                          task: 'bg-purple-600 text-white',
                          log: 'bg-gray-400 text-white',
                        };
                        const typeIcons: Record<string, typeof Calendar> = {
                          milestone: CheckCircle,
                          payment: DollarSign,
                          material: Package,
                          task: ClipboardList,
                          log: FileText,
                        };
                        const Icon = typeIcons[event.type] || Calendar;

                        return (
                          <div key={idx} className="relative flex items-start gap-4 pl-12">
                            <div className={cn(
                              'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                              typeColors[event.type]
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pt-1">
                              <p className="text-sm font-medium text-gray-900">{event.event}</p>
                              <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Report generated on {formatDate(report.generatedAt)}
            </p>
            <button onClick={onClose} className="btn btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
