import { formatDateTime, getEventTypeLabel, getLeadStatusLabel, cn } from '@/lib/utils';
import type { LeadHistory } from '@/types';
import {
  Clock,
  FileText,
  Camera,
  UserPlus,
  CalendarClock,
  RotateCcw,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface LeadTimelineProps {
  history: LeadHistory[];
  className?: string;
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'created':
      return <FileText className="w-4 h-4" />;
    case 'status_change':
      return <ArrowRight className="w-4 h-4" />;
    case 'substatus_change':
      return <CheckCircle className="w-4 h-4" />;
    case 'note_added':
      return <FileText className="w-4 h-4" />;
    case 'photo_uploaded':
      return <Camera className="w-4 h-4" />;
    case 'assigned':
      return <UserPlus className="w-4 h-4" />;
    case 'followup_set':
      return <CalendarClock className="w-4 h-4" />;
    case 'reactivated':
      return <RotateCcw className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getEventColor(eventType: string) {
  switch (eventType) {
    case 'created':
      return 'bg-green-100 text-green-600';
    case 'status_change':
      return 'bg-blue-100 text-blue-600';
    case 'substatus_change':
      return 'bg-purple-100 text-purple-600';
    case 'note_added':
      return 'bg-gray-100 text-gray-600';
    case 'photo_uploaded':
      return 'bg-orange-100 text-orange-600';
    case 'assigned':
      return 'bg-indigo-100 text-indigo-600';
    case 'followup_set':
      return 'bg-yellow-100 text-yellow-600';
    case 'reactivated':
      return 'bg-teal-100 text-teal-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function parseStatusValue(value: string | null | undefined): { status?: string; subStatus?: string } {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return { status: value };
  }
}

export default function LeadTimeline({ history, className }: LeadTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn('flow-root', className)}>
      <ul className="-mb-8">
        {history.map((entry, index) => {
          const isLast = index === history.length - 1;
          const oldStatus = parseStatusValue(entry.oldValue);
          const newStatus = parseStatusValue(entry.newValue);

          return (
            <li key={entry.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                        getEventColor(entry.eventType)
                      )}
                    >
                      {getEventIcon(entry.eventType)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {getEventTypeLabel(entry.eventType)}
                      </p>
                      <time className="text-xs text-gray-500">
                        {formatDateTime(entry.createdAt)}
                      </time>
                    </div>

                    {entry.user && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        by {entry.user.name}
                      </p>
                    )}

                    {/* Status change details */}
                    {(entry.eventType === 'status_change' || entry.eventType === 'substatus_change') && (
                      <div className="mt-2 text-sm text-gray-600">
                        {oldStatus.status && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-gray-400">
                              {getLeadStatusLabel(oldStatus.status, oldStatus.subStatus)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-medium">
                              {getLeadStatusLabel(newStatus.status || '', newStatus.subStatus)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Photo upload count */}
                    {entry.eventType === 'photo_uploaded' && entry.metadata && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {(entry.metadata as any).photoIds?.length || 1} photo(s) uploaded
                        </span>
                      </div>
                    )}

                    {/* Note content */}
                    {entry.note && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {entry.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
