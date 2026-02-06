import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  CheckCircle,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Calendar,
  Trash2,
  Edit,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  CloudSun,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectManagementApi, crewsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface ProjectManagementTabProps {
  projectId: string;
}

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TabView = 'tasks' | 'daily-logs';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  subtasks?: Task[];
}

interface DailyLog {
  id: string;
  date: string;
  summary: string;
  workCompleted?: string;
  issues?: string;
  weather?: string;
  hoursWorked?: number;
  crew?: { id: string; name: string };
  createdBy: { id: string; name: string };
}

const STATUS_CONFIG: Record<TaskStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: 'text-gray-400', label: 'Pending' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  blocked: { icon: AlertTriangle, color: 'text-red-500', label: 'Blocked' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: 'bg-gray-100 text-gray-600', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-700', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-700', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-700', label: 'Urgent' },
};

export default function ProjectManagementTab({ projectId }: ProjectManagementTabProps) {
  const [activeView, setActiveView] = useState<TabView>('tasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  // Fetch tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const response = await projectManagementApi.listTasks(projectId, { parentOnly: true });
      return response.data;
    },
    enabled: activeView === 'tasks',
  });

  // Fetch daily logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['project-daily-logs', projectId],
    queryFn: async () => {
      const response = await projectManagementApi.listDailyLogs(projectId);
      return response.data;
    },
    enabled: activeView === 'daily-logs',
  });

  // Fetch crews for log form
  const { data: crewsData } = useQuery({
    queryKey: ['crews'],
    queryFn: async () => {
      const response = await crewsApi.list();
      return response.data;
    },
    enabled: showLogForm,
  });

  const tasks = tasksData?.tasks || [];
  const taskSummary = tasksData?.summary || { total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0 };
  const logs = logsData?.logs || [];
  const totalHours = logsData?.totalHours || 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveView('tasks')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeView === 'tasks'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveView('daily-logs')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
              activeView === 'daily-logs'
                ? 'border-designer-500 text-designer-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Daily Logs
          </button>
        </nav>

        {activeView === 'tasks' && (
          <button
            onClick={() => setShowTaskForm(true)}
            className="btn btn-designer mb-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
        )}

        {activeView === 'daily-logs' && (
          <button
            onClick={() => setShowLogForm(true)}
            className="btn btn-designer mb-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Log
          </button>
        )}
      </div>

      {/* Tasks View */}
      {activeView === 'tasks' && (
        <div className="space-y-4">
          {/* Progress Summary */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Task Progress</p>
                <p className="text-lg font-semibold">
                  {taskSummary.completed} of {taskSummary.total} completed
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Circle className="w-4 h-4 text-gray-400" />
                  {taskSummary.pending} pending
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  {taskSummary.inProgress} in progress
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  {taskSummary.blocked} blocked
                </span>
              </div>
            </div>

            {taskSummary.total > 0 && (
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(taskSummary.completed / taskSummary.total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Tasks List */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="card p-12 text-center">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
              <p className="text-gray-500 mb-4">Create tasks to track project progress</p>
              <button onClick={() => setShowTaskForm(true)} className="btn btn-designer">
                <Plus className="w-4 h-4 mr-2" />
                Add First Task
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: Task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  onEdit={() => {
                    setEditingTask(task);
                    setShowTaskForm(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Daily Logs View */}
      {activeView === 'daily-logs' && (
        <div className="space-y-4">
          {/* Hours Summary */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Hours Logged</p>
                <p className="text-lg font-semibold">{totalHours.toFixed(1)} hours</p>
              </div>
              <div className="text-sm text-gray-500">
                {logs.length} log entries
              </div>
            </div>
          </div>

          {/* Logs List */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-designer-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No daily logs yet</h3>
              <p className="text-gray-500 mb-4">Record daily progress and activities</p>
              <button onClick={() => setShowLogForm(true)} className="btn btn-designer">
                <Plus className="w-4 h-4 mr-2" />
                Add First Log
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log: DailyLog) => (
                <DailyLogItem
                  key={log.id}
                  log={log}
                  projectId={projectId}
                  onEdit={() => {
                    setEditingLog(log);
                    setShowLogForm(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskFormModal
          projectId={projectId}
          task={editingTask}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Daily Log Form Modal */}
      {showLogForm && (
        <DailyLogFormModal
          projectId={projectId}
          log={editingLog}
          crews={crewsData?.crews || []}
          onClose={() => {
            setShowLogForm(false);
            setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}

// Task Item Component
function TaskItem({
  task,
  projectId,
  onEdit,
}: {
  task: Task;
  projectId: string;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const StatusIcon = STATUS_CONFIG[task.status].icon;
  const statusColor = STATUS_CONFIG[task.status].color;
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return projectManagementApi.updateTask(projectId, task.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return projectManagementApi.deleteTask(projectId, task.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success('Task deleted');
    },
  });

  const handleStatusChange = (newStatus: TaskStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  return (
    <div className="card">
      <div className="p-4 flex items-center gap-3">
        {hasSubtasks && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={() =>
            handleStatusChange(task.status === 'completed' ? 'pending' : 'completed')
          }
          className={cn('flex-shrink-0', statusColor)}
        >
          <StatusIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'font-medium text-gray-900',
              task.status === 'completed' && 'line-through text-gray-500'
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-gray-500 truncate">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-1 rounded-full', priorityConfig.color)}>
            {priorityConfig.label}
          </span>

          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(task.dueDate)}
            </span>
          )}

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
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      if (confirm('Delete this task?')) {
                        deleteMutation.mutate();
                      }
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

      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="border-t border-gray-100 pl-12 pb-2">
          {task.subtasks!.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              projectId={projectId}
              onEdit={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Daily Log Item Component
function DailyLogItem({
  log,
  projectId,
  onEdit,
}: {
  log: DailyLog;
  projectId: string;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return projectManagementApi.deleteDailyLog(projectId, log.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-daily-logs', projectId] });
      toast.success('Log deleted');
    },
  });

  return (
    <div className="card">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-900">
                {formatDate(log.date)}
              </span>
              {log.crew && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {log.crew.name}
                </span>
              )}
              {log.hoursWorked && (
                <span className="text-xs text-gray-500">
                  {log.hoursWorked} hours
                </span>
              )}
              {log.weather && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <CloudSun className="w-3 h-3" />
                  {log.weather}
                </span>
              )}
            </div>

            <p className="text-gray-700">{log.summary}</p>

            {expanded && (
              <div className="mt-3 space-y-2 text-sm">
                {log.workCompleted && (
                  <div>
                    <span className="font-medium text-gray-700">Work Completed:</span>
                    <p className="text-gray-600">{log.workCompleted}</p>
                  </div>
                )}
                {log.issues && (
                  <div>
                    <span className="font-medium text-red-700">Issues:</span>
                    <p className="text-gray-600">{log.issues}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(log.workCompleted || log.issues) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-designer-600 hover:text-designer-700"
              >
                {expanded ? 'Less' : 'More'}
              </button>
            )}

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
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
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
                    <hr className="my-1" />
                    <button
                      onClick={() => {
                        if (confirm('Delete this log?')) {
                          deleteMutation.mutate();
                        }
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
          Added by {log.createdBy.name}
        </p>
      </div>
    </div>
  );
}

// Task Form Modal
function TaskFormModal({
  projectId,
  task,
  onClose,
}: {
  projectId: string;
  task: Task | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (task) {
        return projectManagementApi.updateTask(projectId, task.id, data);
      }
      return projectManagementApi.createTask(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast.success(task ? 'Task updated' : 'Task created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {task ? 'Edit Task' : 'New Task'}
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
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
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="input"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="input"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-designer"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {task ? 'Update' : 'Create'} Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Daily Log Form Modal
function DailyLogFormModal({
  projectId,
  log,
  crews,
  onClose,
}: {
  projectId: string;
  log: DailyLog | null;
  crews: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    date: log?.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0],
    crewId: log?.crew?.id || '',
    summary: log?.summary || '',
    workCompleted: log?.workCompleted || '',
    issues: log?.issues || '',
    weather: log?.weather || '',
    hoursWorked: log?.hoursWorked?.toString() || '',
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (log) {
        return projectManagementApi.updateDailyLog(projectId, log.id, data);
      }
      return projectManagementApi.createDailyLog(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-daily-logs', projectId] });
      toast.success(log ? 'Log updated' : 'Log created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to save log');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      date: new Date(formData.date).toISOString(),
      crewId: formData.crewId || undefined,
      hoursWorked: formData.hoursWorked ? parseFloat(formData.hoursWorked) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {log ? 'Edit Daily Log' : 'New Daily Log'}
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crew
                  </label>
                  <select
                    value={formData.crewId}
                    onChange={(e) => setFormData({ ...formData, crewId: e.target.value })}
                    className="input"
                  >
                    <option value="">Select crew...</option>
                    {crews.map((crew: any) => (
                      <option key={crew.id} value={crew.id}>
                        {crew.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary *
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="input"
                  rows={2}
                  required
                  placeholder="Brief overview of the day's work..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Completed
                </label>
                <textarea
                  value={formData.workCompleted}
                  onChange={(e) => setFormData({ ...formData, workCompleted: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Detailed list of completed tasks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issues / Notes
                </label>
                <textarea
                  value={formData.issues}
                  onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Any problems or important notes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weather
                  </label>
                  <input
                    type="text"
                    value={formData.weather}
                    onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                    className="input"
                    placeholder="e.g., Sunny, 75F"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.hoursWorked}
                    onChange={(e) => setFormData({ ...formData, hoursWorked: e.target.value })}
                    className="input"
                    placeholder="8"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-designer"
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {log ? 'Update' : 'Create'} Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
