import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const projectInfo = {
  name: 'Master Bathroom Remodel',
  address: '123 Main St, Ellicott City, MD 21042',
  designer: 'Tanya',
  status: 'in_progress',
  startDate: '2024-01-15',
  estimatedCompletion: '2024-02-28',
};

const paymentSchedule = [
  { milestone: 'Contract Signing', percentage: 30, amount: 8746, status: 'paid', date: '2024-01-10' },
  { milestone: 'Project Start', percentage: 30, amount: 8746, status: 'paid', date: '2024-01-15' },
  { milestone: 'Midpoint', percentage: 30, amount: 8746, status: 'due', date: '2024-02-01' },
  { milestone: 'Completion', percentage: 10, amount: 2916, status: 'pending', date: null },
];

const recentDocuments = [
  { name: 'Estimate v2', type: 'estimate', date: '2024-01-08', status: 'approved' },
  { name: 'Contract', type: 'contract', date: '2024-01-10', status: 'signed' },
  { name: 'Material List', type: 'material_list', date: '2024-01-12', status: 'final' },
];

export default function ClientDashboard() {
  const totalAmount = paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = paymentSchedule
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{projectInfo.name}</h1>
            <p className="text-gray-600 mt-1">{projectInfo.address}</p>
            <p className="text-sm text-gray-500 mt-2">
              Designer: <span className="font-medium">{projectInfo.designer}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="badge badge-blue text-sm px-3 py-1">
              In Progress
            </span>
            <p className="text-sm text-gray-500">
              Est. Completion: {formatDate(projectInfo.estimatedCompletion)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Project Progress</span>
            <span className="font-medium text-gray-900">65%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-client-500 h-3 rounded-full transition-all"
              style={{ width: '65%' }}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Status */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payment Schedule</h2>
            <Link
              to="/client/payments"
              className="text-sm text-client-600 hover:text-client-700 font-medium"
            >
              View details
            </Link>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(paidAmount)}</p>
                <p className="text-sm text-gray-500">of {formatCurrency(totalAmount)} paid</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-client-600">
                  {formatCurrency(totalAmount - paidAmount)}
                </p>
                <p className="text-sm text-gray-500">remaining</p>
              </div>
            </div>

            <div className="space-y-3">
              {paymentSchedule.map((payment, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {payment.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : payment.status === 'due' ? (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{payment.milestone}</p>
                      <p className="text-sm text-gray-500">{payment.percentage}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                    {payment.status === 'paid' && (
                      <p className="text-xs text-green-600">Paid {formatDate(payment.date!)}</p>
                    )}
                    {payment.status === 'due' && (
                      <Link to="/client/payments" className="text-xs text-client-600 font-medium">
                        Pay Now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <Link
              to="/client/documents"
              className="text-sm text-client-600 hover:text-client-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentDocuments.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(doc.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${
                      doc.status === 'approved' || doc.status === 'signed'
                        ? 'badge-green'
                        : 'badge-gray'
                    }`}
                  >
                    {doc.status}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Designer */}
      <div className="card p-6 bg-client-50 border-client-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Need help with your project?</h3>
            <p className="text-gray-600 mt-1">
              Contact your designer {projectInfo.designer} for any questions.
            </p>
          </div>
          <Link to="/client/messages" className="btn btn-client">
            Send Message
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </div>
  );
}
