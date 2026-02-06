import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileText,
  MoreVertical,
  X,
  Upload,
  Star,
  Eye,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contractsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  pdfUrl: string;
  fieldMappings: FieldMapping[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FieldMapping {
  field: string;
  x: number;
  y: number;
  page: number;
  fontSize?: number;
  fontColor?: string;
}

const AVAILABLE_FIELDS = [
  { value: 'client_name', label: 'Client Name' },
  { value: 'client_address', label: 'Client Address' },
  { value: 'project_address', label: 'Project Address' },
  { value: 'project_name', label: 'Project Name' },
  { value: 'estimate_total', label: 'Estimate Total' },
  { value: 'date', label: 'Current Date' },
  { value: 'signature', label: 'Signature' },
  { value: 'signature_date', label: 'Signature Date' },
];

export default function ContractTemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [showPreview, setShowPreview] = useState<ContractTemplate | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const response = await contractsApi.listTemplates(false);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contractsApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete template');
    },
  });

  const templates: ContractTemplate[] = data?.templates || [];

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contract Templates</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage PDF templates for client contracts
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </button>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-4">
            Upload a PDF contract template to get started
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add First Template
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onPreview={() => setShowPreview(template)}
              onDelete={() => {
                if (confirm('Delete this template?')) {
                  deleteMutation.mutate(template.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={handleCloseForm}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          template={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onEdit,
  onPreview,
  onDelete,
}: {
  template: ContractTemplate;
  onEdit: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const setDefaultMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('isDefault', 'true');
      return contractsApi.updateTemplate(template.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('Default template updated');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('isActive', (!template.isActive).toString());
      return contractsApi.updateTemplate(template.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success(template.isActive ? 'Template deactivated' : 'Template activated');
    },
  });

  return (
    <div className={cn(
      'card p-4 relative',
      !template.isActive && 'opacity-60'
    )}>
      {template.isDefault && (
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
            <Star className="w-3 h-3 fill-current" />
            Default
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-designer-100 rounded-lg">
          <FileText className="w-6 h-6 text-designer-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-500 truncate">{template.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-500">
          {template.fieldMappings?.length || 0} field mappings
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPreview}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => {
                        setDefaultMutation.mutate();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Star className="w-4 h-4" />
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      toggleActiveMutation.mutate();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Check className="w-4 h-4" />
                    {template.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Created {formatDate(template.createdAt)}
      </p>
    </div>
  );
}

// Template Form Modal
function TemplateFormModal({
  template,
  onClose,
}: {
  template: ContractTemplate | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    isDefault: template?.isDefault || false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>(
    template?.fieldMappings || []
  );

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (template) {
        return contractsApi.updateTemplate(template.id, data);
      }
      return contractsApi.createTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success(template ? 'Template updated' : 'Template created');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save template');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!template && !selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('isDefault', formData.isDefault.toString());
    data.append('fieldMappings', JSON.stringify(fieldMappings));

    if (selectedFile) {
      data.append('pdf', selectedFile);
    }

    mutation.mutate(data);
  };

  const addFieldMapping = () => {
    setFieldMappings([
      ...fieldMappings,
      { field: 'client_name', x: 100, y: 100, page: 1 },
    ]);
  };

  const updateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setFieldMappings(newMappings);
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {template ? 'Edit Template' : 'New Contract Template'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                    placeholder="e.g., Standard Bathroom Contract"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Brief description of this template..."
                  />
                </div>

                {/* PDF Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PDF Template {!template && '*'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-designer-400 transition-colors"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-6 h-6 text-designer-600" />
                        <span className="font-medium">{selectedFile.name}</span>
                      </div>
                    ) : template?.pdfUrl ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-6 h-6 text-gray-400" />
                        <span className="text-gray-500">Current: {template.pdfUrl.split('/').pop()}</span>
                        <span className="text-designer-600">Click to replace</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Click to upload PDF</p>
                        <p className="text-sm text-gray-400">Max 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 text-designer-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Set as default template</span>
                </label>
              </div>

              {/* Field Mappings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Field Mappings
                  </label>
                  <button
                    type="button"
                    onClick={addFieldMapping}
                    className="text-sm text-designer-600 hover:text-designer-700"
                  >
                    + Add Field
                  </button>
                </div>

                {fieldMappings.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                    No field mappings defined. Add fields to specify where client data should appear on the PDF.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fieldMappings.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <select
                          value={mapping.field}
                          onChange={(e) => updateFieldMapping(index, { field: e.target.value })}
                          className="input flex-1"
                        >
                          {AVAILABLE_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={mapping.x}
                          onChange={(e) => updateFieldMapping(index, { x: parseInt(e.target.value) })}
                          className="input w-20"
                          placeholder="X"
                          title="X position"
                        />
                        <input
                          type="number"
                          value={mapping.y}
                          onChange={(e) => updateFieldMapping(index, { y: parseInt(e.target.value) })}
                          className="input w-20"
                          placeholder="Y"
                          title="Y position"
                        />
                        <input
                          type="number"
                          value={mapping.page}
                          onChange={(e) => updateFieldMapping(index, { page: parseInt(e.target.value) })}
                          className="input w-16"
                          placeholder="Page"
                          title="Page number"
                          min={1}
                        />
                        <button
                          type="button"
                          onClick={() => removeFieldMapping(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  X/Y coordinates are in points from the bottom-left corner of the PDF page
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-primary"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {template ? 'Update' : 'Create'} Template
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Preview Modal
function PreviewModal({
  template,
  onClose,
}: {
  template: ContractTemplate;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            <iframe
              src={template.pdfUrl}
              className="w-full h-[70vh] border border-gray-200 rounded-lg"
              title="Contract Preview"
            />
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {template.fieldMappings?.length || 0} field mappings configured
              </div>
              <a
                href={template.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
