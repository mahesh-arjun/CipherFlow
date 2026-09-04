import JSZip from 'jszip';

export interface ShareableDecryptedFile {
  blob: Blob;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
}

export interface SystemShareOutcome {
  success: boolean;
  sharedVia: 'system_apps' | 'direct_download' | 'zip_archive';
  userCancelled?: boolean;
  isPermissionDenied?: boolean;
  error?: string;
}

/**
 * Triggers standard browser file download for a single Blob
 */
export function triggerSingleBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Bundles multiple files into a ZIP archive and triggers download
 */
export async function downloadDecryptedFilesAsZip(
  files: ShareableDecryptedFile[],
  zipFileName?: string
): Promise<void> {
  const zip = new JSZip();
  for (const item of files) {
    zip.file(item.fileName, item.blob);
  }
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  triggerSingleBlobDownload(zipBlob, zipFileName || `cipherflow_decrypted_${Date.now()}.zip`);
}

/**
 * Checks if the Web Share API with files is available in the current browser context
 */
export function canShareFilesWithSystem(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }
  if (!navigator.canShare) {
    return true; // Older implementations support share without canShare check
  }
  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Share selected decrypted files from the vault using system downloaded apps (via Web Share API).
 * If the system share API is restricted or denied (e.g. within an iframe without web-share permissions),
 * this function gracefully reports the restriction and offers direct download / zip fallback.
 */
export async function shareDecryptedFilesToSystemApps(
  files: ShareableDecryptedFile[],
  options?: {
    title?: string;
    text?: string;
    zipName?: string;
    autoFallbackToDownload?: boolean;
  }
): Promise<SystemShareOutcome> {
  if (!files || files.length === 0) {
    return {
      success: false,
      sharedVia: 'direct_download',
      error: 'No decrypted files selected to share.',
    };
  }

  // 1. Convert decrypted Blobs to proper File objects with real MIME types
  const fileObjects: File[] = files.map((item) => {
    const mime = item.mimeType || item.blob.type || 'application/octet-stream';
    return new File([item.blob], item.fileName, {
      type: mime,
      lastModified: Date.now(),
    });
  });

  const shareTitle = options?.title || 'CipherFlow Decrypted Vault Files';
  const shareText =
    options?.text ||
    `Decrypted vault files (${files.length} item${files.length > 1 ? 's' : ''}) ready for system apps.`;

  // 2. Try native system app sharing via Web Share API
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    // Check canShare if supported
    let isShareable = true;
    if (typeof navigator.canShare === 'function') {
      try {
        isShareable = navigator.canShare({ files: fileObjects });
      } catch {
        isShareable = false;
      }
    }

    if (isShareable) {
      try {
        await navigator.share({
          files: fileObjects,
          title: shareTitle,
          text: shareText,
        });

        // User picked a system downloaded app and shared successfully
        return {
          success: true,
          sharedVia: 'system_apps',
        };
      } catch (err: any) {
        // If user cancelled the share picker sheet, that's not an error
        if (err?.name === 'AbortError') {
          return {
            success: true,
            sharedVia: 'system_apps',
            userCancelled: true,
          };
        }

        const msg = String(err?.message || '');
        const isPermission =
          err?.name === 'NotAllowedError' ||
          msg.includes('Permission denied') ||
          msg.includes('NotAllowedError');

        // If permission denied by iframe sandbox, offer fallback
        if (options?.autoFallbackToDownload) {
          if (files.length === 1) {
            triggerSingleBlobDownload(files[0].blob, files[0].fileName);
            return {
              success: true,
              sharedVia: 'direct_download',
              isPermissionDenied: isPermission,
              error: isPermission
                ? 'System share blocked by container permissions. File downloaded directly.'
                : undefined,
            };
          } else {
            await downloadDecryptedFilesAsZip(files, options?.zipName);
            return {
              success: true,
              sharedVia: 'zip_archive',
              isPermissionDenied: isPermission,
              error: isPermission
                ? 'System share blocked by container permissions. Files bundled into ZIP.'
                : undefined,
            };
          }
        }

        return {
          success: false,
          sharedVia: 'system_apps',
          isPermissionDenied: isPermission,
          error: isPermission
            ? 'System share permission denied in this frame. Use Direct Download or open app in a new tab.'
            : msg || 'Failed to share to system apps.',
        };
      }
    }
  }

  // 3. If Web Share is not available or files cannot be shared, fallback to direct download or ZIP
  if (options?.autoFallbackToDownload) {
    if (files.length === 1) {
      triggerSingleBlobDownload(files[0].blob, files[0].fileName);
      return {
        success: true,
        sharedVia: 'direct_download',
        error: 'Web Share API not supported in this browser. File downloaded to disk.',
      };
    } else {
      await downloadDecryptedFilesAsZip(files, options?.zipName);
      return {
        success: true,
        sharedVia: 'zip_archive',
        error: 'Web Share API not supported in this browser. Files exported as ZIP.',
      };
    }
  }

  return {
    success: false,
    sharedVia: 'direct_download',
    error: 'System Web Share API is not supported on this device/browser.',
  };
}
