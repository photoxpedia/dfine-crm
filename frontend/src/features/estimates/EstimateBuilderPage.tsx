import { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import {
  ArrowLeft,
  Send,
  FileText,
  MoreVertical,
  Plus,
  Percent,
  Copy,
  Loader2,
  Download,
  Mail,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { estimatesApi } from '@/lib/api';
import { formatCurrency, cn, getBasePath } from '@/lib/utils';
import SectionEditor from './components/SectionEditor';
import PricingItemPicker from './components/PricingItemPicker';
import EstimatePDFTemplate from '@/components/pdf/EstimatePDFTemplate';
import type { Estimate, EstimateSection, EstimateLineItem, PricingItem, ProjectType } from '@/types';

const MARGIN_PRESETS = [
  { label: '40%', value: 40 },
  { label: '50%', value: 50 },
  { label: '60%', value: 60 },
  { label: '65%', value: 65 },
  { label: '70%', value: 70 },
];

export default function EstimateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath(location.pathname);
  const queryClient = useQueryClient();

  const [showPricingPicker, setShowPricingPicker] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [customMargin, setCustomMargin] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Fetch estimate
  const { data: estimate, isLoading, error } = useQuery({
    queryKey: ['estimate', id],
    queryFn: async () => {
      const response = await estimatesApi.get(id!);
      return response.data as Estimate;
    },
    enabled: !!id,
  });

  // Mutations
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<EstimateLineItem> }) => {
      return estimatesApi.updateLineItem(id!, itemId, data);
    },
    onSuccess: () => {
      // Debounced refetch
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return estimatesApi.deleteLineItem(id!, itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      toast.success('Item deleted');
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async (name: string) => {
      return estimatesApi.addSection(id!, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      toast.success('Section added');
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ sectionId, data }: { sectionId: string; data: Partial<EstimateSection> }) => {
      return estimatesApi.updateSection(id!, sectionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      return estimatesApi.deleteSection(id!, sectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      toast.success('Section deleted');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ sectionId, item }: { sectionId: string; item: Partial<PricingItem> }) => {
      return estimatesApi.addLineItem(id!, sectionId, {
        pricingItemId: item.id || undefined,
        name: item.name || 'New Item',
        unitOfMeasure: item.unitOfMeasure || 'EA',
        quantity: 1, // Default to 1 so items have a value
        contractorCost: item.contractorCost || 0,
        sellingPrice: item.sellingPrice || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      toast.success('Item added');
    },
  });

  const applyMarginMutation = useMutation({
    mutationFn: async (marginPercentage: number) => {
      return estimatesApi.applyMargin(id!, marginPercentage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      toast.success('Margin applied');
      setShowMarginModal(false);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.duplicate(id!);
    },
    onSuccess: (response) => {
      const newEstimate = response.data;
      toast.success('Estimate duplicated');
      navigate(`${basePath}/estimates/${newEstimate.id}`);
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      return estimatesApi.finalize(id!, sendEmail);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      setShowFinalizeModal(false);
      toast.success(
        sendEmail
          ? 'Estimate finalized and sent to client!'
          : 'Estimate finalized!'
      );
      // Show approval URL in a toast
      if (response.data.approvalUrl) {
        toast.success(`Approval link created`, { duration: 5000 });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to finalize estimate');
    },
  });

  // Handlers
  const handleAddSection = () => {
    const name = prompt('Enter section name:');
    if (name) {
      addSectionMutation.mutate(name);
    }
  };

  const handleUpdateSection = (sectionId: string, data: Partial<EstimateSection>) => {
    updateSectionMutation.mutate({ sectionId, data });
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section and all its items?')) {
      deleteSectionMutation.mutate(sectionId);
    }
  };

  const handleAddItem = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowPricingPicker(true);
  };

  const handleSelectPricingItems = (items: PricingItem[]) => {
    if (selectedSectionId) {
      items.forEach((item) => {
        addItemMutation.mutate({ sectionId: selectedSectionId, item });
      });
    }
  };

  const handleUpdateItem = (itemId: string, data: Partial<EstimateLineItem>) => {
    updateItemMutation.mutate({ itemId, data });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Delete this item?')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleApplyMargin = (margin: number) => {
    applyMarginMutation.mutate(margin);
  };

  const handleDownloadPDF = async () => {
    if (!estimate) return;

    try {
      const blob = await pdf(<EstimatePDFTemplate estimate={estimate} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Estimate-${estimate.name || `v${estimate.version}`}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Estimate not found</p>
        <Link to={`${basePath}/projects`} className="text-designer-600 hover:text-designer-700 mt-2 inline-block">
          Back to projects
        </Link>
      </div>
    );
  }

  const isEditable = estimate.status === 'draft';
  // Use actual project type from project data, not inferred from name
  const projectType = (estimate.project as any)?.projectType || 'bathroom' as ProjectType;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to={`${basePath}/projects/${estimate.projectId}`}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {estimate.name || `Estimate v${estimate.version}`}
            </h1>
            <p className="text-gray-500 text-sm">
              {estimate.project?.name}
            </p>
          </div>
          <span
            className={cn(
              'badge',
              estimate.status === 'draft' ? 'badge-gray' :
              estimate.status === 'sent' ? 'badge-blue' :
              estimate.status === 'approved' ? 'badge-green' :
              estimate.status === 'rejected' ? 'badge-red' : 'badge-gray'
            )}
          >
            {estimate.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <button
                onClick={() => setShowMarginModal(true)}
                className="btn btn-outline"
              >
                <Percent className="w-4 h-4 mr-2" />
                Margin
              </button>
              <button
                onClick={handleAddSection}
                className="btn btn-outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                Section
              </button>
            </>
          )}

          {estimate.status === 'draft' && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="btn btn-designer"
            >
              <Send className="w-4 h-4 mr-2" />
              Finalize & Send
            </button>
          )}

          {(estimate.status === 'sent' || estimate.status === 'approved') && estimate.approvalToken && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/estimate/approve/${estimate.approvalToken}`;
                navigator.clipboard.writeText(url);
                toast.success('Approval link copied!');
              }}
              className="btn btn-outline"
            >
              <Mail className="w-4 h-4 mr-2" />
              Copy Approval Link
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn btn-outline p-2"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      duplicateMutation.mutate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate Estimate
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadPDF();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Contractor Cost</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(estimate.subtotalContractor)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Selling Price</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(estimate.subtotalSelling)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Margin</p>
            <p className="text-xl font-bold text-designer-600">
              {estimate.marginPercentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Profit</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(estimate.subtotalSelling - estimate.subtotalContractor)}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {estimate.sections && estimate.sections.length > 0 ? (
          estimate.sections.map((section) => (
            <SectionEditor
              key={section.id}
              section={section}
              onUpdateSection={handleUpdateSection}
              onDeleteSection={handleDeleteSection}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              isEditable={isEditable}
            />
          ))
        ) : (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
            <p className="text-gray-500 mb-4">
              Start by adding a section to organize your estimate
            </p>
            {isEditable && (
              <button onClick={handleAddSection} className="btn btn-designer">
                <Plus className="w-4 h-4 mr-2" />
                Add First Section
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grand Total */}
      {estimate.sections && estimate.sections.length > 0 && (
        <div className="card p-6 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Grand Total</p>
              <p className="text-sm text-gray-400 mt-1">
                Includes all sections and items
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatCurrency(estimate.total)}</p>
              <p className="text-gray-400 text-sm mt-1">
                Cost: {formatCurrency(estimate.subtotalContractor)} |
                Profit: {formatCurrency(estimate.total - estimate.subtotalContractor)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Item Picker Modal */}
      <PricingItemPicker
        isOpen={showPricingPicker}
        onClose={() => {
          setShowPricingPicker(false);
          setSelectedSectionId(null);
        }}
        onSelectMultiple={handleSelectPricingItems}
        projectType={projectType}
      />

      {/* Margin Modal */}
      {showMarginModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75" onClick={() => setShowMarginModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Apply Margin to All Items
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                This will recalculate selling prices for all items based on the selected margin.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {MARGIN_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleApplyMargin(preset.value)}
                    disabled={applyMarginMutation.isPending}
                    className={cn(
                      'py-2 px-3 rounded-lg text-sm font-medium border transition-colors',
                      estimate.marginPercentage === preset.value
                        ? 'bg-designer-50 border-designer-300 text-designer-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customMargin}
                  onChange={(e) => setCustomMargin(e.target.value)}
                  placeholder="Custom %"
                  min="0"
                  max="99"
                  className="input flex-1"
                />
                <button
                  onClick={() => {
                    const margin = parseFloat(customMargin);
                    if (margin > 0 && margin < 100) {
                      handleApplyMargin(margin);
                    } else {
                      toast.error('Enter a valid margin (1-99%)');
                    }
                  }}
                  disabled={applyMarginMutation.isPending || !customMargin}
                  className="btn btn-designer"
                >
                  Apply
                </button>
              </div>

              <button
                onClick={() => setShowMarginModal(false)}
                className="mt-4 w-full btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Modal */}
      {showFinalizeModal && estimate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75" onClick={() => setShowFinalizeModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-designer-100 rounded-full flex items-center justify-center">
                  <Send className="w-6 h-6 text-designer-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Finalize Estimate
                  </h3>
                  <p className="text-sm text-gray-500">
                    Ready to send to your client?
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Project</span>
                  <span className="font-medium">{estimate.project?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Total</span>
                  <span className="text-xl font-bold text-designer-600">
                    {formatCurrency(estimate.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sections</span>
                  <span className="font-medium">{estimate.sections?.length || 0}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">What happens next:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>A unique approval link will be generated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Payment schedule (30/30/30/10) will be created</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Estimate status will change to "Sent"</span>
                  </li>
                </ul>
              </div>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 mb-4">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 text-designer-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900">Send email to client</p>
                  <p className="text-sm text-gray-500">
                    {estimate.project?.client?.email || 'No client email set'}
                  </p>
                </div>
              </label>

              {!estimate.project?.clientId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> No client is assigned to this project.
                    You can still finalize, but you'll need to share the approval link manually.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending}
                  className="btn btn-designer flex-1"
                >
                  {finalizeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Finalize & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
