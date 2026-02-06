import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Filter,
  Loader2,
  Calendar,
  CheckCircle,
  Clock,
  Send,
  Download,
} from 'lucide-react';
import { projectsApi, documentsApi } from '@/lib/api';
import { formatDate, cn, formatStatus } from '@/lib/utils';

type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'expired';
type DocumentType = 'estimate' | 'material_list' | 'scope_of_work' | 'contract' | 'change_order';

const statusColors: Record<DocumentStatus, string> = {
  draft: 'badge-gray',
  pending_signature: 'badge-yellow',
  signed: 'badge-green',
  expired: 'badge-red',
};

const statusIcons: Record<DocumentStatus, React.ReactNode> = {
  draft: <Clock className="w-4 h-4" />,
  pending_signature: <Send className="w-4 h-4" />,
  signed: <CheckCircle className="w-4 h-4" />,
  expired: <Clock className="w-4 h-4" />,
};

const typeLabels: Record<DocumentType, string> = {
  estimate: 'Estimate',
  material_list: 'Material List',
  scope_of_work: 'Scope of Work',
  contract: 'Contract',
  change_order: 'Change Order',
};

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');

  // Fetch projects for filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const response = await projectsApi.list({ limit: 100 });
      return response.data;
    },
  });

  // Fetch documents for selected project
  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', selectedProject, typeFilter],
    queryFn: async () => {
      if (!selectedProject) return { documents: [] };
      const response = await documentsApi.listForProject(selectedProject, {
        type: typeFilter || undefined,
      });
      return response.data;
    },
    enabled: !!selectedProject,
  });

  const projects = projectsData?.projects || [];
  const documents = documentsData?.documents || [];

  const filteredDocuments = documents.filter((doc: any) => {
    if (statusFilter && doc.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        doc.name.toLowerCase().includes(searchLower) ||
        typeLabels[doc.type as DocumentType]?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage project documents</p>
      </div>

      {/* Project Selector */}
      <div className="card p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Project
        </label>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input max-w-md"
        >
          <option value="">Choose a project...</option>
          {projects.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Search and Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'btn btn-outline',
                  (statusFilter || typeFilter) && 'border-designer-300 text-designer-700'
                )}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as DocumentType | '')}
                    className="input"
                  >
                    <option value="">All Types</option>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
                    className="input"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending_signature">Pending Signature</option>
                    <option value="signed">Signed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500">
                Documents will appear here once created for this project.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Document</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Version</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDocuments.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {typeLabels[doc.type as DocumentType] || doc.type}
                      </td>
                      <td className="py-3 px-4 text-gray-600">v{doc.version}</td>
                      <td className="py-3 px-4">
                        <span className={cn('badge inline-flex items-center gap-1', statusColors[doc.status as DocumentStatus])}>
                          {statusIcons[doc.status as DocumentStatus]}
                          {formatStatus(doc.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(doc.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedProject && (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a project</h3>
          <p className="text-gray-500">
            Choose a project above to view its documents.
          </p>
        </div>
      )}
    </div>
  );
}
