/**
 * taskService
 *
 * REST client for engineering task board operations.
 * All mutations proxy through Next.js route handlers (secrets never hit the browser).
 */

import type { Task } from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

async function assertOk(res: Response): Promise<void> {
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetchWithAuth('/api/tasks', { cache: 'no-store' });
  await assertOk(res);
  const payload = (await res.json()) as { tasks: Task[] };
  return payload.tasks;
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const res = await fetchWithAuth('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  await assertOk(res);
  return res.json() as Promise<Task>;
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<Task, 'id'>>
): Promise<Task> {
  const res = await fetchWithAuth(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  await assertOk(res);
  return res.json() as Promise<Task>;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetchWithAuth(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await assertOk(res);
}
