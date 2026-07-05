import type {
  DeleteFileResponse,
  FileItem,
  FileTreeResponse,
  ImportFileResponse,
} from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

async function parseErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return body.error?.message ?? `HTTP ${response.status}`;
}

export async function fetchFileTree(): Promise<FileItem[]> {
  const res = await fetchWithAuth('/api/files/tree', {
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const payload = (await res.json()) as Partial<FileTreeResponse>;
  return Array.isArray(payload.files) ? payload.files : [];
}

export async function deleteFileNode(
  fileId: string,
  password: string
): Promise<DeleteFileResponse> {
  const res = await fetchWithAuth(
    `/api/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }
  );

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<DeleteFileResponse>;
}

export async function importTelemetryCsv(
  file: File
): Promise<ImportFileResponse> {
  const csvContent = await file.text();
  const res = await fetchWithAuth('/api/files/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, csvContent }),
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<ImportFileResponse>;
}
