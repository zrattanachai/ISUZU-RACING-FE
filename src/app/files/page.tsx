'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Video,
  Folder,
  ChevronRight,
  Search,
  Trash2,
  Download,
  Lock,
  HardDriveDownload,
  LoaderCircle,
  TimerReset,
  Upload,
  CheckSquare,
  Square,
} from 'lucide-react';
import { usePlatform } from '@/context/PlatformContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileItem } from '@/types';
import {
  deleteFileNode,
  fetchFileTree,
  importTelemetryCsv,
} from '../../lib/services/fileService';

export default function FilesPage() {
  const { isAdmin } = usePlatform();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [filesError, setFilesError] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    file: FileItem | null;
  }>({
    isOpen: false,
    file: null,
  });
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const reloadBackendData = async () => {
    setIsLoadingFiles(true);

    try {
      const result = await fetchFileTree();
      setFiles(result);
      setFilesError('');
    } catch {
      setFiles([]);
      setFilesError('Unable to load file hierarchy.');
    }

    setIsLoadingFiles(false);
  };

  useEffect(() => {
    void reloadBackendData();
  }, []);

  useEffect(() => {
    if (
      currentFolderId !== 'root' &&
      !files.some((file) => file.id === currentFolderId)
    ) {
      setCurrentFolderId('root');
    }
  }, [currentFolderId, files]);

  useEffect(() => {
    setSelectedFileIds((ids) =>
      ids.filter((id) => files.some((f) => f.id === id))
    );
  }, [files]);

  // --- Filtering & Navigation ---
  const currentFiles = useMemo(() => {
    let filtered = files.filter((f) => f.parentId === currentFolderId);
    if (searchTerm) {
      filtered = files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          f.type !== 'folder'
      );
    }
    return filtered;
  }, [files, currentFolderId, searchTerm]);

  const breadcrumbs = useMemo(() => {
    const list: { id: string; name: string }[] = [{ id: 'root', name: 'Home' }];
    let currentId = currentFolderId;

    const path: { id: string; name: string }[] = [];
    while (currentId !== 'root') {
      const folder = files.find((f) => f.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return [...list, ...path];
  }, [files, currentFolderId]);

  const selectedFiles = useMemo(
    () => files.filter((file) => selectedFileIds.includes(file.id)),
    [files, selectedFileIds]
  );

  const selectableCurrentFiles = useMemo(
    () => currentFiles.filter((file) => file.type !== 'folder'),
    [currentFiles]
  );

  const allCurrentFilesSelected =
    selectableCurrentFiles.length > 0 &&
    selectableCurrentFiles.every((file) => selectedFileIds.includes(file.id));

  // --- Handlers ---
  const handleFileClick = (file: FileItem) => {
    if (isBulkMode && file.type !== 'folder') {
      setSelectedFileIds((ids) =>
        ids.includes(file.id)
          ? ids.filter((id) => id !== file.id)
          : [...ids, file.id]
      );
      return;
    }

    if (file.type === 'folder') {
      setCurrentFolderId(file.id);
      setSearchTerm('');
    }
  };

  const handleToggleCurrentSelection = () => {
    const currentIds = selectableCurrentFiles.map((file) => file.id);
    setSelectedFileIds((ids) => {
      if (allCurrentFilesSelected) {
        return ids.filter((id) => !currentIds.includes(id));
      }
      return Array.from(new Set([...ids, ...currentIds]));
    });
  };

  const handleDelete = async () => {
    if (!deleteModal.file || !password) {
      setDeleteError('Please enter administrator password');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteFileNode(deleteModal.file.id, password);
      await reloadBackendData();
      setDeleteModal({ isOpen: false, file: null });
      setPassword('');
      setDeleteError('');
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to delete file or folder. Please retry.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0 || !password) {
      setDeleteError('Please select files and enter administrator password');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      for (const file of selectedFiles) {
        await deleteFileNode(file.id, password);
      }
      await reloadBackendData();
      setBulkDeleteOpen(false);
      setSelectedFileIds([]);
      setPassword('');
      setDeleteError('');
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to delete selected files. Please retry.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImportCsv = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Please choose a CSV file.');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      await importTelemetryCsv(file);
      await reloadBackendData();
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Unable to import CSV file.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      <PageHeader
        title="Vault Explorer"
        subtitle="Telemetry & Media Storage"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-isuzu-red w-64 rounded-lg border border-white/10 bg-black/50 py-2 pr-4 pl-10 text-xs transition-all outline-none"
              />
            </div>
            <button
              onClick={() => void reloadBackendData()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white/5"
            >
              <TimerReset className="h-4 w-4" />
              Refresh Vault
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setIsBulkMode((value) => !value);
                  setSelectedFileIds([]);
                  setDeleteError('');
                }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${isBulkMode ? 'border-isuzu-red bg-isuzu-red/20 text-white' : 'border-white/10 text-white hover:bg-white/5'}`}
              >
                {isBulkMode ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Bulk Edit
              </button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white/5">
              <Upload className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import Data'}
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={isImporting}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = '';
                  void handleImportCsv(file);
                }}
              />
            </label>
          </div>
        }
      />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={`transition-colors hover:text-white ${idx === breadcrumbs.length - 1 ? 'text-isuzu-red' : ''}`}
            >
              {crumb.name}
            </button>
            {idx < breadcrumbs.length - 1 && (
              <ChevronRight className="h-3 w-3 text-zinc-700" />
            )}
          </React.Fragment>
        ))}
      </div>

      {isBulkMode && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <button
              onClick={handleToggleCurrentSelection}
              className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-1.5 font-bold text-white uppercase hover:bg-white/5"
            >
              {allCurrentFilesSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Select Visible Files
            </button>
            <span className="font-mono text-[11px] font-bold uppercase">
              {selectedFileIds.length} selected
            </span>
          </div>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={selectedFileIds.length === 0}
            className="inline-flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 uppercase transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> Delete Selected
          </button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {filesError && (
          <p className="mb-3 text-xs font-bold text-red-400 uppercase">
            {filesError}
          </p>
        )}
        {importError && (
          <p className="mb-3 text-xs font-bold text-red-400 uppercase">
            {importError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoadingFiles ? (
            <div className="col-span-full flex items-center gap-2 rounded-xl border border-white/5 bg-black/30 p-4 text-sm text-zinc-400">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading file
              hierarchy...
            </div>
          ) : (
            currentFiles.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-20">
                <Folder className="mb-4 h-16 w-16" />
                <p className="text-xs font-bold tracking-widest uppercase">
                  No items found in this directory
                </p>
              </div>
            )
          )}

          {currentFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all hover:border-white/10 hover:bg-zinc-800/50 ${selectedFileIds.includes(file.id) ? 'border-isuzu-red/60 bg-isuzu-red/10' : 'border-white/5 bg-zinc-900/30'}`}
            >
              {isBulkMode && file.type !== 'folder' && (
                <div className="absolute top-2 right-2 rounded bg-black/70 p-1 text-white">
                  {selectedFileIds.includes(file.id) ? (
                    <CheckSquare className="text-isuzu-red h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4 text-zinc-500" />
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 overflow-hidden">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    file.type === 'folder'
                      ? 'bg-blue-500/10 text-blue-500'
                      : file.type === 'csv'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-purple-500/10 text-purple-500'
                  }`}
                >
                  {file.type === 'folder' && (
                    <Folder className="h-5 w-5 fill-current opacity-50" />
                  )}
                  {file.type === 'csv' && <FileText className="h-5 w-5" />}
                  {file.type === 'mp4' && <Video className="h-5 w-5" />}
                  {file.type === 'zip' && (
                    <HardDriveDownload className="h-5 w-5" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <h3 className="group-hover:text-isuzu-red truncate text-xs font-bold text-white transition-colors">
                    {file.name}
                  </h3>
                  <div className="mt-1 flex gap-2 text-[10px] font-medium text-zinc-500">
                    <span>{file.date}</span>
                    {file.size && (
                      <>
                        <span className="text-zinc-800">•</span>
                        <span>{file.size}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.downloadUrl) {
                      window.open(
                        file.downloadUrl,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                  disabled={!file.downloadUrl}
                  className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isAdmin && !isBulkMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ isOpen: true, file });
                    }}
                    className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase">
                  Security Check
                </h2>
                <p className="text-xs text-zinc-500">
                  Administrative clearance required to delete.
                </p>
              </div>
            </div>

            <p className="mb-4 text-xs text-zinc-400">
              You are about to delete{' '}
              <span className="font-bold text-white">
                &quot;{deleteModal.file?.name}&quot;
              </span>
              . This action is permanent and cannot be reversed.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-white outline-none focus:border-red-500"
                />
                {deleteError && (
                  <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModal({ isOpen: false, file: null });
                    setPassword('');
                    setDeleteError('');
                  }}
                  className="flex-1 rounded-lg border border-white/10 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Verifying...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase">
                  Bulk Delete
                </h2>
                <p className="text-xs text-zinc-500">
                  {selectedFiles.length} selected files require clearance.
                </p>
              </div>
            </div>

            <div className="mb-4 max-h-28 overflow-y-auto rounded border border-white/10 bg-black/30 p-2 text-xs text-zinc-400">
              {selectedFiles.map((file) => (
                <div key={file.id} className="truncate py-0.5">
                  {file.name}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  Master Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="w-full rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-white outline-none focus:border-red-500"
                />
                {deleteError && (
                  <p className="mt-1.5 text-[10px] font-bold text-red-500 uppercase">
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setBulkDeleteOpen(false);
                    setPassword('');
                    setDeleteError('');
                  }}
                  className="flex-1 rounded-lg border border-white/10 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-colors hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
