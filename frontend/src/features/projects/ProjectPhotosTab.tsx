import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Trash2,
  Loader2,
  Upload,
  Image,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectManagementApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface ProjectPhoto {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  caption?: string;
  createdAt: string;
  user?: { id: string; name: string };
}

const FOLDERS = [
  { key: 'before', label: 'Before', color: 'text-orange-600 bg-orange-100' },
  { key: 'after', label: 'After', color: 'text-green-600 bg-green-100' },
  { key: 'progress', label: 'Progress', color: 'text-blue-600 bg-blue-100' },
  { key: 'general', label: 'General', color: 'text-gray-600 bg-gray-100' },
];

export default function ProjectPhotosTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [uploadFolder, setUploadFolder] = useState('before');
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-photos', projectId],
    queryFn: async () => {
      const response = await projectManagementApi.getPhotos(projectId);
      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
      }
      formData.append('folder', uploadFolder);
      return projectManagementApi.uploadPhotos(projectId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-photos', projectId] });
      toast.success('Photos uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: () => {
      toast.error('Failed to upload photos');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return projectManagementApi.deletePhoto(projectId, photoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-photos', projectId] });
      toast.success('Photo deleted');
      setSelectedPhoto(null);
    },
  });

  const photos: ProjectPhoto[] = data?.photos || [];
  const folderCounts: Record<string, number> = data?.folderCounts || {};

  const filteredPhotos = activeFolder === 'all'
    ? photos
    : photos.filter((p) => p.folder === activeFolder);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Upload Photos</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={uploadFolder}
            onChange={(e) => setUploadFolder(e.target.value)}
            className="input w-auto"
          >
            {FOLDERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="btn btn-designer"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploadMutation.isPending ? 'Uploading...' : 'Choose Photos'}
          </button>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveFolder('all')}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full transition-colors',
            activeFolder === 'all'
              ? 'bg-designer-100 text-designer-700 font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All ({photos.length})
        </button>
        {FOLDERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFolder(f.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full transition-colors',
              activeFolder === f.key
                ? f.color + ' font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f.label} ({folderCounts[f.key] || 0})
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="card p-12 text-center">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-500">Upload before, after, and progress photos for this project</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative card overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <img
                  src={`/uploads/${photo.filePath}`}
                  alt={photo.fileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden flex-col items-center gap-2 text-gray-400">
                  <Image className="w-8 h-8" />
                  <span className="text-xs">{photo.fileName}</span>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    FOLDERS.find((f) => f.key === photo.folder)?.color || 'bg-gray-100 text-gray-600'
                  )}>
                    {FOLDERS.find((f) => f.key === photo.folder)?.label || photo.folder}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(photo.createdAt)}</span>
                </div>
                {photo.caption && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={`/uploads/${selectedPhoto.filePath}`}
              alt={selectedPhoto.fileName}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Delete this photo?')) {
                    deleteMutation.mutate(selectedPhoto.id);
                  }
                }}
                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 rounded-b-lg">
              <div className="flex items-center gap-2 text-white">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  FOLDERS.find((f) => f.key === selectedPhoto.folder)?.color || 'bg-gray-100 text-gray-600'
                )}>
                  {FOLDERS.find((f) => f.key === selectedPhoto.folder)?.label || selectedPhoto.folder}
                </span>
                <span className="text-sm">{selectedPhoto.fileName}</span>
                <span className="text-xs text-gray-300 ml-auto">
                  {selectedPhoto.user?.name} &middot; {formatDate(selectedPhoto.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
