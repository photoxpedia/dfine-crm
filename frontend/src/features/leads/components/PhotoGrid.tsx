import { useState } from 'react';
import { X, Trash2, ZoomIn, Download, Tag } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import type { LeadPhoto } from '@/types';

interface PhotoGridProps {
  photos: LeadPhoto[];
  onDelete?: (photoId: string) => void;
  isDeleting?: boolean;
  className?: string;
}

function getTagLabel(tag: string): string {
  switch (tag) {
    case 'before_photo':
      return 'Before';
    case 'measurement':
      return 'Measurement';
    default:
      return 'Other';
  }
}

function getTagColor(tag: string): string {
  switch (tag) {
    case 'before_photo':
      return 'bg-blue-100 text-blue-700';
    case 'measurement':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function PhotoGrid({
  photos,
  onDelete,
  isDeleting = false,
  className,
}: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<LeadPhoto | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <Tag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No photos yet</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3', className)}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={`/uploads/${photo.filePath}`}
              alt={photo.fileName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            {/* Tag badge */}
            <div className="absolute top-2 left-2">
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded',
                  getTagColor(photo.tag)
                )}
              >
                {getTagLabel(photo.tag)}
              </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(photo);
                }}
                className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                title="View"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this photo?')) {
                      onDelete(photo.id);
                    }
                  }}
                  disabled={isDeleting}
                  className="p-2 bg-white/20 rounded-full text-white hover:bg-red-500/80 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`/uploads/${selectedPhoto.filePath}`}
              alt={selectedPhoto.fileName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
              <div className="flex items-center justify-between text-white">
                <div>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      getTagColor(selectedPhoto.tag)
                    )}
                  >
                    {getTagLabel(selectedPhoto.tag)}
                  </span>
                  <p className="text-sm mt-1 text-white/80">
                    {selectedPhoto.fileName}
                  </p>
                  <p className="text-xs text-white/60">
                    Uploaded {formatDateTime(selectedPhoto.createdAt)}
                    {selectedPhoto.user && ` by ${selectedPhoto.user.name}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`/uploads/${selectedPhoto.filePath}`}
                    download={selectedPhoto.fileName}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this photo?')) {
                          onDelete(selectedPhoto.id);
                          setSelectedPhoto(null);
                        }
                      }}
                      disabled={isDeleting}
                      className="p-2 bg-white/20 rounded-full hover:bg-red-500/80 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
