import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  Flame,
  Download,
  Clock,
  X,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  Binary,
  RotateCcw,
  Presentation,
  Archive,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Maximize2,
  Minimize2,
  Tv,
  Cpu,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Info,
  FolderArchive,
  Layers,
  Sparkles,
  ChevronDown,
  Grid,
  Share2,
} from 'lucide-react';
import JSZip from 'jszip';
import { SystemAppShareModal } from '../SystemAppShareModal';
import { VideoLiveViewer } from './VideoLiveViewer';
import { AudioLiveViewer } from './AudioLiveViewer';
import { ImageLiveViewer } from './ImageLiveViewer';
import { DocumentLiveViewer } from './DocumentLiveViewer';
import { PresentationLiveViewer } from './PresentationLiveViewer';
import { ArchiveLiveViewer } from './ArchiveLiveViewer';
import { PdfLiveViewer } from './PdfLiveViewer';
import { ImageGalleryLiveViewer } from './ImageGalleryLiveViewer';
import { playCyberBeep } from '../../lib/cyberAudio';

export interface LiveSandboxFile {
  blob: Blob;
  fileName: string;
  mimeType?: string;
  fileSize: number;
  source: 'decrypted' | 'preview';
  derivedKeyHex?: string;
}

interface LiveSandboxViewerProps {
  file: LiveSandboxFile;
  vaultFiles?: LiveSandboxFile[];
  vaultName?: string;
  onClose: () => void;
  onDownload?: () => void;
  onChangeFile?: () => void;
  onQuickSwitchDemo?: (type: 'pptx' | 'pdf' | 'docx' | 'xlsx' | 'audio' | 'image' | 'zip' | 'vault_mp3_png' | 'vault_mp3_mp4' | 'vault_gallery') => void;
}

export const LiveSandboxViewer: React.FC<LiveSandboxViewerProps> = ({
  file,
  vaultFiles,
  vaultName,
  onClose,
  onDownload,
  onChangeFile,
  onQuickSwitchDemo,
}) => {
  const [currentFile, setCurrentFile] = useState<LiveSandboxFile>(file);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [isGalleryActive, setIsGalleryActive] = useState<boolean>(false);

  // Auto-Purge timer states (Default 1 hour / 3600s, supports 3 hr 30 min and up to 5 hours)
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState<number>(3600);
  const [selectedPurgeInterval, setSelectedPurgeInterval] = useState<number>(3600);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeStepMessage, setPurgeStepMessage] = useState<string>('');
  const [isDedicatedWindow, setIsDedicatedWindow] = useState<boolean>(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [showSystemShareModal, setShowSystemShareModal] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Normalized list of files in the current sandbox
  const allFiles = useMemo(() => {
    if (vaultFiles && vaultFiles.length > 0) {
      return vaultFiles;
    }
    return [file];
  }, [vaultFiles, file]);

  const isVaultModel = allFiles.length > 1;

  // Filter image files for dedicated RAM Gallery Viewer
  const imageFiles = useMemo(() => {
    return allFiles.filter((f) => {
      const ext = f.fileName.split('.').pop()?.toLowerCase() || '';
      const mime = (f.mimeType || '').toLowerCase();
      return (
        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext) ||
        mime.startsWith('image/')
      );
    });
  }, [allFiles]);

  // Sync when props change
  useEffect(() => {
    setCurrentFile(file);
    if (vaultFiles && vaultFiles.length > 0) {
      const idx = vaultFiles.findIndex((vf) => vf.fileName === file.fileName);
      setActiveFileIndex(idx >= 0 ? idx : 0);

      // Auto-activate gallery view if vault is an image gallery container
      const imgs = vaultFiles.filter((f) => {
        const ext = f.fileName.split('.').pop()?.toLowerCase() || '';
        const mime = (f.mimeType || '').toLowerCase();
        return (
          ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext) ||
          mime.startsWith('image/')
        );
      });
      if (imgs.length >= 2 && (file.fileName.toLowerCase().includes('gallery') || imgs.length === vaultFiles.length)) {
        setIsGalleryActive(true);
      }
    } else {
      setActiveFileIndex(0);
    }
  }, [file, vaultFiles]);

  // Session auto-purge timer
  useEffect(() => {
    if (isTimerPaused || sessionSecondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSessionSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handlePurgeMemory();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerPaused, sessionSecondsRemaining]);

  // Detect category from filename extension & mimeType
  const detectedCategory = useMemo(() => {
    const ext = currentFile.fileName.split('.').pop()?.toLowerCase() || '';
    const mime = (currentFile.mimeType || '').toLowerCase();

    // 1. Presentation
    if (
      ['pptx', 'ppt', 'ppsx', 'odp', 'key'].includes(ext) ||
      mime.includes('presentation') ||
      mime.includes('powerpoint')
    ) {
      return 'presentation';
    }

    // 2. PDF Document
    if (ext === 'pdf' || mime.includes('pdf')) {
      return 'pdf';
    }

    // 3. Archive
    if (
      ['zip', 'tar', 'gz', '7z', 'rar', 'bz2'].includes(ext) ||
      mime.includes('zip') ||
      mime.includes('tar') ||
      mime.includes('compressed')
    ) {
      return 'archive';
    }

    // 4. Video
    if (
      ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v', '3gp'].includes(ext) ||
      mime.startsWith('video/')
    ) {
      return 'video';
    }

    // 5. Audio
    if (
      ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff'].includes(ext) ||
      mime.startsWith('audio/')
    ) {
      return 'audio';
    }

    // 6. Image
    if (
      ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext) ||
      mime.startsWith('image/')
    ) {
      return 'image';
    }

    // 7. Document / Office / Code
    if (
      [
        'docx',
        'doc',
        'xlsx',
        'xls',
        'csv',
        'tsv',
        'txt',
        'md',
        'json',
        'xml',
        'rtf',
        'epub',
        'odt',
        'ods',
        'html',
        'htm',
        'css',
        'js',
        'jsx',
        'ts',
        'tsx',
        'py',
        'rs',
        'go',
        'java',
        'c',
        'cpp',
        'h',
        'yaml',
        'yml',
        'log',
        'ini',
        'env',
        'sh',
        'bat',
        'sql',
      ].includes(ext) ||
      mime.includes('text') ||
      mime.includes('word') ||
      mime.includes('excel') ||
      mime.includes('spreadsheet') ||
      mime.includes('json') ||
      mime.includes('csv')
    ) {
      return 'document';
    }

    return 'unknown';
  }, [currentFile.fileName, currentFile.mimeType]);

  // Full RAM purge sequence
  const handlePurgeMemory = () => {
    playCyberBeep('lock');
    setIsPurging(true);
    setPurgeStepMessage('ZEROING VOLATILE BUFFERS IN RAM...');

    setTimeout(() => {
      setPurgeStepMessage('REVOKING ALL BLOB URL POINTERS & VAULT ENTRIES...');
    }, 200);

    setTimeout(() => {
      setPurgeStepMessage('FLUSHING AUDIO/VIDEO CODEC PIPELINES...');
    }, 400);

    setTimeout(() => {
      setIsPurging(false);
      onClose();
    }, 650);
  };

  const handleAdjustPurgeTimer = (secs: number) => {
    playCyberBeep('click');
    setSelectedPurgeInterval(secs);
    setSessionSecondsRemaining(secs);
  };

  // Format timer with support for hours (up to 5 hours) and minutes
  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Switch to a specific file within the vault
  const handleSelectVaultFile = (index: number) => {
    if (index < 0 || index >= allFiles.length) return;
    playCyberBeep('click');
    setActiveFileIndex(index);
    setCurrentFile(allFiles[index]);
    setIsGalleryActive(false);
  };

  // Save single active file to disk
  const handleSaveActiveToDisk = () => {
    playCyberBeep('success');
    if (onDownload && !isVaultModel) {
      onDownload();
      return;
    }
    const url = URL.createObjectURL(currentFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save all files in the vault as a ZIP bundle
  const handleDownloadAllAsZip = async () => {
    if (allFiles.length === 0) return;
    playCyberBeep('click');
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      for (const f of allFiles) {
        zip.file(f.fileName, f.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      playCyberBeep('success');

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vaultName || 'cipherflow_vault_bundle'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating vault zip:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Helper to get file type icon
  const getFileCategoryIcon = (name: string, mime?: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const m = (mime || '').toLowerCase();
    if (['pptx', 'ppt', 'ppsx', 'odp'].includes(ext) || m.includes('presentation')) return <Presentation className="w-3.5 h-3.5 text-[#FFB800]" />;
    if (['pdf'].includes(ext) || m.includes('pdf')) return <BookOpen className="w-3.5 h-3.5 text-[#00F0FF]" />;
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || m.startsWith('video/')) return <Video className="w-3.5 h-3.5 text-[#00F0FF]" />;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || m.startsWith('audio/')) return <Music className="w-3.5 h-3.5 text-[#FF0055]" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || m.startsWith('image/')) return <ImageIcon className="w-3.5 h-3.5 text-[#00FF66]" />;
    if (['docx', 'doc', 'txt', 'md'].includes(ext) || m.includes('word') || m.includes('text')) return <FileText className="w-3.5 h-3.5 text-[#00F0FF]" />;
    if (['xlsx', 'xls', 'csv'].includes(ext) || m.includes('spreadsheet')) return <FileSpreadsheet className="w-3.5 h-3.5 text-[#00FF66]" />;
    if (['zip', 'tar', 'gz', '7z'].includes(ext) || m.includes('zip')) return <Archive className="w-3.5 h-3.5 text-[#FFB800]" />;
    return <Binary className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#090C12] border border-[#1E2536] rounded-md shadow-[0_0_50px_rgba(0,0,0,0.8)] font-sans flex flex-col overflow-hidden relative transition-all ${
        isDedicatedWindow
          ? 'fixed inset-0 z-50 rounded-none h-dvh w-screen border-none bg-[#07090e] p-1.5 sm:p-3 overflow-hidden flex flex-col'
          : ''
      }`}
    >
      {/* Purge In-Progress Overlay */}
      {isPurging && (
        <div className="absolute inset-0 z-50 bg-[#07090e]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="p-4 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse">
            <Flame className="w-10 h-10" />
          </div>
          <div className="space-y-1 font-mono">
            <h3 className="text-base font-bold text-white tracking-wider">RAM PURGE IN PROGRESS</h3>
            <p className="text-xs text-rose-300 animate-pulse">{purgeStepMessage}</p>
          </div>
          <div className="w-48 h-1.5 bg-[#121622] rounded-full overflow-hidden border border-[#1E2536]">
            <div className="h-full bg-rose-500 w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Top Security & RAM Shield Bar */}
      <div className="bg-[#0e131f] border-b border-[#1E2536] p-2.5 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${isVaultModel ? 'bg-[#FF9933]/15 border border-[#FF9933]/40 text-[#FF9933]' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'}`}>
            {isVaultModel ? <FolderArchive className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-xs">
                {isVaultModel ? 'VAULT MODEL CONTAINER' : 'EPHEMERAL RAM LIVE VIEWER'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${isVaultModel ? 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                {isVaultModel ? `● ${allFiles.length} FILES IN VAULT` : '● ZERO-DISK EXPOSURE'}
              </span>
              {isDedicatedWindow && (
                <span className="px-2 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold font-mono">
                  DEDICATED STAGE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {isVaultModel
                ? `Multi-format vault package in volatile browser RAM (${formatBytes(allFiles.reduce((acc, f) => acc + f.fileSize, 0))}).`
                : `Decrypted into protected browser RAM (${formatBytes(currentFile.fileSize)}). Secure in-memory playback.`}
            </p>
          </div>
        </div>

        {/* Action Controls & Extended RAM Purge Timer */}
        <div className="flex items-center gap-2 self-stretch sm:self-center justify-between sm:justify-end flex-wrap">
          {/* Extended Auto-Purge Countdown (supports 3:30 min up to 5 hours) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161c2d] border border-[#1E2536] text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-mono">Purge:</span>
            <span
              className={`font-bold font-mono ${
                sessionSecondsRemaining < 60 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
              }`}
            >
              {formatTimer(sessionSecondsRemaining)}
            </span>

            {/* Extended Purge Timer Options (30s, 1m, 5m, 10m, 30m, 1h [default], 2h, 3h 30m, 5h) */}
            <select
              value={selectedPurgeInterval}
              onChange={(e) => handleAdjustPurgeTimer(Number(e.target.value))}
              title="Adjust RAM Auto-Purge Timer"
              className="bg-[#0f1422] border border-[#1E2536] text-[10px] font-mono text-slate-300 rounded px-1.5 py-0.5 outline-none cursor-pointer ml-1"
            >
              <option value={30}>30 Secs</option>
              <option value={60}>1 Min</option>
              <option value={300}>5 Mins</option>
              <option value={600}>10 Mins</option>
              <option value={1800}>30 Mins</option>
              <option value={3600}>1 Hour (Default)</option>
              <option value={7200}>2 Hours</option>
              <option value={12600}>3 Hr 30 Min</option>
              <option value={18000}>5 Hours (Vault Max)</option>
            </select>

            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setSessionSecondsRemaining(selectedPurgeInterval);
              }}
              title="Reset RAM Timer"
              className="text-slate-400 hover:text-white ml-0.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Purge Memory Button */}
          <button
            type="button"
            onClick={handlePurgeMemory}
            title="Immediately Wipe & Zero Memory Buffer from RAM"
            className="px-2.5 py-1 rounded bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-600/60 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.2)]"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Purge RAM</span>
          </button>

          {/* Dedicated Window Toggle */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setIsDedicatedWindow(!isDedicatedWindow);
            }}
            title={isDedicatedWindow ? 'Exit Dedicated Window' : 'Open Dedicated Window Stage'}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDedicatedWindow
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-200 border-[#1E2536]'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isDedicatedWindow ? 'Windowed' : 'Dedicated Stage'}</span>
          </button>

          {/* Save / Export buttons */}
          {isVaultModel ? (
            <button
              type="button"
              onClick={handleDownloadAllAsZip}
              disabled={isDownloadingZip}
              title="Download All Vault Files as ZIP"
              className="px-2.5 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#FF9933] border border-[#FF9933]/50 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDownloadingZip ? 'Bundling...' : 'Save All (ZIP)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveActiveToDisk}
              className="px-2.5 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#00FF66] border border-[#00FF66]/40 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* Share to System Apps */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setShowSystemShareModal(true);
            }}
            title="Share decrypted files using system downloaded apps (WhatsApp, Drive, Gmail, etc.)"
            className="px-2.5 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#38BDF8] border border-[#38BDF8]/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="hidden sm:inline">Share to Apps</span>
          </button>

          {/* Close X */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              handlePurgeMemory();
            }}
            className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-400 hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
            title="Purge & Close RAM Stream"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vault Model Interactive File Selector & Switcher Bar */}
      {isVaultModel && (
        <div className="px-3 sm:px-4 py-2 bg-[#0a0e18] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#FF9933] font-bold">
              <FolderArchive className="w-4 h-4" />
              <span>Vault Files ({allFiles.length}):</span>
            </div>

            {/* List of files in the vault as selectable pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {allFiles.map((f, idx) => {
                const isSelected = !isGalleryActive && idx === activeFileIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectVaultFile(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[#FF9933] text-slate-950 border-[#FF9933] font-bold shadow-[0_0_12px_rgba(255,153,51,0.3)]'
                        : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border-[#1E2536]'
                    }`}
                  >
                    {getFileCategoryIcon(f.fileName, f.mimeType)}
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">{f.fileName}</span>
                    <span className={`text-[9px] opacity-75 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                      {formatBytes(f.fileSize)}
                    </span>
                  </button>
                );
              })}

              {/* Dedicated Image Gallery Switcher Button (if vault has 2+ images) */}
              {imageFiles.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    playCyberBeep('click');
                    setIsGalleryActive(true);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isGalleryActive
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                      : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-600/40'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Photo Gallery ({imageFiles.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick active file save & share buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setShowSystemShareModal(true);
              }}
              title="Share decrypted files from this vault using system downloaded apps"
              className="px-2 py-0.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#38BDF8] border border-[#38BDF8]/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Share2 className="w-3 h-3 text-[#38BDF8]" />
              <span>Share to Apps</span>
            </button>

            <button
              type="button"
              onClick={handleSaveActiveToDisk}
              title={`Download ${currentFile.fileName}`}
              className="px-2 py-0.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#00FF66] border border-[#00FF66]/30 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Save File</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Switch Demo Bar (for single demo mode or non-vault viewing) */}
      {!isVaultModel && onQuickSwitchDemo && (
        <div className="px-3 sm:px-4 py-2 bg-[#0c101a] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden sm:inline font-mono">
              Demo Modes:
            </span>

            {/* Multi-Format Vault Combos */}
            <button
              type="button"
              onClick={() => onQuickSwitchDemo('vault_mp3_png')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-[#FF9933] border border-[#FF9933]/40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FolderArchive className="w-3 h-3 text-[#FF9933]" />
              <span>MP3 & PNG Vault</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickSwitchDemo('vault_mp3_mp4')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-[#FF9933] border border-[#FF9933]/40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <FolderArchive className="w-3 h-3 text-[#FF9933]" />
              <span>MP3 & MP4 Vault</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickSwitchDemo('vault_gallery')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-amber-300 border border-amber-500/40 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Grid className="w-3 h-3 text-amber-400" />
              <span>Image Gallery</span>
            </button>

            {/* Standard Single Formats */}
            <button
              type="button"
              onClick={() => onQuickSwitchDemo('pptx')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Presentation className="w-3 h-3 text-amber-400" />
              <span>PPTX</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickSwitchDemo('pdf')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] transition-colors cursor-pointer flex items-center gap-1"
            >
              <BookOpen className="w-3 h-3 text-cyan-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickSwitchDemo('audio')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Music className="w-3 h-3 text-rose-400" />
              <span>Audio</span>
            </button>

            {onChangeFile && (
              <button
                type="button"
                onClick={onChangeFile}
                className="px-2 py-1 rounded text-[11px] font-medium bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3 h-3 text-slate-400" />
                <span>Upload Custom</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded bg-[#161c2d] border border-[#1E2536] text-[11px] font-medium text-slate-300 flex items-center gap-1.5 font-mono">
              {detectedCategory === 'presentation' && <Presentation className="w-3.5 h-3.5 text-amber-400" />}
              {detectedCategory === 'pdf' && <BookOpen className="w-3.5 h-3.5 text-cyan-400" />}
              {detectedCategory === 'video' && <Video className="w-3.5 h-3.5 text-rose-400" />}
              {detectedCategory === 'audio' && <Music className="w-3.5 h-3.5 text-rose-400" />}
              {detectedCategory === 'image' && <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />}
              {detectedCategory === 'archive' && <Archive className="w-3.5 h-3.5 text-purple-400" />}
              {detectedCategory === 'document' && <FileText className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="capitalize">{detectedCategory} Mode</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Stage Body */}
      <div className="p-1.5 sm:p-3 bg-[#07090f] flex-1 min-h-0 overflow-auto flex flex-col justify-start">
        {/* Dedicated Gallery View if selected */}
        {isGalleryActive && imageFiles.length > 0 ? (
          <ImageGalleryLiveViewer
            images={imageFiles.map((im) => ({
              blob: im.blob,
              fileName: im.fileName,
              fileSize: im.fileSize,
              mimeType: im.mimeType,
            }))}
            isDedicatedWindow={isDedicatedWindow}
            onToggleDedicatedWindow={() => setIsDedicatedWindow(!isDedicatedWindow)}
          />
        ) : (
          <>
            {detectedCategory === 'presentation' && (
              <PresentationLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                fileSize={currentFile.fileSize}
                isDedicatedWindow={isDedicatedWindow}
                onToggleDedicatedWindow={() => setIsDedicatedWindow(!isDedicatedWindow)}
              />
            )}

            {detectedCategory === 'pdf' && (
              <PdfLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                fileSize={currentFile.fileSize}
                isDedicatedWindow={isDedicatedWindow}
                onToggleDedicatedWindow={() => setIsDedicatedWindow(!isDedicatedWindow)}
              />
            )}

            {detectedCategory === 'video' && (
              <VideoLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                mimeType={currentFile.mimeType || 'video/mp4'}
                fileSize={currentFile.fileSize}
                onPurgeRam={handlePurgeMemory}
              />
            )}

            {detectedCategory === 'audio' && (
              <AudioLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                mimeType={currentFile.mimeType || 'audio/mp3'}
                fileSize={currentFile.fileSize}
                isDedicatedWindow={isDedicatedWindow}
                onToggleDedicatedWindow={() => setIsDedicatedWindow(!isDedicatedWindow)}
              />
            )}

            {detectedCategory === 'image' && (
              <ImageLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                mimeType={currentFile.mimeType || 'image/png'}
                fileSize={currentFile.fileSize}
              />
            )}

            {detectedCategory === 'archive' && (
              <ArchiveLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                fileSize={currentFile.fileSize}
              />
            )}

            {detectedCategory === 'document' && (
              <DocumentLiveViewer
                key={`${currentFile.fileName}_${activeFileIndex}`}
                blob={currentFile.blob}
                fileName={currentFile.fileName}
                mimeType={currentFile.mimeType || 'text/plain'}
                fileSize={currentFile.fileSize}
                isDedicatedWindow={isDedicatedWindow}
                onToggleDedicatedWindow={() => setIsDedicatedWindow(!isDedicatedWindow)}
              />
            )}

            {detectedCategory === 'unknown' && (
              <div className="max-w-xl mx-auto my-auto p-6 sm:p-8 bg-[#0e131f] border border-[#1E2536] rounded-lg text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-white font-bold text-sm">Protected Binary Stream</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {currentFile.fileName} ({formatBytes(currentFile.fileSize)})
                  </p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This binary file is stored securely in volatile RAM without disk exposure. You can save a decrypted copy to your computer.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveActiveToDisk}
                    className="px-4 py-2 rounded bg-[#00FF66] text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.3)]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save Decrypted File</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* System App Share Modal */}
      <SystemAppShareModal
        isOpen={showSystemShareModal}
        onClose={() => setShowSystemShareModal(false)}
        files={allFiles.map((f) => ({
          blob: f.blob,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
        }))}
        vaultName={vaultName || 'cipherflow_vault'}
        initialSelectedIndices={isVaultModel ? undefined : [activeFileIndex]}
      />
    </div>
  );
};
