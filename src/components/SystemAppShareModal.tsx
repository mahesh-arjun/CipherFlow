import React, { useState } from 'react';
import {
  Share2,
  Download,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  FileArchive,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import {
  ShareableDecryptedFile,
  shareDecryptedFilesToSystemApps,
  downloadDecryptedFilesAsZip,
  triggerSingleBlobDownload,
} from '../lib/systemShare';
import { playCyberBeep } from '../lib/cyberAudio';

interface SystemAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ShareableDecryptedFile[];
  vaultName?: string;
  initialSelectedIndices?: number[];
  onSuccess?: (message: string) => void;
}

export const SystemAppShareModal: React.FC<SystemAppShareModalProps> = ({
  isOpen,
  onClose,
  files,
  vaultName,
  initialSelectedIndices,
  onSuccess,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    if (initialSelectedIndices && initialSelectedIndices.length > 0) {
      return initialSelectedIndices;
    }
    return files.map((_, i) => i);
  });

  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [shareCompleted, setShareCompleted] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleSelect = (index: number) => {
    playCyberBeep('click');
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
    if (errorMessage) setErrorMessage(null);
  };

  const selectAll = () => {
    playCyberBeep('click');
    if (selectedIndices.length === files.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(files.map((_, i) => i));
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mime = (mimeType || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mime.startsWith('image/')) {
      return <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext) || mime.startsWith('audio/')) {
      return <Music className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    if (['mp4', 'webm', 'mov'].includes(ext) || mime.startsWith('video/')) {
      return <Video className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
    if (['zip', 'tar', 'gz', 'cf', '7z'].includes(ext)) {
      return <FileArchive className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  };

  const selectedFiles = selectedIndices
    .map((idx) => files[idx])
    .filter(Boolean);

  const handleShareToSystemApps = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least one decrypted file to share.');
      return;
    }

    setIsSharing(true);
    setErrorMessage(null);
    setIsPermissionDenied(false);

    try {
      const outcome = await shareDecryptedFilesToSystemApps(selectedFiles, {
        title: vaultName ? `Files from ${vaultName}` : 'Decrypted Vault Files',
        text: `Sharing ${selectedFiles.length} decrypted file(s) from CipherFlow vault.`,
        autoFallbackToDownload: false, // Don't auto download so user sees the dialog
      });

      if (outcome.success) {
        setShareCompleted(true);
        playCyberBeep('success');
        if (onSuccess) {
          onSuccess(
            outcome.userCancelled
              ? 'System share sheet dismissed.'
              : `Shared ${selectedFiles.length} decrypted file(s) to system apps!`
          );
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setIsPermissionDenied(!!outcome.isPermissionDenied);
        setErrorMessage(
          outcome.error || 'System sharing was not completed. You can download the files directly.'
        );
        playCyberBeep('alert');
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isPerm = err?.name === 'NotAllowedError' || msg.includes('Permission denied');
      setIsPermissionDenied(isPerm);
      setErrorMessage(
        isPerm
          ? 'System sharing permission was restricted by the browser frame. Please download directly or open in a new tab.'
          : msg || 'Failed to share to system apps.'
      );
      playCyberBeep('alert');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadDecryptedDirectly = async () => {
    if (selectedFiles.length === 0) return;
    setIsSharing(true);
    try {
      if (selectedFiles.length === 1) {
        triggerSingleBlobDownload(selectedFiles[0].blob, selectedFiles[0].fileName);
      } else {
        await downloadDecryptedFilesAsZip(
          selectedFiles,
          `${vaultName || 'decrypted_vault'}_selected.zip`
        );
      }
      playCyberBeep('success');
      if (onSuccess) {
        onSuccess(
          selectedFiles.length === 1
            ? `Downloaded ${selectedFiles[0].fileName}`
            : `Downloaded ${selectedFiles.length} files as ZIP.`
        );
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Download failed.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#090C12] border border-[#38BDF8]/50 shadow-[0_0_35px_rgba(56,189,248,0.25)] rounded-md w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0e1422] p-3.5 border-b border-[#1E2536] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-xs uppercase font-mono tracking-wide">
            <Share2 className="w-4 h-4 text-[#38BDF8]" />
            <span>Share Decrypted Files to System Apps</span>
          </div>
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 font-mono text-xs">
          {/* Explanation Banner */}
          <div className="bg-[#121829] border border-[#1E2536] rounded p-3 text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-white font-semibold text-xs text-[#38BDF8]">
              <Smartphone className="w-4 h-4 text-[#38BDF8]" />
              <span>Native System Downloaded Apps (WhatsApp, Drive, Telegram, Gmail, etc.)</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Select decrypted files from your vault below to send via your device's native system apps share sheet.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded bg-rose-950/70 border border-rose-500/60 text-rose-300 text-[11px] space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
              {isPermissionDenied && (
                <div className="text-[10px] text-rose-200/90 pl-6 space-y-1">
                  <p>
                    • <strong>Tip:</strong> Browser iframes may restrict the native OS share sheet. You can download the files directly below or open the app in a new tab to share directly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Notification */}
          {shareCompleted && (
            <div className="p-2.5 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Files prepared and sent to system share sheet!</span>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between pt-1 text-[11px] border-b border-[#1E2536] pb-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Files in Vault ({selectedIndices.length} / {files.length} selected):
            </span>
            <button
              type="button"
              onClick={selectAll}
              className="text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1 text-[10px]"
            >
              {selectedIndices.length === files.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* File Selection List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {files.map((file, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`p-2 rounded border cursor-pointer flex items-center justify-between gap-2 transition-all ${
                    isSelected
                      ? 'bg-[#152033] border-[#38BDF8]/60 text-white'
                      : 'bg-[#0f1420] border-[#1E2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    {getIcon(file.fileName, file.mimeType)}
                    <span className="truncate text-xs">{file.fileName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {formatBytes(file.fileSize || file.blob.size)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0e1422] border-t border-[#1E2536] flex flex-col gap-2 shrink-0 font-mono">
          <button
            type="button"
            disabled={isSharing || selectedFiles.length === 0}
            onClick={handleShareToSystemApps}
            className="w-full py-2.5 px-4 rounded bg-[#38BDF8] hover:bg-[#60cdff] text-[#090C12] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>
              {isSharing
                ? 'Opening System App Sheet...'
                : `Share ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''} to System Apps`}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSharing || selectedFiles.length === 0}
              onClick={handleDownloadDecryptedDirectly}
              className="flex-1 py-2 px-3 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#00FF66] border border-[#00FF66]/40 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Download selected decrypted files to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Direct {selectedFiles.length > 1 ? '(ZIP)' : ''}</span>
            </button>

            {isPermissionDenied && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Open app in a new tab for unconstrained system share"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Open New Tab</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
