'use client';

import React, { useEffect, useState } from 'react';
import { AdminUser, Priority, Task, TaskStatus } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Paperclip,
  X,
  Save,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePlatform } from '@/context/PlatformContext';
import type { UserRole } from '@/lib/authClient';
import { canAccessRoute } from '@/lib/navigationAccess';
import { fetchUsers } from '@/lib/services/administrationService';
import {
  fetchTasks,
  createTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '@/lib/services/taskService';

const FALLBACK_ASSIGNEE = 'Unassigned';

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case Priority.CRITICAL:
      return 'border-l-accent shadow-[inset_2px_0_0_0_var(--color-accent)]';
    case Priority.HIGH:
      return 'border-l-warning shadow-[inset_2px_0_0_0_var(--color-warning)]';
    case Priority.MEDIUM:
      return 'border-l-info';
    default:
      return 'border-l-zinc-700';
  }
}

function getColumnDotColor(status: TaskStatus) {
  switch (status) {
    case TaskStatus.TODO:
      return 'bg-zinc-500';
    case TaskStatus.IN_PROGRESS:
      return 'bg-info';
    case TaskStatus.DONE:
      return 'bg-success';
  }
}

function getAssigneeInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');

  return initials || '?';
}

function toUserRole(access: AdminUser['access']): UserRole {
  switch (access) {
    case 'Admin':
      return 'ADMIN';
    case 'Director':
      return 'DIRECTOR';
    case 'Engineer':
      return 'ENGINEER';
    case 'Competitor':
      return 'COMPETITOR';
  }
}

function isTaskAssignableUser(user: AdminUser) {
  return canAccessRoute('/task', toUserRole(user.access));
}

function buildAssigneeOptions(
  users: AdminUser[],
  tasks: Task[],
  currentAssignee?: string,
  preferredAssignee?: string
) {
  const options: string[] = [];
  const seen = new Set<string>();

  const append = (value?: string) => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    options.push(normalized);
  };

  append(preferredAssignee);
  users.forEach((user) => append(user.name));
  tasks.forEach((task) => append(task.assignee));
  append(currentAssignee);

  if (options.length === 0) {
    append(FALLBACK_ASSIGNEE);
  }

  return options;
}

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  draggedTaskId: string | null;
  onDrop: (event: React.DragEvent, status: TaskStatus) => void;
  onDragStart: (event: React.DragEvent, taskId: string) => void;
  onOpenModal: (task?: Task) => void;
  onDelete: (id: string, event: React.MouseEvent) => void;
}

function TaskColumn({
  status,
  title,
  tasks,
  draggedTaskId,
  onDrop,
  onDragStart,
  onOpenModal,
  onDelete,
}: TaskColumnProps) {
  return (
    <div
      className="glass-panel flex h-full min-w-75 flex-1 flex-col overflow-hidden rounded-xl border border-white/5"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, status)}
    >
      <div className="bg-surface/50 flex shrink-0 items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${getColumnDotColor(status)}`}
          ></span>
          <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        </div>
        <span className="rounded bg-black/30 px-2 py-0.5 font-mono text-xs text-zinc-600">
          {tasks.filter((task) => task.status === status).length}
        </span>
      </div>
      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-linear-to-b from-black/20 to-transparent p-3">
        {tasks
          .filter((task) => task.status === status)
          .map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(event) => onDragStart(event, task.id)}
              className={`group bg-surface hover:bg-surface/80 relative cursor-move rounded border border-white/5 p-4 transition-all duration-200 ${getPriorityColor(task.priority)} ${draggedTaskId === task.id ? 'scale-95 opacity-50' : 'opacity-100'}`}
            >
              <div className="bg-surface absolute top-2 right-2 flex gap-1 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onOpenModal(task)}
                  className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(event) => onDelete(task.id, event)}
                  className="hover:bg-danger/10 hover:text-danger rounded p-1 text-zinc-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="mb-2 flex items-start justify-between pr-8">
                <span
                  className={`rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${task.priority === Priority.CRITICAL ? 'text-accent' : 'text-zinc-500'}`}
                >
                  {task.priority}
                </span>
              </div>
              <h4 className="mb-1 text-sm font-light text-zinc-200">
                {task.title}
              </h4>
              <p className="mb-3 line-clamp-2 text-xs text-zinc-500">
                {task.description}
              </p>
              <div className="mb-3 flex items-center gap-3">
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <Calendar className="h-3 w-3" /> {task.dueDate}
                  </div>
                )}
                {task.attachment && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <Paperclip className="h-3 w-3" /> 1 File
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-400">
                  {getAssigneeInitials(task.assignee)}
                </div>
                <span className="text-[10px] text-zinc-600">
                  {task.assignee}
                </span>
              </div>
            </div>
          ))}
        {status === TaskStatus.TODO && (
          <button
            onClick={() => onOpenModal()}
            className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-white/10 py-2 text-sm text-zinc-600 transition-all hover:border-white/20 hover:bg-white/5 hover:text-zinc-400"
          >
            <Plus className="h-3 w-3" /> Add Task
          </button>
        )}
      </div>
    </div>
  );
}

export default function TaskBoardPage() {
  const { currentUser } = usePlatform();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    assignee: FALLBACK_ASSIGNEE,
    status: TaskStatus.TODO,
  });

  useEffect(() => {
    let isMounted = true;

    const loadBoard = async () => {
      const [tasksResult, usersResult] = await Promise.allSettled([
        fetchTasks(),
        fetchUsers(),
      ]);

      if (!isMounted) {
        return;
      }

      if (tasksResult.status === 'fulfilled') {
        setTasks(tasksResult.value);
        setErrorMessage(null);
      } else {
        setTasks([]);
        setErrorMessage('Failed to load tasks from the API.');
      }

      if (usersResult.status === 'fulfilled') {
        setAssignableUsers(usersResult.value.filter(isTaskAssignableUser));
      } else {
        setAssignableUsers([]);
      }

      setIsLoading(false);
    };

    void loadBoard();

    return () => {
      isMounted = false;
    };
  }, []);

  const assigneeOptions = buildAssigneeOptions(
    assignableUsers,
    tasks,
    newTask.assignee,
    currentUser?.name
  );
  const defaultAssignee = assigneeOptions[0] ?? FALLBACK_ASSIGNEE;
  const previewAssignees = assignableUsers.slice(0, 2);

  useEffect(() => {
    if (!isModalOpen || editingTaskId) {
      return;
    }

    if (
      typeof newTask.assignee === 'string' &&
      assigneeOptions.includes(newTask.assignee)
    ) {
      return;
    }

    setNewTask((prev) => ({
      ...prev,
      assignee: defaultAssignee,
    }));
  }, [
    assigneeOptions,
    defaultAssignee,
    editingTaskId,
    isModalOpen,
    newTask.assignee,
  ]);

  const buildEmptyTask = (): Partial<Task> => ({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    assignee: defaultAssignee,
    status: TaskStatus.TODO,
  });

  const handleDragStart = (event: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent, status: TaskStatus) => {
    event.preventDefault();
    if (draggedTaskId) {
      const taskId = draggedTaskId;
      const previousTasks = tasks;
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status } : task))
      );
      void apiUpdateTask(taskId, { status })
        .then((updatedTask) => {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          setErrorMessage(null);
        })
        .catch(() => {
          setTasks(previousTasks);
          setErrorMessage('Unable to update task status.');
        });
      setDraggedTaskId(null);
    }
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTaskId(task.id);
      setNewTask({ ...task });
    } else {
      setEditingTaskId(null);
      setNewTask(buildEmptyTask());
    }
    setIsModalOpen(true);
  };

  const saveTask = async () => {
    if (!newTask.title?.trim()) {
      return;
    }

    setIsSavingTask(true);
    setErrorMessage(null);

    if (editingTaskId) {
      try {
        const updatedTask = await apiUpdateTask(editingTaskId, {
          title: newTask.title.trim(),
          description: newTask.description || '',
          priority: newTask.priority || Priority.MEDIUM,
          assignee: newTask.assignee || defaultAssignee,
          status: newTask.status || TaskStatus.TODO,
          dueDate: newTask.dueDate,
          attachment: newTask.attachment,
        });
        setTasks((prev) =>
          prev.map((task) => (task.id === editingTaskId ? updatedTask : task))
        );
        setIsModalOpen(false);
      } catch {
        setErrorMessage('Unable to update task.');
      } finally {
        setIsSavingTask(false);
      }
      return;
    }

    try {
      const createdTask = await createTask({
        title: newTask.title.trim(),
        description: newTask.description || '',
        priority: newTask.priority || Priority.MEDIUM,
        assignee: newTask.assignee || defaultAssignee,
        status: newTask.status || TaskStatus.TODO,
        dueDate: newTask.dueDate,
        attachment: newTask.attachment,
      });
      setTasks((prev) => [...prev, createdTask]);
      setIsModalOpen(false);
    } catch {
      setErrorMessage('Unable to create task.');
    } finally {
      setIsSavingTask(false);
    }
  };

  const deleteTask = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    void apiDeleteTask(id).catch(() => {
      setTasks(previousTasks);
      setErrorMessage('Unable to delete task.');
    });
  };

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      <PageHeader
        title="Engineering Tasks"
        subtitle="Sprint 12 • Trackside Operations"
        actions={
          <div className="flex items-center gap-2">
            {previewAssignees.length > 0 ? (
              <div className="flex -space-x-2">
                {previewAssignees.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border border-black bg-zinc-800 text-xs text-white ${index === 0 ? 'z-10' : ''}`}
                    title={user.name}
                  >
                    {getAssigneeInitials(user.name)}
                  </div>
                ))}
              </div>
            ) : null}
            <button
              onClick={() => openModal()}
              className="bg-accent hover:bg-accent/80 ml-4 flex items-center gap-2 rounded px-4 py-1.5 text-sm text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> New Task
            </button>
          </div>
        }
      />

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-1 gap-6 overflow-x-auto pb-4">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-zinc-600">
            Loading tasks…
          </div>
        ) : (
          <>
            <TaskColumn
              title="Backlog"
              status={TaskStatus.TODO}
              tasks={tasks}
              draggedTaskId={draggedTaskId}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onOpenModal={openModal}
              onDelete={deleteTask}
            />
            <TaskColumn
              title="In Progress"
              status={TaskStatus.IN_PROGRESS}
              tasks={tasks}
              draggedTaskId={draggedTaskId}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onOpenModal={openModal}
              onDelete={deleteTask}
            />
            <TaskColumn
              title="Completed"
              status={TaskStatus.DONE}
              tasks={tasks}
              draggedTaskId={draggedTaskId}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onOpenModal={openModal}
              onDelete={deleteTask}
            />
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="glass-panel flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="text-lg font-light text-white">
                {editingTaskId ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Title
                </label>
                <input
                  type="text"
                  className="bg-surface focus:border-accent w-full rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                  placeholder="e.g. Adjust camber settings"
                  value={newTask.title ?? ''}
                  onChange={(event) =>
                    setNewTask({ ...newTask, title: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Status
                  </label>
                  <select
                    className="bg-surface focus:border-accent mb-4 w-full appearance-none rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                    value={newTask.status ?? TaskStatus.TODO}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        status: event.target.value as TaskStatus,
                      })
                    }
                  >
                    {Object.values(TaskStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Priority
                  </label>
                  <select
                    className="bg-surface focus:border-accent w-full appearance-none rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                    value={newTask.priority ?? Priority.MEDIUM}
                    onChange={(event) =>
                      setNewTask({
                        ...newTask,
                        priority: event.target.value as Priority,
                      })
                    }
                  >
                    {Object.values(Priority).map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Assignee
                  </label>
                  <select
                    className="bg-surface focus:border-accent w-full appearance-none rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                    value={newTask.assignee ?? defaultAssignee}
                    onChange={(event) =>
                      setNewTask({ ...newTask, assignee: event.target.value })
                    }
                  >
                    {assigneeOptions.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Assignees sync from the current task-access user list.
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Description
                </label>
                <textarea
                  className="bg-surface focus:border-accent min-h-25 w-full rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                  placeholder="Details about the task..."
                  value={newTask.description ?? ''}
                  onChange={(event) =>
                    setNewTask({ ...newTask, description: event.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="bg-surface focus:border-accent w-full rounded border border-white/10 px-3 py-2 text-sm text-white outline-none"
                    value={newTask.dueDate || ''}
                    onChange={(event) =>
                      setNewTask({ ...newTask, dueDate: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Attachment
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      className="bg-surface w-full rounded border border-white/10 px-3 py-1.5 text-xs text-zinc-400 file:mr-4 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-300 hover:file:bg-zinc-700"
                      onChange={(event) => {
                        if (event.target.files?.[0]) {
                          setNewTask({
                            ...newTask,
                            attachment: event.target.files[0].name,
                          });
                        }
                      }}
                    />
                    <Paperclip className="pointer-events-none absolute top-2 right-3 h-4 w-4 text-zinc-600" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface/50 flex justify-end gap-2 border-t border-white/10 p-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                disabled={isSavingTask || !newTask.title?.trim()}
                className="bg-accent hover:bg-accent/80 flex items-center gap-2 rounded px-6 py-2 text-sm font-medium text-white transition-colors"
              >
                <Save className="h-4 w-4" />{' '}
                {isSavingTask
                  ? 'Saving...'
                  : editingTaskId
                    ? 'Update Task'
                    : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
