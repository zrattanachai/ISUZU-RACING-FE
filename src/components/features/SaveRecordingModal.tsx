'use client';

import React from 'react';
import { Save, FolderPlus, X } from 'lucide-react';

export interface FolderOption {
  id: string;
  name: string;
}

export interface SaveRecordingModalProps {
  recordingName: string;
  selectedFolder: string;
  folderOptions: FolderOption[];
  isNewFolder: boolean;
  newFolderName: string;
  onRecordingNameChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onIsNewFolderChange: (value: boolean) => void;
  onNewFolderNameChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

export const SaveRecordingModal: React.FC<SaveRecordingModalProps> = ({
  recordingName,
  selectedFolder,
  folderOptions,
  isNewFolder,
  newFolderName,
  onRecordingNameChange,
  onFolderChange,
  onIsNewFolderChange,
  onNewFolderNameChange,
  onCancel,
  onSave,
}) => (
  <div className="absolute inset-0 z-120 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="glass-panel w-full max-w-xl rounded-xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Save Race Recording</h3>
        <button
          onClick={onCancel}
          className="rounded border border-white/10 p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Recording Name
          </label>
          <input
            type="text"
            value={recordingName}
            onChange={(e) => onRecordingNameChange(e.target.value)}
            className="focus:border-accent w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none"
            placeholder="Race_Session_..."
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            Save Location
          </label>
          <select
            value={selectedFolder}
            onChange={(e) => onFolderChange(e.target.value)}
            className="focus:border-accent w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none"
            disabled={isNewFolder}
          >
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded border border-white/10 bg-black/30 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={isNewFolder}
              onChange={(e) => onIsNewFolderChange(e.target.checked)}
              className="accent-accent"
            />
            <FolderPlus className="text-accent h-4 w-4" />
            Create new root folder for this recording
          </label>
          {isNewFolder && (
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              className="focus:border-accent mt-3 w-full rounded border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none"
              placeholder="e.g. Buriram Race Day"
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="bg-accent/90 hover:bg-accent inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Recording
        </button>
      </div>
    </div>
  </div>
);
