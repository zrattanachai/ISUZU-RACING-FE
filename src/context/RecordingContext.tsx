'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import fixWebmDuration from 'fix-webm-duration';
import { fetchFileTree } from '@/lib/services/fileService';
import type { FileItem } from '@/types';

export type RecordingState = 'IDLE' | 'RACING' | 'SAVING';

export interface FolderOption {
  id: string;
  name: string;
}

function downloadBlobToClient(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick to let the browser kick off the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface RecordingContextValue {
  recState: RecordingState;
  recordingSeconds: number;
  recordingDuration: string;
  saveModalOpen: boolean;
  recordingName: string;
  setRecordingName: (name: string) => void;
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  isNewFolder: boolean;
  setIsNewFolder: (v: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  folderOptions: FolderOption[];
  handleStart: (vehicleId: number, defaultPrefix: string) => Promise<void>;
  handleStop: () => void;
  handleCancel: () => void;
  handleSave: () => Promise<void>;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecordingContext(): RecordingContextValue {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecordingContext must be used inside RecordingProvider');
  return ctx;
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [recState, setRecState] = useState<RecordingState>('IDLE');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('root');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [fileTree, setFileTree] = useState<FileItem[]>([]);

  // MediaRecorder refs — not state so they survive re-renders and navigation
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const blobPromiseRef = useRef<Promise<Blob> | null>(null);
  const blobResolveRef = useRef<((b: Blob) => void) | null>(null);
  const resetStateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void fetchFileTree()
      .then(setFileTree)
      .catch(() => setFileTree([]));
  }, []);

  const validatedFolder = useMemo(() => {
    if (selectedFolder !== 'root' && !fileTree.some((f) => f.id === selectedFolder)) {
      return 'root';
    }
    return selectedFolder;
  }, [fileTree, selectedFolder]);

  useEffect(() => {
    if (recState !== 'RACING') return;
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [recState]);

  const folderOptions = useMemo((): FolderOption[] => {
    const folders = (Array.isArray(fileTree) ? fileTree : []).filter((f) => f.type === 'folder');
    return [
      { id: 'root', name: 'Home' },
      ...folders.map((f) => ({ id: f.id, name: f.name })),
    ];
  }, [fileTree]);

  const recordingDuration = useMemo(() => {
    const m = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const s = (recordingSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [recordingSeconds]);

  const stopAndOpenModal = useCallback(() => {
    setRecState('SAVING');
    setSaveModalOpen(true);
  }, []);

  const handleStart = useCallback(
    async (vehicleId: number, defaultPrefix: string) => {
      if (vehicleId <= 0) {
        alert('กรุณาเลือก Active Vehicle ก่อนเริ่มบันทึก');
        return;
      }

      // getDisplayMedia requires a secure context (https or localhost).
      // Accessing the app via http://<LAN-IP> will leave mediaDevices undefined.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        alert(
          'บราวเซอร์บล็อกการ record หน้าจอ เพราะเปิดผ่าน HTTP ที่ไม่ใช่ localhost\n\n' +
          'วิธีแก้: เปิดผ่าน http://localhost:3000 หรือใช้ HTTPS',
        );
        return;
      }

      // Step 1: Request screen share FIRST — requires user gesture
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Recording] getDisplayMedia failed:', err);
        // NotAllowedError = user clicked Cancel — stay silent
        if (!(err instanceof DOMException) || err.name !== 'NotAllowedError') {
          alert(`ไม่สามารถเริ่ม record หน้าจอได้: ${msg}`);
        }
        return;
      }

      const sessionName = `${defaultPrefix}_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}`;

      // Step 2: Setup blob Promise so handleSave can await it
      blobPromiseRef.current = new Promise<Blob>((resolve) => {
        blobResolveRef.current = resolve;
      });
      chunksRef.current = [];

      // Step 3: Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const type = recorder.mimeType || 'video/webm';
        const rawBlob = new Blob(chunksRef.current, { type });
        const durationMs = Math.max(0, Date.now() - startTimeRef.current);
        let finalBlob = rawBlob;
        if (type.includes('webm') && durationMs > 0) {
          try {
            finalBlob = await fixWebmDuration(rawBlob, durationMs, { logger: false });
          } catch (err) {
            console.warn('[Recording] fixWebmDuration failed, using raw blob:', err);
          }
        }
        blobResolveRef.current?.(finalBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      // Handle when user stops share via browser's native "Stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener('ended', async () => {
        if (recorder.state !== 'inactive') recorder.stop();
        // Auto-save immediately, skip the modal
        const blob = await Promise.race([
          blobPromiseRef.current ?? Promise.resolve(null),
          new Promise<null>((r) => setTimeout(() => r(null), 5000)),
        ]);
        if (blob) {
          const ext = (recorder.mimeType ?? 'video/webm').includes('mp4') ? 'mp4' : 'webm';
          try {
            downloadBlobToClient(blob, `${sessionName}.${ext}`);
          } catch (err) {
            console.error('[Recording] auto-download failed:', err);
          }
        }
        resetStateRef.current?.();
      });

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      streamRef.current = stream;
      startTimeRef.current = Date.now();

      setRecordingName(sessionName);
      setRecordingSeconds(0);
      setRecState('RACING');
    },
    [],
  );

  const handleStop = useCallback(() => {
    if (recState !== 'RACING') return;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData();
      recorder.stop();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
    stopAndOpenModal();
  }, [recState, stopAndOpenModal]);

  const resetState = useCallback(() => {
    setSaveModalOpen(false);
    setRecState('IDLE');
    setRecordingSeconds(0);
    setIsNewFolder(false);
    setNewFolderName('');
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    streamRef.current = null;
    startTimeRef.current = 0;
    blobPromiseRef.current = null;
    blobResolveRef.current = null;
  }, []);

  useEffect(() => {
    resetStateRef.current = resetState;
  }, [resetState]);

  const handleCancel = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleSave = useCallback(async () => {
    // Wait up to 5 s for the blob to become available (onstop fires async)
    let blob: Blob | null = null;
    if (blobPromiseRef.current) {
      blob = await Promise.race([
        blobPromiseRef.current,
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
    }

    if (!blob) {
      resetState();
      return;
    }

    const sessionName = recordingName.trim() || `Session_${Date.now()}`;
    const ext = (mediaRecorderRef.current?.mimeType ?? 'video/webm').includes('mp4')
      ? 'mp4'
      : 'webm';
    const filename = `${sessionName}.${ext}`;

    try {
      downloadBlobToClient(blob, filename);
    } catch (err) {
      console.error('[Recording] download failed:', err);
      alert(`บันทึกไฟล์ไม่สำเร็จ: ${err instanceof Error ? err.message : err}`);
    }

    resetState();
  }, [recordingName, resetState]);

  const value = useMemo(
    (): RecordingContextValue => ({
      recState,
      recordingSeconds,
      recordingDuration,
      saveModalOpen,
      recordingName,
      setRecordingName,
      selectedFolder: validatedFolder,
      setSelectedFolder,
      isNewFolder,
      setIsNewFolder,
      newFolderName,
      setNewFolderName,
      folderOptions,
      handleStart,
      handleStop,
      handleCancel,
      handleSave,
    }),
    [
      recState,
      recordingSeconds,
      recordingDuration,
      saveModalOpen,
      recordingName,
      validatedFolder,
      isNewFolder,
      newFolderName,
      folderOptions,
      handleStart,
      handleStop,
      handleCancel,
      handleSave,
    ],
  );

  return <RecordingContext.Provider value={value}>{children}</RecordingContext.Provider>;
}
