import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, PieChart, AlertCircle, Loader2 } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface FinancialReport {
  revenueByMonth: { month: string; revenue: number }[];
  totalRevenue: number;
  totalEstimated: number;
  totalContractorCost: number;
  profitMargin: number;
  paymentsByStatus: { status: string; count: number; total: number }[];
  topProjects: {
    projectId: string;
    projectName: string;
    projectStatus: string;
    revenue: number;
  }[];
  outstandingPayments: number;
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function FinancialReportsPage() {
  const { data: report, isLoading, error } = useQuery<FinancialReport>({
    queryKey: ['financial-report'],
    queryFn: async () => {
      const response = await reportsApi.getFinancialReport();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-admin-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Failed to load financial report</h2>
        <p className="text-gray-600 mt-1">Please try again later.</p>
      </div>
    );
  }

  if (!report) return null;

  const statCards = [
    {
      name: 'Total Revenue',
      value: formatCurrency(report.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
    },
    {
      name: 'Total Estimated',
      value: formatCurrency(report.totalEstimated),
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'Profit Margin',
      value: `${report.profitMargin.toFixed(1)}%`,
      icon: PieChart,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Outstanding Payments',
      value: formatCurrency(report.outstandingPayments),
      icon: AlertCircle,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-600 mt-1">
          Overview of revenue, estimates, and payment activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.color.split(' ')[0]}`}>
                <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue by Month */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Revenue by Month (Last 12 Months)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.revenueByMonth.map((item) => (
                <tr key={item.month} className={item.revenue > 0 ? '' : 'text-gray-400'}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.month}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                  Total (12 Months)
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                  {formatCurrency(
                    report.revenueByMonth.reduce((sum, item) => sum + item.revenue, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Projects by Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Projects by Revenue</h2>
          </div>
          {report.topProjects.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No completed payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.topProjects.map((project) => (
                    <tr key={project.projectId}>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {project.projectName}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatStatus(project.projectStatus)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {formatCurrency(project.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments by Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payments by Status</h2>
          </div>
          {report.paymentsByStatus.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.paymentsByStatus.map((item) => (
                    <tr key={item.status}>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatStatus(item.status)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                        {item.count}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
