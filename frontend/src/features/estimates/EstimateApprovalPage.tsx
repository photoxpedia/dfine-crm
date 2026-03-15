import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import {
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  Phone,
  Mail,
  AlertTriangle,
  Clock,
  FileText,
  X,
  PenLine,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { estimatesApi, contractsApi } from '@/lib/api';
import EstimatePDFTemplate from '@/components/pdf/EstimatePDFTemplate';
import SignaturePad from '@/components/SignaturePad';
import type { Estimate, EstimateSection, EstimateLineItem } from '@/types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  pdfUrl: string;
  fieldMappings: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
}

export default function EstimateApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approverName, setApproverName] = useState('');
  const [showContractModal, setShowContractModal] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [contractStep, setContractStep] = useState<'review' | 'sign'>('review');

  const {
    data: estimate,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['estimate-approval', token],
    queryFn: async () => {
      const response = await estimatesApi.getByApprovalToken(token!);
      return response.data as Estimate;
    },
    enabled: !!token,
  });

  // Fetch default contract template
  const { data: contractTemplate } = useQuery({
    queryKey: ['default-contract-template'],
    queryFn: async () => {
      try {
        const response = await contractsApi.getDefaultTemplate();
        return response.data as ContractTemplate;
      } catch {
        return null;
      }
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.approveByToken(token!, {
        approvedBy: approverName,
        signature: signature || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Estimate approved and contract signed!');
      refetch();
      setShowContractModal(false);
      resetContractModal();
    },
    onError: () => {
      toast.error('Failed to approve estimate');
    },
  });

  const resetContractModal = () => {
    setContractStep('review');
    setSignature(null);
    setAgreedToTerms(false);
    setApproverName('');
  };

  const openContractModal = () => {
    resetContractModal();
    setShowContractModal(true);
  };

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.rejectByToken(token!, rejectReason);
    },
    onSuccess: () => {
      toast.success('Feedback submitted successfully');
      refetch();
      setShowRejectForm(false);
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  const handleDownloadPDF = async () => {
    if (!estimate) return;

    try {
      const blob = await pdf(<EstimatePDFTemplate estimate={estimate} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Estimate-${estimate.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-designer-600" />
      </div>
    );
  }

  if (error || !estimate) {
    const errorMessage = (error as Error)?.message || 'Estimate not found';
    const isExpired = errorMessage.includes('expired');

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
            isExpired ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            {isExpired ? (
              <Clock className="w-8 h-8 text-yellow-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? 'Estimate Expired' : 'Link Invalid'}
          </h1>
          <p className="text-gray-600 mb-6">
            {isExpired
              ? 'This estimate has expired. Please contact us for an updated estimate.'
              : 'This link is invalid or has already been used.'}
          </p>
          <a
            href="mailto:support@remodelsync.com"
            className="btn btn-designer inline-flex items-center"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Us
          </a>
        </div>
      </div>
    );
  }

  const isApproved = estimate.status === 'approved';
  const isRejected = estimate.status === 'rejected';
  const canTakeAction = !isApproved && !isRejected;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-designer-600 to-designer-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">ReModel Sync</h1>
          <p className="text-designer-100 mt-1">Estimate Review</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Status Banner */}
        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-green-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-green-800">Estimate Approved</h2>
              <p className="text-green-700">
                You approved this estimate on {formatDate(estimate.approvedAt!)}.
                Our team will contact you shortly.
              </p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 flex items-center gap-4">
            <XCircle className="w-10 h-10 text-yellow-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">Feedback Submitted</h2>
              <p className="text-yellow-700">
                You requested changes on {formatDate(estimate.rejectedAt!)}.
                Our designer will prepare a revised estimate.
              </p>
              {estimate.rejectionReason && (
                <p className="text-yellow-700 mt-2">
                  <strong>Your feedback:</strong> {estimate.rejectionReason}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{estimate.project?.name}</h2>
                  <p className="text-gray-500">
                    {estimate.project?.address && (
                      <>
                        {estimate.project.address}
                        {estimate.project.city && `, ${estimate.project.city}`}
                        {estimate.project.state && `, ${estimate.project.state}`}
                      </>
                    )}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  Version {estimate.version}
                </span>
              </div>

              {estimate.validUntil && (
                <p className="text-sm text-gray-500">
                  Valid until: {formatDate(estimate.validUntil)}
                </p>
              )}
            </div>

            {/* Line Items */}
            {estimate.sections?.map((section: EstimateSection) => (
              <div
                key={section.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-designer-600 text-white px-6 py-3 flex justify-between items-center">
                  <h3 className="font-semibold">{section.name}</h3>
                  <span className="font-bold">
                    {formatCurrency(section.subtotalSelling)}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {section.lineItems?.map((item: EstimateLineItem) => (
                    <div key={item.id} className="px-6 py-4 flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-1">
                          {item.quantity} {item.unitOfMeasure}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900 ml-4">
                        {formatCurrency(item.totalSelling)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Scope of Work */}
            {(estimate as any).scopeOfWork && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Scope of Work</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{(estimate as any).scopeOfWork}</p>
              </div>
            )}

            {/* Notes */}
            {estimate.notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-gray-600">{estimate.notes}</p>
              </div>
            )}

            {/* Terms */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>1. This estimate is valid for 30 days from the date shown above.</li>
                <li>2. Payment schedule: 30% deposit upon signing, 30% at project start, 30% at midpoint, 10% upon completion.</li>
                <li>3. Any changes to the scope of work may result in additional charges.</li>
                <li>4. All work is guaranteed for one year from completion date.</li>
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Total Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {(estimate as any).discountAmount > 0 ? (
                <>
                  <p className="text-gray-500 text-sm mb-1">Subtotal</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(estimate.subtotalSelling)}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-green-600">
                    <p className="text-sm">
                      Discount
                      {(estimate as any).discountType === 'percentage' && (estimate as any).discountValue
                        ? ` (${(estimate as any).discountValue}%)`
                        : ''}
                    </p>
                    <p className="font-semibold">-{formatCurrency((estimate as any).discountAmount)}</p>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <p className="text-gray-500 text-sm mb-1">Total</p>
                    <p className="text-3xl font-bold text-designer-600">
                      {formatCurrency(estimate.total)}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-1">Estimate Total</p>
                  <p className="text-3xl font-bold text-designer-600">
                    {formatCurrency(estimate.total)}
                  </p>
                </>
              )}

              <button
                onClick={handleDownloadPDF}
                className="btn btn-outline w-full mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>

            {/* Action Buttons */}
            {canTakeAction && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Ready to proceed?</h3>

                {!showRejectForm && (
                  <>
                    <button
                      onClick={openContractModal}
                      className="btn btn-designer w-full"
                    >
                      <PenLine className="w-5 h-5 mr-2" />
                      Sign & Approve
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="btn btn-outline w-full"
                    >
                      Request Changes
                    </button>
                  </>
                )}

                {showRejectForm && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What changes would you like?
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                        placeholder="Please describe the changes you'd like us to make..."
                        className="input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="btn btn-outline flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate()}
                        disabled={rejectMutation.isPending}
                        className="btn btn-designer flex-1"
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Submit'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contact Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Questions?</h3>
              {estimate.project?.designer && (
                <div className="space-y-3">
                  <p className="text-gray-600">Contact your designer:</p>
                  <p className="font-medium text-gray-900">
                    {estimate.project.designer.name}
                  </p>
                  {estimate.project.designer.email && (
                    <a
                      href={`mailto:${estimate.project.designer.email}`}
                      className="flex items-center gap-2 text-designer-600 hover:text-designer-700"
                    >
                      <Mail className="w-4 h-4" />
                      {estimate.project.designer.email}
                    </a>
                  )}
                  {estimate.project.designer.phone && (
                    <a
                      href={`tel:${estimate.project.designer.phone}`}
                      className="flex items-center gap-2 text-designer-600 hover:text-designer-700"
                    >
                      <Phone className="w-4 h-4" />
                      {estimate.project.designer.phone}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Payment Schedule Info */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Payment Schedule</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex justify-between">
                  <span>Deposit (upon signing)</span>
                  <span className="font-semibold">30%</span>
                </li>
                <li className="flex justify-between">
                  <span>Project start</span>
                  <span className="font-semibold">30%</span>
                </li>
                <li className="flex justify-between">
                  <span>Midpoint</span>
                  <span className="font-semibold">30%</span>
                </li>
                <li className="flex justify-between">
                  <span>Completion</span>
                  <span className="font-semibold">10%</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm">
          <p>ReModel Sync</p>
          <p className="mt-1">AI-first CRM for Remodeling Companies</p>
        </div>
      </div>

      {/* Contract Signing Modal */}
      {showContractModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowContractModal(false)}
          />
          <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-designer-600 text-white">
              <div>
                <h2 className="text-xl font-bold">
                  {contractStep === 'review' ? 'Review Contract' : 'Sign Contract'}
                </h2>
                <p className="text-designer-100 text-sm">
                  {contractStep === 'review'
                    ? 'Please review the contract terms before signing'
                    : 'Sign below to approve the estimate'}
                </p>
              </div>
              <button
                onClick={() => setShowContractModal(false)}
                className="p-2 hover:bg-designer-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {contractStep === 'review' ? (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Contract Document */}
                  {contractTemplate?.pdfUrl ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-700">{contractTemplate.name}</span>
                        </div>
                        <a
                          href={contractTemplate.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-designer-600 hover:text-designer-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open Full Document
                        </a>
                      </div>
                      <iframe
                        src={`${contractTemplate.pdfUrl}#toolbar=0&navpanes=0`}
                        className="w-full h-[500px]"
                        title="Contract Document"
                      />
                    </div>
                  ) : (
                    /* Default Contract Terms if no template uploaded */
                    <div className="prose prose-sm max-w-none">
                      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          Service Agreement
                        </h3>
                        <div className="space-y-4 text-gray-700">
                          <p>
                            This Service Agreement ("Agreement") is entered into between the Company
                            and the undersigned client ("Client") for the services
                            described in the attached estimate.
                          </p>

                          <h4 className="font-semibold text-gray-900">1. Scope of Work</h4>
                          <p>
                            The Company agrees to provide the services and materials as described in the
                            estimate dated {estimate && formatDate(estimate.createdAt)} for the project
                            at {estimate?.project?.address}.
                          </p>

                          <h4 className="font-semibold text-gray-900">2. Payment Terms</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            <li>30% deposit due upon signing this agreement</li>
                            <li>30% due at project start</li>
                            <li>30% due at project midpoint</li>
                            <li>10% due upon substantial completion</li>
                          </ul>

                          <h4 className="font-semibold text-gray-900">3. Timeline</h4>
                          <p>
                            Work will begin within 2-4 weeks of receiving the initial deposit, subject to
                            material availability and scheduling. The Company will provide a detailed
                            project timeline upon project commencement.
                          </p>

                          <h4 className="font-semibold text-gray-900">4. Changes to Scope</h4>
                          <p>
                            Any changes to the scope of work must be agreed upon in writing. Additional
                            work may result in additional charges and timeline adjustments.
                          </p>

                          <h4 className="font-semibold text-gray-900">5. Warranty</h4>
                          <p>
                            The Company warrants all workmanship for a period of one (1) year from the
                            date of substantial completion. Manufacturer warranties on materials and
                            fixtures apply as provided by the manufacturer.
                          </p>

                          <h4 className="font-semibold text-gray-900">6. Cancellation</h4>
                          <p>
                            The Client may cancel this agreement within 3 business days of signing for
                            a full refund of any deposit. After this period, the deposit is non-refundable
                            as it covers design, planning, and material ordering costs.
                          </p>

                          <h4 className="font-semibold text-gray-900">7. Insurance & Licensing</h4>
                          <p>
                            The Company maintains general liability insurance and is fully licensed
                            and bonded in the State of Maryland. Copies of insurance certificates
                            are available upon request.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estimate Summary */}
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <h4 className="font-semibold text-gray-900 mb-4">Estimate Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Project:</span>
                        <span className="font-medium text-gray-900">{estimate?.project?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Address:</span>
                        <span className="font-medium text-gray-900">
                          {estimate?.project?.address}
                          {estimate?.project?.city && `, ${estimate?.project?.city}`}
                        </span>
                      </div>
                      {(estimate as any)?.projectStartDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estimated Start Date:</span>
                          <span className="font-medium text-gray-900">
                            {formatDate((estimate as any).projectStartDate)}
                          </span>
                        </div>
                      )}
                      {(estimate as any)?.countyLicensing && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">County Licensing:</span>
                          <span className="font-medium text-green-600">Required</span>
                        </div>
                      )}
                      {(estimate as any)?.discountAmount > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Subtotal:</span>
                            <span className="font-medium text-gray-900">{estimate && formatCurrency(estimate.subtotalSelling)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span className="font-medium">-{estimate && formatCurrency((estimate as any).discountAmount)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                        <span className="text-gray-700 font-medium">Total Amount:</span>
                        <span className="text-xl font-bold text-designer-600">
                          {estimate && formatCurrency(estimate.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agreement Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 text-designer-600 rounded border-gray-300 focus:ring-designer-500"
                    />
                    <span className="text-sm text-gray-700">
                      I have read and agree to the terms and conditions outlined in this contract.
                      I understand the payment schedule and project scope as described in the estimate.
                    </span>
                  </label>
                </div>
              ) : (
                /* Signature Step */
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Contract Reviewed</h3>
                    <p className="text-gray-500">Please sign below to approve the estimate</p>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Enter your full legal name"
                      className="input"
                    />
                  </div>

                  {/* Signature Pad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Signature
                    </label>
                    <SignaturePad
                      onSignatureChange={setSignature}
                      width={500}
                      height={200}
                    />
                  </div>

                  {/* Submission Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      By signing above, you are electronically signing this contract and approve
                      the estimate for <strong>{formatCurrency(estimate?.total || 0)}</strong>.
                      A confirmation email will be sent to you with a copy of the signed agreement.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                {contractStep === 'review' ? (
                  <>
                    <button
                      onClick={() => setShowContractModal(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setContractStep('sign')}
                      disabled={!agreedToTerms}
                      className="btn btn-designer"
                    >
                      Continue to Sign
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setContractStep('review')}
                      className="btn btn-outline"
                    >
                      Back to Review
                    </button>
                    <button
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending || !approverName.trim() || !signature}
                      className="btn btn-designer"
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Sign & Approve Estimate
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
