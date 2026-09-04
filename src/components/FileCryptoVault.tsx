import React, { useState, useRef, useMemo } from 'react';
import {
  Lock,
  Unlock,
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Cpu,
  Key,
  ShieldCheck,
  Zap,
  ArrowRight,
  HardDrive,
  Clock,
  Sparkles,
  Layers,
  FileCheck,
  Sliders,
  Copy,
  Check,
  FileQuestion,
  Edit3,
  ShieldAlert,
  HelpCircle,
  FileText,
  FileSpreadsheet,
  Video,
  Music,
  Image as ImageIcon,
  Archive,
  Info,
  Terminal,
  Play,
  Flame,
  Radio,
  Presentation,
  BookOpen,
  X,
  FolderArchive,
  Grid,
  Plus,
  Trash2,
  Share2,
} from 'lucide-react';
import { SystemAppShareModal } from './SystemAppShareModal';
import {
  encryptFileCipherFlow,
  encryptVaultCipherFlow,
  decryptFileCipherFlow,
  inspectCipherFlowHeader,
  EncryptionResult,
  DecryptionResult,
  FileCryptoProgress,
  CipherFlowHeaderInfo,
} from '../lib/fileCrypto';
import { Argon2Variant } from '../types';
import { stringToBytes, hexToBytes, isValidHex } from '../lib/argon2';
import { playCyberBeep } from '../lib/cyberAudio';
import { LiveSandboxViewer, LiveSandboxFile } from './live-viewer/LiveSandboxViewer';
import {
  generateSampleCyberImage,
  generateSampleCyberAudio,
  generateSampleCyberPptx,
  generateSampleCyberDocx,
  generateSampleCyberXlsx,
  generateSampleCyberPdf,
  generateSampleCyberZip,
  generateSampleMediaComboVault,
  generateSampleAudioVideoComboVault,
  generateSampleImageGalleryVault,
  generateSampleFullEnterpriseVault,
} from '../lib/sampleDemoFiles';
import { CipherFlowLogo } from './CipherFlowLogo';
import { saveCipherFile, listCipherFiles, deleteCipherFile, CipherFileRecord } from '../lib/db';

export function FileCryptoVault() {
  const [activeMode, setActiveMode] = useState<'encrypt' | 'decrypt' | 'sandbox' | 'library'>('encrypt');

  // Encryption State: supports both single file and multi-file vault bundling
  const [encryptFiles, setEncryptFiles] = useState<File[]>([]);
  const [customVaultName, setCustomVaultName] = useState<string>('cipherflow_vault');
  const [customSingleFileName, setCustomSingleFileName] = useState<string>('');
  const [encryptPassword, setEncryptPassword] = useState('');
  const [showEncryptPassword, setShowEncryptPassword] = useState(false);
  const [argonVariant, setArgonVariant] = useState<Argon2Variant>('argon2id');
  const [memoryCostKiB, setMemoryCostKiB] = useState<number>(65536); // 64 MiB default
  const [iterations, setIterations] = useState<number>(3);
  const [parallelism, setParallelism] = useState<number>(2);

  // Salt mode: 'random' | 'custom'
  const [saltMode, setSaltMode] = useState<'random' | 'custom'>('random');
  const [customSaltType, setCustomSaltType] = useState<'text' | 'hex'>('text');
  const [customSaltValue, setCustomSaltValue] = useState<string>('');

  const [encryptProgress, setEncryptProgress] = useState<FileCryptoProgress | null>(null);
  const [encryptResult, setEncryptResult] = useState<EncryptionResult | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Decryption State
  const [decryptFile, setDecryptFile] = useState<File | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [showDecryptPassword, setShowDecryptPassword] = useState(false);
  const [headerInfo, setHeaderInfo] = useState<CipherFlowHeaderInfo | null>(null);
  const [userCustomOutputName, setUserCustomOutputName] = useState<string>('');
  const [decryptProgress, setDecryptProgress] = useState<FileCryptoProgress | null>(null);
  const [decryptResult, setDecryptResult] = useState<DecryptionResult | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Live Sandbox In-Memory Active File & Vault State
  const [activeLiveSandboxFile, setActiveLiveSandboxFile] = useState<LiveSandboxFile | null>(null);
  const [activeVaultFiles, setActiveVaultFiles] = useState<LiveSandboxFile[]>([]);
  const [activeVaultName, setActiveVaultName] = useState<string>('');
  const [autoOpenLiveViewer, setAutoOpenLiveViewer] = useState<boolean>(true);
  const [showSystemShareModal, setShowSystemShareModal] = useState<boolean>(false);

  // Direct Sandbox Upload State
  const [sandboxFile, setSandboxFile] = useState<File | null>(null);

  // Library State
  const [libraryFiles, setLibraryFiles] = useState<CipherFileRecord[]>([]);

  const encryptFileInputRef = useRef<HTMLInputElement | null>(null);
  const decryptFileInputRef = useRef<HTMLInputElement | null>(null);
  const sandboxFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Library Files
  const loadLibraryFiles = async () => {
    const files = await listCipherFiles();
    setLibraryFiles(files);
  };

  React.useEffect(() => {
    if (activeMode === 'library') {
      loadLibraryFiles();
    }
  }, [activeMode]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!encryptPassword) return { score: 0, label: 'EMPTY', color: 'text-neutral-500', barColor: 'bg-neutral-700' };
    let score = 0;
    if (encryptPassword.length >= 8) score += 1;
    if (encryptPassword.length >= 14) score += 1;
    if (/[A-Z]/.test(encryptPassword) && /[a-z]/.test(encryptPassword)) score += 1;
    if (/[0-9]/.test(encryptPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(encryptPassword)) score += 1;

    if (score <= 2) return { score, label: 'WEAK', color: 'text-rose-400', barColor: 'bg-rose-500' };
    if (score <= 3) return { score, label: 'MEDIUM', color: 'text-amber-400', barColor: 'bg-amber-500' };
    if (score <= 4) return { score, label: 'STRONG', color: 'text-[#00F0FF]', barColor: 'bg-[#00F0FF]' };
    return { score, label: 'CYBER-FORTRESS', color: 'text-[#00FF66]', barColor: 'bg-[#00FF66]' };
  }, [encryptPassword]);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Generate strong password
  const generateStrongPassword = () => {
    playCyberBeep('generate');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()_+~';
    let pass = '';
    for (let i = 0; i < 20; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEncryptPassword(pass);
  };

  // Helper for file type icons
  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <FileCode className="w-5 h-5 text-[#00FF66]" />;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pptx', 'ppt', 'ppsx', 'odp', 'key'].includes(ext)) return <Presentation className="w-5 h-5 text-[#FFB800]" />;
    if (['pdf'].includes(ext)) return <BookOpen className="w-5 h-5 text-[#00F0FF]" />;
    if (['docx', 'doc', 'txt', 'md', 'rtf'].includes(ext)) return <FileText className="w-5 h-5 text-[#00F0FF]" />;
    if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-[#00FF66]" />;
    if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) return <Video className="w-5 h-5 text-[#00F0FF]" />;
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return <Music className="w-5 h-5 text-[#FF0055]" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return <ImageIcon className="w-5 h-5 text-[#00FF66]" />;
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return <Archive className="w-5 h-5 text-[#FFB800]" />;
    return <FileCode className="w-5 h-5 text-[#00FF66]" />;
  };

  // Handle adding files to encrypt list
  const handleAddEncryptFiles = (files: FileList | File[]) => {
    playCyberBeep('click');
    const newFiles = Array.from(files);
    setEncryptFiles((prev) => {
      // Append without duplicate names
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
    setEncryptResult(null);
    setEncryptError(null);
    setEncryptProgress(null);
  };

  const handleRemoveEncryptFile = (index: number) => {
    playCyberBeep('click');
    setEncryptFiles((prev) => prev.filter((_, idx) => idx !== index));
    setEncryptResult(null);
  };

  // 1-Click Refresh / Clear All Files in Choose Files box
  const handleClearAllEncryptFiles = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playCyberBeep('click');
    setEncryptFiles([]);
    setEncryptResult(null);
    setEncryptError(null);
    setEncryptProgress(null);
    setCustomSingleFileName('');
    if (encryptFileInputRef.current) {
      encryptFileInputRef.current.value = '';
    }
  };

  // 1-Click Clear Decrypt Safe Box
  const handleClearDecryptFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playCyberBeep('click');
    setDecryptFile(null);
    setDecryptResult(null);
    setDecryptError(null);
    setDecryptProgress(null);
    setHeaderInfo(null);
    setUserCustomOutputName('');
    if (decryptFileInputRef.current) {
      decryptFileInputRef.current.value = '';
    }
  };

  // Handle Decrypt File Selection
  const handleDecryptFileSelect = async (file: File) => {
    playCyberBeep('click');
    setDecryptFile(file);
    setDecryptResult(null);
    setDecryptError(null);
    setDecryptProgress(null);
    setUserCustomOutputName('');

    try {
      const buffer = await file.arrayBuffer();
      const header = inspectCipherFlowHeader(buffer);
      setHeaderInfo(header);
    } catch {
      setHeaderInfo(null);
    }
  };

  // Handle Sandbox Direct File Selection
  const handleSandboxFileSelect = (file: File) => {
    playCyberBeep('click');
    setSandboxFile(file);
    const sandboxItem: LiveSandboxFile = {
      blob: file,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      source: 'preview',
    };
    setActiveLiveSandboxFile(sandboxItem);
    setActiveVaultFiles([sandboxItem]);
    setActiveVaultName(file.name);
  };

  // Launch live viewer with sample demo
  const handleLaunchSampleDemo = async (
    type: 'pptx' | 'pdf' | 'docx' | 'xlsx' | 'zip' | 'image' | 'audio' | 'vault_mp3_png' | 'vault_mp3_mp4' | 'vault_gallery' | 'vault_full'
  ) => {
    playCyberBeep('click');

    if (type === 'vault_mp3_png') {
      // Combo 1: MP3 Audio + PNG Image
      const items = generateSampleMediaComboVault();
      const files: LiveSandboxFile[] = items.map((it) => ({
        blob: it.blob,
        fileName: it.fileName,
        mimeType: it.mimeType,
        fileSize: it.fileSize,
        source: 'preview',
      }));
      setActiveVaultFiles(files);
      setActiveLiveSandboxFile(files[0]);
      setActiveVaultName('classified_audio_visual_vault');
      setActiveMode('sandbox');
    } else if (type === 'vault_mp3_mp4') {
      // Combo 2: MP3 Audio + Sensor Image + PDF Report
      const items = generateSampleAudioVideoComboVault();
      const files: LiveSandboxFile[] = items.map((it) => ({
        blob: it.blob,
        fileName: it.fileName,
        mimeType: it.mimeType,
        fileSize: it.fileSize,
        source: 'preview',
      }));
      setActiveVaultFiles(files);
      setActiveLiveSandboxFile(files[0]);
      setActiveVaultName('telemetry_surveillance_vault');
      setActiveMode('sandbox');
    } else if (type === 'vault_gallery') {
      // Combo 3: 4-Photo In-Memory Gallery
      const items = generateSampleImageGalleryVault();
      const files: LiveSandboxFile[] = items.map((it) => ({
        blob: it.blob,
        fileName: it.fileName,
        mimeType: it.mimeType,
        fileSize: it.fileSize,
        source: 'preview',
      }));
      setActiveVaultFiles(files);
      setActiveLiveSandboxFile(files[0]);
      setActiveVaultName('satellite_imagery_vault');
      setActiveMode('sandbox');
    } else if (type === 'vault_full') {
      // Combo 4: Full Enterprise Multi-Format Vault
      const items = await generateSampleFullEnterpriseVault();
      const files: LiveSandboxFile[] = items.map((it) => ({
        blob: it.blob,
        fileName: it.fileName,
        mimeType: it.mimeType,
        fileSize: it.fileSize,
        source: 'preview',
      }));
      setActiveVaultFiles(files);
      setActiveLiveSandboxFile(files[0]);
      setActiveVaultName('enterprise_classified_vault');
      setActiveMode('sandbox');
    } else if (type === 'pptx') {
      const blob = await generateSampleCyberPptx();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'classified_briefing_deck.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'pdf') {
      const blob = generateSampleCyberPdf();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'classified_intel_document.pdf',
        mimeType: 'application/pdf',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'docx') {
      const blob = await generateSampleCyberDocx();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'security_protocol_specification.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'xlsx') {
      const blob = await generateSampleCyberXlsx();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'security_audit_ledger.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'zip') {
      const blob = await generateSampleCyberZip();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'classified_package_bundle.zip',
        mimeType: 'application/zip',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'image') {
      const blob = generateSampleCyberImage('shield');
      const f: LiveSandboxFile = {
        blob,
        fileName: 'cyber_security_insignia.svg',
        mimeType: 'image/svg+xml',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    } else if (type === 'audio') {
      const blob = generateSampleCyberAudio();
      const f: LiveSandboxFile = {
        blob,
        fileName: 'synth_frequency_arpeggio.wav',
        mimeType: 'audio/wav',
        fileSize: blob.size,
        source: 'preview',
      };
      setActiveLiveSandboxFile(f);
      setActiveVaultFiles([f]);
      setActiveMode('sandbox');
    }
  };

  // Run Encryption (Single File or Multi-File Vault Container)
  const handleRunEncryption = async () => {
    if (encryptFiles.length === 0) {
      setEncryptError('Please select at least one file to lock into the container.');
      playCyberBeep('alert');
      return;
    }

    // Mandatory Vault Name validation for multi-file vaults
    if (encryptFiles.length > 1 && !customVaultName.trim()) {
      setEncryptError('Vault name is required for multi-file vaults. Please enter a vault name before encrypting.');
      playCyberBeep('alert');
      return;
    }

    if (!encryptPassword) {
      setEncryptError('Please enter a secret master password.');
      playCyberBeep('alert');
      return;
    }

    let customSaltBytes: Uint8Array | undefined = undefined;
    if (saltMode === 'custom') {
      if (!customSaltValue) {
        setEncryptError('Please enter a custom salt value or switch to Auto-Random.');
        playCyberBeep('alert');
        return;
      }
      if (customSaltType === 'hex') {
        if (!isValidHex(customSaltValue)) {
          setEncryptError('Invalid hex salt: must contain only hexadecimal characters (0-9, a-f).');
          playCyberBeep('alert');
          return;
        }
        customSaltBytes = hexToBytes(customSaltValue);
      } else {
        customSaltBytes = stringToBytes(customSaltValue);
      }
      if (customSaltBytes.length < 8) {
        setEncryptError('Custom salt must be at least 8 bytes (or 16 hex characters) for security.');
        playCyberBeep('alert');
        return;
      }
    }

    setIsEncrypting(true);
    setEncryptError(null);
    setEncryptResult(null);
    playCyberBeep('lock');

    try {
      const options = {
        variant: argonVariant,
        memorySizeKiB: memoryCostKiB,
        iterations,
        parallelism,
        customSalt: customSaltBytes,
      };

      if (encryptFiles.length === 1) {
        // Single file mode
        const singleFile = encryptFiles[0];
        const arrayBuffer = await singleFile.arrayBuffer();
        const effectiveFileName = customSingleFileName.trim()
          ? (customSingleFileName.trim().includes('.') ? customSingleFileName.trim() : `${customSingleFileName.trim()}.${singleFile.name.split('.').pop() || 'dat'}`)
          : singleFile.name;

        const result = await encryptFileCipherFlow(
          arrayBuffer,
          effectiveFileName,
          singleFile.type || 'application/octet-stream',
          encryptPassword,
          options,
          (progress) => setEncryptProgress(progress)
        );

        // If user provided custom package name, adjust output name
        if (customSingleFileName.trim()) {
          const baseName = customSingleFileName.trim().replace(/\.cf$/i, '');
          result.encryptedFileName = `${baseName}.cf`;
        }

        setEncryptResult(result);
        
        // Save to Library
        const libFile = new File([result.encryptedBlob], result.encryptedFileName, {
          type: 'application/octet-stream',
        });
        await saveCipherFile(libFile);

      } else {
        // Multi-file Vault Container Mode
        const vaultItems = await Promise.all(
          encryptFiles.map(async (f) => {
            const data = await f.arrayBuffer();
            return {
              fileName: f.name,
              data,
              mimeType: f.type || 'application/octet-stream',
            };
          })
        );

        const sanitizedVault = customVaultName.trim() || 'cipherflow_vault';
        const result = await encryptVaultCipherFlow(
          vaultItems,
          sanitizedVault,
          encryptPassword,
          options,
          (progress) => setEncryptProgress(progress)
        );
        setEncryptResult(result);
        
        // Save to Library
        const libFile = new File([result.encryptedBlob], result.encryptedFileName, {
          type: 'application/octet-stream',
        });
        await saveCipherFile(libFile);
      }

      playCyberBeep('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEncryptError(msg);
      playCyberBeep('alert');
    } finally {
      setIsEncrypting(false);
    }
  };

  // Run Decryption
  const handleRunDecryption = async (overrideLiveView?: boolean) => {
    if (!decryptFile) {
      setDecryptError('Please upload an encrypted .cf safe box file.');
      playCyberBeep('alert');
      return;
    }
    if (!decryptPassword) {
      setDecryptError('Please enter the secret master password.');
      playCyberBeep('alert');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptResult(null);
    playCyberBeep('unlock');

    try {
      const encryptedBuffer = await decryptFile.arrayBuffer();
      const result = await decryptFileCipherFlow(
        encryptedBuffer,
        decryptPassword,
        userCustomOutputName || undefined,
        (progress) => setDecryptProgress(progress)
      );

      setDecryptResult(result);
      if (!userCustomOutputName) {
        setUserCustomOutputName(result.suggestedFileName);
      }
      playCyberBeep('success');

      // Check if result is a multi-file vault container
      if (result.isVault && result.files && result.files.length > 0) {
        const vaultFilesList: LiveSandboxFile[] = result.files.map((vf) => ({
          blob: vf.blob,
          fileName: vf.fileName,
          mimeType: vf.mimeType,
          fileSize: vf.fileSize,
          source: 'decrypted',
        }));
        setActiveVaultFiles(vaultFilesList);
        setActiveLiveSandboxFile(vaultFilesList[0]);
        setActiveVaultName(result.vaultName || result.suggestedFileName.replace(/\.cf$/i, ''));
      } else {
        const singleItem: LiveSandboxFile = {
          blob: result.decryptedBlob,
          fileName: result.suggestedFileName,
          mimeType: result.mimeType,
          fileSize: result.originalSize,
          source: 'decrypted',
        };
        setActiveVaultFiles([singleItem]);
        setActiveLiveSandboxFile(singleItem);
        setActiveVaultName(result.suggestedFileName);
      }

      // If user selected Live View or auto-open is enabled
      if (overrideLiveView || autoOpenLiveViewer) {
        setActiveMode('sandbox');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDecryptError(msg);
      playCyberBeep('alert');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Transfer encrypted result directly to decryptor for quick test
  const handleSendToDecryptor = () => {
    if (!encryptResult) return;
    playCyberBeep('click');
    const mockFile = new File([encryptResult.encryptedBlob], encryptResult.encryptedFileName, {
      type: 'application/octet-stream',
    });
    setActiveMode('decrypt');
    handleDecryptFileSelect(mockFile);
    setDecryptPassword(encryptPassword);
  };

  const totalEncryptSize = useMemo(() => {
    return encryptFiles.reduce((acc, f) => acc + f.size, 0);
  }, [encryptFiles]);

  return (
    <div className="bg-[#0D1017]/95 border border-[#1E2536] rounded-md p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6 font-sans cyber-grid relative backdrop-blur-sm">
      {/* Ephemeral RAM Stream Status Banner when active in other tabs */}
      {activeLiveSandboxFile && activeMode !== 'sandbox' && (
        <div className="bg-[#121622] border border-[#FF9933]/60 p-2.5 sm:px-4 rounded-sm flex items-center justify-between gap-3 text-xs shadow-[0_0_15px_rgba(255,153,51,0.15)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-ping" />
            <span className="text-white font-bold text-xs">
              Live RAM Stream Active:
            </span>
            <span className="text-[#FF9933] font-mono text-xs truncate max-w-xs font-semibold">
              {activeVaultFiles.length > 1
                ? `Vault (${activeVaultFiles.length} files) • ${activeLiveSandboxFile.fileName}`
                : `${activeLiveSandboxFile.fileName} (${formatBytes(activeLiveSandboxFile.fileSize)})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setActiveMode('sandbox');
              }}
              className="px-3 py-1 rounded bg-[#FF9933] hover:bg-[#FFAA4D] text-[#090C12] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(255,153,51,0.3)]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View in RAM Sandbox</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('lock');
                setActiveLiveSandboxFile(null);
                setActiveVaultFiles([]);
              }}
              className="p-1 rounded bg-[#161c2d] hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-[#1E2536] transition-colors cursor-pointer"
              title="Purge Stream from RAM"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Header HUD Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2536] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-white border border-[#1E2536] shadow-[0_0_15px_rgba(204,164,59,0.25)] shrink-0 p-0.5 overflow-hidden flex items-center justify-center">
            <CipherFlowLogo size={40} animate={true} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-display font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="text-white">CIPHER</span><span className="text-[#CCA43B]">FLOW</span> <span className="text-[#8E9299]">SAFE BOX &amp; VAULT</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 uppercase font-bold">
                MULTI-FORMAT VAULT • UNLIMITED CAPACITY • ZERO-DISK RAM
              </span>
            </div>
            <p className="text-[11px] text-[#8E9299] font-mono mt-0.5">
              MILITARY-GRADE ARGON2ID + AES-256-GCM • VAULT BUNDLES • IN-MEMORY EPHEMERAL LIVE VIEW
            </p>
          </div>
        </div>

        {/* Mode Tabs: 1. LOCK | 2. UNLOCK | 3. SANDBOX */}
        <div className="flex flex-wrap bg-[#090C12] p-1 rounded-md border border-[#1E2536] gap-1">
          <button
            id="tab-mode-encrypt"
            onClick={() => {
              playCyberBeep('click');
              setActiveMode('encrypt');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'encrypt'
                ? 'bg-[#EF4444] text-white shadow-[0_0_18px_rgba(239,68,68,0.5)] border border-[#EF4444]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>1. LOCK FILE</span>
          </button>

          <button
            id="tab-mode-decrypt"
            onClick={() => {
              playCyberBeep('click');
              setActiveMode('decrypt');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'decrypt'
                ? 'bg-[#00FF66] text-[#090C12] shadow-[0_0_18px_rgba(0,255,102,0.45)] border border-[#00FF66]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>2. UNLOCK FILE</span>
          </button>

          <button
            id="tab-mode-sandbox"
            onClick={() => {
              playCyberBeep('click');
              setActiveMode('sandbox');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'sandbox'
                ? 'bg-[#FF9933] text-[#090C12] shadow-[0_0_18px_rgba(255,153,51,0.5)] border border-[#FF9933]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>3. RAM SANDBOX</span>
          </button>

          <button
            id="tab-mode-library"
            onClick={() => {
              playCyberBeep('click');
              setActiveMode('library');
            }}
            className={`px-3.5 sm:px-4 py-2 rounded text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeMode === 'library'
                ? 'bg-[#38BDF8] text-[#090C12] shadow-[0_0_18px_rgba(56,189,248,0.5)] border border-[#38BDF8]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#121622]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>4. CIPHER LIBRARY</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MODE 1: ENCRYPT FILE (LOCK INTO .CF SAFE BOX / VAULT) */}
      {/* ================================================================ */}
      {activeMode === 'encrypt' && (
        <div className="space-y-6 animate-fade-in">
          {/* Guide Banner */}
          <div className="bg-[#121622]/80 border border-[#EF4444]/40 p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white uppercase text-[11px] block">
                  Safe Box &amp; Multi-File Vault Container System:
                </span>
                <p className="text-[#A0AEC0] text-[11px]">
                  Lock single files or <strong>unlimited combinations of multiple files (e.g. MP3 + PNG, MP3 + MP4, PPTX, or full photo galleries)</strong> into a single authenticated <code className="text-[#EF4444] font-bold">.cf</code> vault. The original names, sizes, and structure remain 100% encrypted in RAM.
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#090C12] border border-[#EF4444]/40 text-[10px] text-[#EF4444] font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ZERO METADATA LEAKS</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: File, Password & Config Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* File Upload Zone (Supports Multiple Files for Vault) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Choose Files to Lock (Multi-File Vault &amp; Combos Supported)</span>
                  </span>
                  {encryptFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#EF4444] text-[10px] font-bold">
                        {encryptFiles.length} file{encryptFiles.length > 1 ? 's' : ''} ({formatBytes(totalEncryptSize)})
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllEncryptFiles}
                        title="Remove all chosen files"
                        className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/15 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 hover:border-[#EF4444] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Refresh / Clear All</span>
                      </button>
                    </div>
                  )}
                </label>

                <div
                  id="dropzone-encrypt-file"
                  onClick={() => encryptFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleAddEncryptFiles(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed rounded-sm p-5 text-center cursor-pointer transition-all ${
                    encryptFiles.length > 0
                      ? 'border-[#EF4444] bg-[#090C12]/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                      : 'border-[#1E2536] hover:border-[#EF4444]/80 bg-[#090C12]/50 hover:bg-[#090C12] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                  }`}
                >
                  <input
                    ref={encryptFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddEncryptFiles(e.target.files);
                      }
                    }}
                  />

                  {encryptFiles.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <FolderArchive className="w-4 h-4 text-[#EF4444]" />
                          <span>
                            {encryptFiles.length > 1
                              ? `VAULT BUNDLE: ${encryptFiles.length} Files Selected`
                              : `SINGLE FILE SELECTED`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#EF4444] font-mono font-bold">
                            Total: {formatBytes(totalEncryptSize)}
                          </span>
                          <button
                            type="button"
                            onClick={handleClearAllEncryptFiles}
                            title="Clear all selected files with one click"
                            className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#121622] hover:bg-[#EF4444]/20 text-[#8E9299] hover:text-[#EF4444] border border-[#1E2536] hover:border-[#EF4444]/60 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Remove All ({encryptFiles.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* File Items Pill Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                        {encryptFiles.map((file, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded bg-[#121622] border border-[#1E2536] flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {getFileIcon(file.name)}
                              <div className="truncate text-left">
                                <span className="font-bold text-white block truncate">{file.name}</span>
                                <span className="text-[9px] text-[#8E9299]">{formatBytes(file.size)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveEncryptFile(idx);
                              }}
                              title="Remove File"
                              className="p-1 text-[#8E9299] hover:text-rose-400 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-[#8E9299]">
                        <Plus className="w-3 h-3 text-[#EF4444]" />
                        <span>Click or drag more files to add to this vault</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="p-3 rounded-sm bg-[#121622] border border-[#1E2536] text-[#EF4444]">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        Drag &amp; Drop or Click to Select File(s)
                      </div>
                      <p className="text-[10px] text-[#8E9299] max-w-md">
                        Supports single files or multi-format combos (e.g., MP3 + PNG, MP3 + MP4, PPTX, PDF, etc.) into one .cf container.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vault Name (Mandatory for Multi-File Vaults) */}
              {encryptFiles.length > 1 ? (
                <div className="bg-[#090C12] border border-[#EF4444]/60 p-3.5 rounded-sm space-y-2 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[#EF4444]">
                      <FolderArchive className="w-3.5 h-3.5" />
                      <span>Vault Container Name (Required for Vault)</span>
                    </label>
                    <span className="text-[9px] font-mono font-bold bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.5 rounded border border-[#EF4444]/40 uppercase">
                      Required
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customVaultName}
                      onChange={(e) => setCustomVaultName(e.target.value)}
                      placeholder="e.g. classified_media_vault"
                      className="flex-1 bg-[#121622] border border-[#1E2536] focus:border-[#EF4444] rounded-sm px-3 py-2 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                    />
                    <span className="text-xs font-mono text-[#EF4444] font-bold px-2 py-1.5 bg-[#121622] border border-[#1E2536] rounded-sm">
                      .cf
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8E9299] flex items-center justify-between">
                    <span>All {encryptFiles.length} files will be locked into this single safe package.</span>
                    <span className="text-white font-mono font-bold">
                      Package: {customVaultName.trim() || 'vault'}.cf
                    </span>
                  </p>
                </div>
              ) : encryptFiles.length === 1 ? (
                /* Optional Output Name for Single File */
                <div className="bg-[#090C12] border border-[#1E2536] p-3 rounded-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-[#00F0FF]">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Custom Output Package Name (Optional)</span>
                    </label>
                    <span className="text-[9px] font-mono text-[#8E9299] uppercase">
                      Optional
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customSingleFileName}
                      onChange={(e) => setCustomSingleFileName(e.target.value)}
                      placeholder={`Defaults to: ${encryptFiles[0]?.name}.cf`}
                      className="flex-1 bg-[#121622] border border-[#1E2536] focus:border-[#00F0FF] rounded-sm px-2.5 py-1.5 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                    />
                    <span className="text-xs font-mono text-[#00F0FF] font-bold px-2 py-1.5 bg-[#121622] border border-[#1E2536] rounded-sm">
                      .cf
                    </span>
                  </div>
                  <p className="text-[9px] text-[#8E9299]">
                    Output: <span className="text-white font-mono font-bold">{customSingleFileName.trim() ? `${customSingleFileName.trim().replace(/\.cf$/i, '')}.cf` : `${encryptFiles[0]?.name}.cf`}</span>
                  </p>
                </div>
              ) : null}

              {/* Password Input */}
              <div className="space-y-1.5 bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-white uppercase tracking-wider">
                  <label htmlFor="input-encrypt-password" className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Set Secret Master Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[10px] text-[#00F0FF] hover:underline flex items-center gap-1 cursor-pointer uppercase font-bold"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="input-encrypt-password"
                    type={showEncryptPassword ? 'text' : 'password'}
                    value={encryptPassword}
                    onChange={(e) => setEncryptPassword(e.target.value)}
                    placeholder="Enter high-entropy passphrase to lock your file(s)..."
                    className="w-full bg-[#121622] border border-[#1E2536] focus:border-[#EF4444] rounded-sm px-3 py-2 pr-10 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setShowEncryptPassword(!showEncryptPassword);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white cursor-pointer"
                  >
                    {showEncryptPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {encryptPassword && (
                  <div className="pt-1.5 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#8E9299]">Strength:</span>
                      <span className={`font-bold font-mono ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-1.5 rounded-xs ${
                            idx <= passwordStrength.score ? passwordStrength.barColor : 'bg-[#1E2536]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Salt Config */}
              <div className="bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#EF4444]" />
                      <span>Cryptographic Defense Salt</span>
                    </span>
                    <p className="text-[9px] text-[#8E9299]">
                      Adds cryptographic entropy to defend against dictionary and rainbow-table attacks.
                    </p>
                  </div>

                  <div className="flex bg-[#121622] p-0.5 rounded-sm border border-[#1E2536] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setSaltMode('random');
                      }}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                        saltMode === 'random' ? 'bg-[#EF4444] text-white' : 'text-[#8E9299] hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Auto Random</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setSaltMode('custom');
                      }}
                      className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-sm transition-all cursor-pointer flex items-center gap-1 ${
                        saltMode === 'custom' ? 'bg-[#EF4444] text-white' : 'text-[#8E9299] hover:text-white'
                      }`}
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Custom Salt</span>
                    </button>
                  </div>
                </div>

                {saltMode === 'custom' && (
                  <div className="space-y-2 pt-1 bg-[#121622] p-2.5 rounded-sm border border-[#1E2536]">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#A0AEC0]">Format Mode:</span>
                      <div className="flex gap-3 text-[10px]">
                        <label className="flex items-center gap-1 cursor-pointer text-[#E2E8F0]">
                          <input
                            type="radio"
                            name="customSaltType"
                            checked={customSaltType === 'text'}
                            onChange={() => setCustomSaltType('text')}
                            className="accent-[#EF4444]"
                          />
                          <span>Text Passphrase</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer text-[#E2E8F0]">
                          <input
                            type="radio"
                            name="customSaltType"
                            checked={customSaltType === 'hex'}
                            onChange={() => setCustomSaltType('hex')}
                            className="accent-[#EF4444]"
                          />
                          <span>Hexadecimal</span>
                        </label>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={customSaltValue}
                      onChange={(e) => setCustomSaltValue(e.target.value)}
                      placeholder={customSaltType === 'hex' ? 'e.g. 736f6d6573616c7431323334' : 'e.g. custom_defense_salt_passphrase'}
                      className="w-full bg-[#090C12] border border-[#1E2536] focus:border-[#EF4444] rounded-sm px-2.5 py-1.5 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Memory Hardness Presets */}
              <div className="bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-white uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Security Strength Preset (Argon2 Memory Protection)</span>
                  </span>
                  <span className="text-[#FACC15] text-[10px] font-bold font-mono">
                    {Math.round(memoryCostKiB / 1024)} MB RAM
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {/* Preset 1: 16 MB */}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setMemoryCostKiB(16384);
                      setIterations(2);
                    }}
                    className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                      memoryCostKiB === 16384
                        ? 'border-[#FACC15] bg-[#FACC15]/20 text-white shadow-[0_0_14px_rgba(250,204,21,0.35)]'
                        : 'border-[#1E2536] bg-[#121622] text-[#8E9299] hover:border-[#FACC15]/40 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-[#FACC15] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#FACC15] inline-block" />
                      <span>Standard</span>
                    </div>
                    <div className="text-[9px] text-[#FEF08A] font-medium mt-0.5">16 MB RAM</div>
                    <div className="text-[8px] text-[#8E9299] font-mono">2 iterations</div>
                  </button>

                  {/* Preset 2: 64 MB */}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setMemoryCostKiB(65536);
                      setIterations(3);
                    }}
                    className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                      memoryCostKiB === 65536
                        ? 'border-[#F97316] bg-[#F97316]/20 text-white shadow-[0_0_14px_rgba(249,115,22,0.35)]'
                        : 'border-[#1E2536] bg-[#121622] text-[#8E9299] hover:border-[#F97316]/40 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-[#F97316] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#F97316] inline-block" />
                      <span>Military Grade</span>
                    </div>
                    <div className="text-[9px] text-[#FED7AA] font-medium mt-0.5">64 MB RAM</div>
                    <div className="text-[8px] text-[#8E9299] font-mono">3 iterations</div>
                  </button>

                  {/* Preset 3: 128 MB */}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setMemoryCostKiB(131072);
                      setIterations(4);
                    }}
                    className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                      memoryCostKiB === 131072
                        ? 'border-[#DC2626] bg-gradient-to-br from-[#991B1B]/40 to-[#881337]/40 text-white shadow-[0_0_14px_rgba(220,38,38,0.4)]'
                        : 'border-[#1E2536] bg-[#121622] text-[#8E9299] hover:border-[#DC2626]/40 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-[#F87171] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626] inline-block" />
                      <span>Cyber Fortress</span>
                    </div>
                    <div className="text-[9px] text-[#FECACA] font-medium mt-0.5">128 MB RAM</div>
                    <div className="text-[8px] text-[#8E9299] font-mono">4 iterations</div>
                  </button>
                </div>
              </div>

              {/* Encrypt Action Button (Red) */}
              <button
                id="btn-execute-encrypt-sf"
                type="button"
                onClick={handleRunEncryption}
                disabled={isEncrypting || encryptFiles.length === 0 || !encryptPassword}
                className="w-full py-3 px-4 rounded-sm bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.45)] disabled:opacity-40 disabled:hover:bg-[#EF4444] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed border border-[#EF4444]/60"
              >
                {isEncrypting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>SECURING &amp; PACKING INTO .CF SAFE BOX...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {encryptFiles.length > 1
                        ? `LOCK ${encryptFiles.length} FILES INTO VAULT (.CF)`
                        : `LOCK FILE INTO SAFE BOX (.CF)`}
                    </span>
                  </>
                )}
              </button>

              {/* Error Box */}
              {encryptError && (
                <div className="p-3 bg-[#090C12] border border-rose-500 rounded-sm text-xs text-rose-300 flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{encryptError}</span>
                </div>
              )}

              {/* Progress Tracker */}
              {encryptProgress && isEncrypting && (
                <div className="bg-[#090C12] border border-[#1E2536] p-3 rounded-sm space-y-2">
                  <div className="flex justify-between text-[10px] text-[#A0AEC0] uppercase">
                    <span>{encryptProgress.message}</span>
                    <span className="text-[#00F0FF] font-bold">{encryptProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-[#121622] h-2 rounded-sm overflow-hidden">
                    <div
                      className="bg-[#00F0FF] h-full transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                      style={{ width: `${encryptProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Encrypted Output Safe Box (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#090C12] border border-[#1E2536] rounded-sm p-4 sm:p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#1E2536] pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#00F0FF]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Encrypted Safe Box Output
                    </h3>
                  </div>
                  {encryptResult && (
                    <span className="px-2 py-0.5 rounded-sm text-[9px] bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 uppercase font-bold">
                      AUTHENTICATED &amp; READY
                    </span>
                  )}
                </div>

                {encryptResult ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Status Badge */}
                    <div className="p-3 bg-[#121622] border border-[#00F0FF] rounded-sm flex items-center gap-2.5 text-[#00F0FF] font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                      <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
                      <span>Encrypted Safe Box Created Successfully!</span>
                    </div>

                    {/* Metadata Summary */}
                    <div className="bg-[#121622] p-3 rounded-sm border border-[#1E2536] space-y-2.5">
                      <div className="flex items-center justify-between text-white font-bold text-xs pb-1.5 border-b border-[#1E2536]">
                        <span className="truncate text-[#00FF66]">{encryptResult.encryptedFileName}</span>
                        <span className="text-[10px] text-[#8E9299]">.CF SAFE BOX</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[#8E9299] block uppercase">Original Content</span>
                          <span className="font-bold text-white truncate block">{encryptResult.originalFileName}</span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">Protected Size</span>
                          <span className="font-bold text-white">{formatBytes(encryptResult.encryptedSize)}</span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">Security Standard</span>
                          <span className="font-bold text-[#00F0FF]">AES-256-GCM (NIST)</span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">Key Protection</span>
                          <span className="font-bold text-[#00FF66]">RFC 9106 Argon2id</span>
                        </div>
                      </div>
                    </div>

                    {/* Security Verification Card */}
                    <div className="p-3 bg-[#121622] border border-[#00FF66]/30 rounded-sm space-y-1.5 text-[10px] text-[#A0AEC0]">
                      <div className="flex items-center gap-1.5 text-[#00FF66] font-bold uppercase">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Security Guarantees Active:</span>
                      </div>
                      <div className="space-y-1">
                        <div>• 256-bit Galois/Counter Mode authenticated encryption</div>
                        <div>• 128-bit cryptographic tamper-detection tag embedded</div>
                        <div>• Original file name, extension, and MIME type fully shielded</div>
                      </div>
                    </div>

                    {/* Action Download & Test */}
                    <div className="space-y-2 pt-2">
                      <a
                        id="btn-download-encrypted-sf"
                        href={URL.createObjectURL(encryptResult.encryptedBlob)}
                        download={encryptResult.encryptedFileName}
                        onClick={() => playCyberBeep('click')}
                        className="w-full py-3 px-3 rounded-sm bg-[#00F0FF] hover:bg-[#33F3FF] text-[#090C12] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] text-center cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>DOWNLOAD SAFE BOX ({encryptResult.encryptedFileName})</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleSendToDecryptor}
                        className="w-full py-2 px-3 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#00FF66] border border-[#00FF66]/40 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Send to Decryptor Tab for Quick Test</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-[#8E9299] space-y-2.5">
                    <Lock className="w-10 h-10 mx-auto text-[#1E2536]" />
                    <p className="text-xs text-white font-bold uppercase">No Encrypted File Yet</p>
                    <p className="text-[10px] text-[#8E9299] max-w-xs mx-auto">
                      Choose any file(s) and set your secret master password. CipherFlow will build an authenticated zero-leak .cf safe box or vault package.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODE 2: UNLOCK FILE (DECRYPT .CF SAFE BOX) */}
      {/* ================================================================ */}
      {activeMode === 'decrypt' && (
        <div className="space-y-6 animate-fade-in">
          {/* Guide Banner */}
          <div className="bg-[#121622]/80 border border-[#00FF66]/30 p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#00FF66] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white uppercase text-[11px] block">
                  Safe Ephemeral Live Viewing &amp; Vault Inspection:
                </span>
                <p className="text-[#A0AEC0] text-[11px]">
                  Choose <strong className="text-[#00F0FF]">Live View in RAM</strong> to view single files or <strong>multi-format vaults (MP3+PNG, MP3+MP4, Photo Galleries, etc.)</strong> directly in memory without leaving unencrypted copies on your computer hard drive!
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#090C12] border border-[#1E2536] text-[10px] text-[#00F0FF] font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ZERO-DISK EXPOSURE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Decrypt Upload & Password Form (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Dropzone for .cf file */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#00FF66]" />
                    <span>Upload Encrypted Safe Box or Vault (.cf)</span>
                  </span>
                  {decryptFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#00FF66] text-[10px] font-bold">
                        {decryptFile.name} ({formatBytes(decryptFile.size)})
                      </span>
                      <button
                        type="button"
                        onClick={handleClearDecryptFile}
                        title="Remove selected .cf file"
                        className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00FF66]/15 hover:bg-[#00FF66]/30 text-[#00FF66] border border-[#00FF66]/40 hover:border-[#00FF66] flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Clear File</span>
                      </button>
                    </div>
                  )}
                </label>

                <div
                  id="dropzone-decrypt-file"
                  onClick={() => decryptFileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleDecryptFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-all ${
                    decryptFile
                      ? 'border-[#00FF66] bg-[#090C12]/90 shadow-[0_0_20px_rgba(0,255,102,0.15)]'
                      : 'border-[#1E2536] hover:border-[#00FF66]/80 bg-[#090C12]/50 hover:bg-[#090C12] hover:shadow-[0_0_20px_rgba(0,255,102,0.1)]'
                  }`}
                >
                  <input
                    ref={decryptFileInputRef}
                    type="file"
                    accept=".cf,application/octet-stream"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleDecryptFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {decryptFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2.5 rounded-sm bg-[#121622] border border-[#00FF66] text-[#00FF66]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-white text-xs">{decryptFile.name}</div>
                      <div className="text-[10px] text-[#A0AEC0]">
                        Safe Box Size: <strong className="text-white">{formatBytes(decryptFile.size)}</strong>
                      </div>
                      <span className="text-[10px] text-[#8E9299] hover:text-[#00FF66] underline mt-1">
                        Click or drag a different .cf file to switch
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="p-3 rounded-sm bg-[#121622] border border-[#1E2536] text-[#00FF66]">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        Drag &amp; Drop or Click to Select Encrypted Safe Box (.cf)
                      </div>
                      <p className="text-[10px] text-[#8E9299] max-w-md">
                        Supports both single files and multi-format vault packages created by CipherFlow.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detected Container Header Parameters Info Box */}
              {headerInfo && headerInfo.isValid && (
                <div className="bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm space-y-2">
                  <div className="flex items-center justify-between text-[10px] border-b border-[#1E2536] pb-1.5">
                    <span className="text-[#00FF66] font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Valid CipherFlow Container Seal Verified</span>
                    </span>
                    <span className="text-[#8E9299]">v{headerInfo.version}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div className="bg-[#121622] p-1.5 rounded-xs border border-[#1E2536]">
                      <span className="text-[#8E9299] block">Algorithm</span>
                      <span className="font-bold text-white">{headerInfo.variant}</span>
                    </div>
                    <div className="bg-[#121622] p-1.5 rounded-xs border border-[#1E2536]">
                      <span className="text-[#8E9299] block">Memory</span>
                      <span className="font-bold text-white">{Math.round(headerInfo.memorySizeKiB / 1024)} MB</span>
                    </div>
                    <div className="bg-[#121622] p-1.5 rounded-xs border border-[#1E2536]">
                      <span className="text-[#8E9299] block">Iterations</span>
                      <span className="font-bold text-white">{headerInfo.iterations}</span>
                    </div>
                    <div className="bg-[#121622] p-1.5 rounded-xs border border-[#1E2536]">
                      <span className="text-[#8E9299] block">Parallelism</span>
                      <span className="font-bold text-white">{headerInfo.parallelism} threads</span>
                    </div>
                  </div>

                  {/* Encrypted Privacy Protected Notification */}
                  <div className="p-2.5 bg-[#121622] border border-amber-500/30 rounded-sm flex items-center gap-2 text-[10px] text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      Original filenames, formats, and vault contents are fully encrypted and will be decrypted into RAM once unlocked.
                    </span>
                  </div>
                </div>
              )}

              {/* Pre-Decryption Output Filename Customization */}
              <div className="bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-white uppercase tracking-wider">
                  <label htmlFor="input-custom-output-filename" className="flex items-center gap-1.5 text-[#00F0FF]">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Decrypted File / Vault Output Name (Optional Rename)</span>
                  </label>
                  {userCustomOutputName && (
                    <button
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setUserCustomOutputName('');
                      }}
                      className="text-[9px] text-[#8E9299] hover:text-[#00FF66] uppercase font-bold cursor-pointer"
                    >
                      Reset to Auto-Restore
                    </button>
                  )}
                </div>

                <input
                  id="input-custom-output-filename"
                  type="text"
                  value={userCustomOutputName}
                  onChange={(e) => setUserCustomOutputName(e.target.value)}
                  placeholder="Leave empty to auto-restore original name(s) or type custom name..."
                  className="w-full bg-[#121622] border border-[#1E2536] focus:border-[#00F0FF] rounded-sm px-3 py-2 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                />
              </div>

              {/* Decryption Password Input */}
              <div className="space-y-1.5 bg-[#090C12] border border-[#1E2536] p-3.5 rounded-sm">
                <label
                  htmlFor="input-decrypt-password"
                  className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5 text-[#00FF66]" />
                  <span>Enter Secret Master Password</span>
                </label>
                <div className="relative">
                  <input
                    id="input-decrypt-password"
                    type={showDecryptPassword ? 'text' : 'password'}
                    value={decryptPassword}
                    onChange={(e) => setDecryptPassword(e.target.value)}
                    placeholder="Enter passphrase used when locking the file..."
                    className="w-full bg-[#121622] border border-[#1E2536] focus:border-[#00FF66] rounded-sm px-3 py-2 pr-10 text-xs text-white placeholder-[#60677A] outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setShowDecryptPassword(!showDecryptPassword);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white cursor-pointer"
                  >
                    {showDecryptPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Auto Open Live Viewer Checkbox Toggle */}
              <div className="bg-[#121622] border border-[#1E2536] p-2.5 rounded-sm flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-white">
                  <input
                    type="checkbox"
                    checked={autoOpenLiveViewer}
                    onChange={(e) => setAutoOpenLiveViewer(e.target.checked)}
                    className="accent-[#00F0FF] rounded-xs"
                  />
                  <span className="font-bold flex items-center gap-1 text-[#00F0FF]">
                    <Eye className="w-3 h-3" />
                    Auto-Launch Ephemeral Live RAM Viewer / Vault Model upon unlocking
                  </span>
                </label>
                <span className="text-[9px] text-[#00FF66] font-bold uppercase hidden sm:inline">
                  RECOMMENDED
                </span>
              </div>

              {/* Decrypt Actions: Dual Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Primary Choice: Live View in RAM */}
                <button
                  id="btn-execute-live-view-sf"
                  type="button"
                  onClick={() => handleRunDecryption(true)}
                  disabled={isDecrypting || !decryptFile || !decryptPassword}
                  className="py-3 px-4 rounded-sm bg-[#00F0FF] hover:bg-[#33F3FF] text-[#090C12] font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:hover:bg-[#00F0FF] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed text-center"
                >
                  {isDecrypting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#090C12]" />
                      <span>UNLOCKING IN RAM...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>LIVE VIEW IN RAM (SAFE)</span>
                    </>
                  )}
                </button>

                {/* 2. Standard Decrypt */}
                <button
                  id="btn-execute-decrypt-sf"
                  type="button"
                  onClick={() => handleRunDecryption(false)}
                  disabled={isDecrypting || !decryptFile || !decryptPassword}
                  className="py-3 px-4 rounded-sm bg-[#00FF66] hover:bg-[#39FF14] text-[#090C12] font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,102,0.35)] disabled:opacity-40 disabled:hover:bg-[#00FF66] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed text-center"
                >
                  <Unlock className="w-4 h-4" />
                  <span>AUTHENTICATE &amp; UNLOCK</span>
                </button>
              </div>

              {/* Error Box */}
              {decryptError && (
                <div className="p-3 bg-[#090C12] border border-rose-500 rounded-sm text-xs text-rose-300 flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{decryptError}</span>
                </div>
              )}

              {/* Progress Tracker */}
              {decryptProgress && isDecrypting && (
                <div className="bg-[#090C12] border border-[#1E2536] p-3 rounded-sm space-y-2">
                  <div className="flex justify-between text-[10px] text-[#A0AEC0] uppercase">
                    <span>{decryptProgress.message}</span>
                    <span className="text-[#00FF66] font-bold">{decryptProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-[#121622] h-2 rounded-sm overflow-hidden">
                    <div
                      className="bg-[#00FF66] h-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,102,0.8)]"
                      style={{ width: `${decryptProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Unlocked File / Vault Telemetry & Download (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#090C12] border border-[#1E2536] rounded-sm p-4 sm:p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#1E2536] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#00FF66]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Unlocked File Verification
                    </h3>
                  </div>
                  {decryptResult && (
                    <span className="px-2 py-0.5 rounded-sm text-[9px] bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 uppercase font-bold">
                      {decryptResult.isVault ? 'VAULT MODEL UNLOCKED' : 'VERIFIED & UNLOCKED'}
                    </span>
                  )}
                </div>

                {decryptResult ? (
                  <div className="space-y-3.5 text-xs">
                    {/* Status badge */}
                    <div className="p-3 bg-[#121622] border border-[#00FF66] rounded-sm flex items-center gap-2.5 text-[#00FF66] font-bold text-xs uppercase shadow-[0_0_15px_rgba(0,255,102,0.15)]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {decryptResult.isVault
                          ? `Vault Verified (${decryptResult.fileCount || decryptResult.files?.length || 0} Files Decrypted in RAM)`
                          : 'Tamper-Seal Verified & File Decrypted'}
                      </span>
                    </div>

                    {/* Recovered metadata summary */}
                    <div className="bg-[#121622] p-3 rounded-sm border border-[#1E2536] space-y-2.5">
                      <div className="flex items-center gap-2 text-white font-bold text-xs pb-1.5 border-b border-[#1E2536]">
                        {decryptResult.isVault ? <FolderArchive className="w-4 h-4 text-[#FF9933]" /> : getFileIcon(decryptResult.suggestedFileName)}
                        <span className="truncate text-[#00F0FF]">{decryptResult.suggestedFileName}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[#8E9299] block uppercase">Container Type</span>
                          <span className="font-bold text-white truncate block">
                            {decryptResult.isVault ? 'Multi-File Vault Container' : decryptResult.originalDetectedFileName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">File Count</span>
                          <span className="font-bold text-[#00FF66]">
                            {decryptResult.isVault ? `${decryptResult.files?.length || 0} files` : '1 file'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">Decrypted Size</span>
                          <span className="font-bold text-white">{formatBytes(decryptResult.originalSize)}</span>
                        </div>
                        <div>
                          <span className="text-[#8E9299] block uppercase">Memory Status</span>
                          <span className="font-bold text-[#00FF66]">Volatile Browser RAM</span>
                        </div>
                      </div>

                      {/* List of files in decrypted vault */}
                      {decryptResult.isVault && decryptResult.files && (
                        <div className="pt-2 border-t border-[#1E2536] space-y-1">
                          <span className="text-[10px] text-[#FF9933] font-bold block uppercase">
                            Files in Vault:
                          </span>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {decryptResult.files.map((vf, idx) => (
                              <div
                                key={idx}
                                className="px-2 py-1 rounded bg-[#090C12] border border-[#1E2536] flex items-center justify-between text-[10px]"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {getFileIcon(vf.fileName)}
                                  <span className="text-white truncate">{vf.fileName}</span>
                                </div>
                                <span className="text-slate-400 font-mono shrink-0">
                                  {formatBytes(vf.fileSize)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action: Open in Live RAM Player */}
                    <button
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setActiveMode('sandbox');
                      }}
                      className="w-full py-2.5 px-3 rounded-sm bg-[#00F0FF] hover:bg-[#33F3FF] text-[#090C12] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>OPEN IN EPHEMERAL LIVE VIEWER</span>
                    </button>

                    {/* Action: Share Decrypted Files to System Apps */}
                    <button
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setShowSystemShareModal(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-sm bg-[#121c2e] hover:bg-[#1a2942] text-[#38BDF8] border border-[#38BDF8]/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(56,189,248,0.2)] cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#38BDF8]" />
                      <span>SHARE TO SYSTEM DOWNLOADED APPS</span>
                    </button>

                    {/* Download Button */}
                    <div className="pt-1">
                      <a
                        id="btn-download-restored-sf-file"
                        href={URL.createObjectURL(decryptResult.decryptedBlob)}
                        download={decryptResult.suggestedFileName}
                        onClick={() => playCyberBeep('click')}
                        className="w-full py-2.5 px-3 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#00FF66] border border-[#00FF66]/50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all text-center"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Decrypted Copy to Disk</span>
                      </a>
                    </div>
                  </div>
                ) : activeVaultFiles && activeVaultFiles.length > 0 ? (
                  <div className="py-6 px-4 bg-[#0a0e1a] border border-[#38BDF8]/30 rounded text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-[#38BDF8]" />
                    <div>
                      <p className="text-xs text-white font-bold uppercase">Active Decrypted Vault in RAM</p>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        {activeVaultName || 'Vault'}: {activeVaultFiles.length} decrypted files ready
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 max-w-xs mx-auto pt-1 font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          playCyberBeep('click');
                          setShowSystemShareModal(true);
                        }}
                        className="w-full py-2 px-3 rounded bg-[#38BDF8] hover:bg-[#60cdff] text-[#090C12] font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share to System Apps</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playCyberBeep('click');
                          setActiveMode('sandbox');
                        }}
                        className="w-full py-2 px-3 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#00F0FF] border border-[#00F0FF]/40 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open in Live Viewer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-[#8E9299] space-y-2.5">
                    <FileQuestion className="w-10 h-10 mx-auto text-[#1E2536]" />
                    <p className="text-xs text-white font-bold uppercase">No Active Decryption Job</p>
                    <p className="text-[10px] text-[#8E9299] max-w-xs mx-auto">
                      Upload a CipherFlow (.cf) container and enter the secret master password to restore or live-view single files or multi-file vaults.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODE 3: LIVE RAM SANDBOX (SAFE IN-MEMORY VIEWING & PLAYBACK) */}
      {/* ================================================================ */}
      {activeMode === 'sandbox' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hidden File Input for Custom Uploads */}
          <input
            ref={sandboxFileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleSandboxFileSelect(e.target.files[0]);
              }
            }}
          />

          {activeLiveSandboxFile ? (
            <div className="space-y-4">
              <LiveSandboxViewer
                file={activeLiveSandboxFile}
                vaultFiles={activeVaultFiles.length > 0 ? activeVaultFiles : undefined}
                vaultName={activeVaultName}
                onClose={() => {
                  setActiveLiveSandboxFile(null);
                  setActiveVaultFiles([]);
                }}
                onChangeFile={() => sandboxFileInputRef.current?.click()}
                onQuickSwitchDemo={(type) => handleLaunchSampleDemo(type)}
                onDownload={() => {
                  if (decryptResult && activeLiveSandboxFile.source === 'decrypted') {
                    const url = URL.createObjectURL(decryptResult.decryptedBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = decryptResult.suggestedFileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } else {
                    const url = URL.createObjectURL(activeLiveSandboxFile.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = activeLiveSandboxFile.fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Guide Banner */}
              <div className="bg-[#121622]/80 border border-[#FF9933]/50 p-3.5 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_0_15px_rgba(255,153,51,0.15)]">
                <div className="flex items-start gap-2.5">
                  <Eye className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white uppercase text-[11px] block">
                      Zero-Disk In-Memory Media, Vault &amp; Presentation Sandbox:
                    </span>
                    <p className="text-[#A0AEC0] text-[11px]">
                      Inspect PowerPoint decks (.pptx), PDFs, Word docs (.docx), Excel spreadsheets (.xlsx), multi-image photo galleries, videos, audio tracks, and multi-file vaults entirely in RAM without exposing files to your hard drive or browser cache.
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-[#090C12] border border-[#FF9933]/50 text-[10px] text-[#FF9933] font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>LIVE RAM CODECS &amp; VAULT MODEL</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Drag & Drop Sandbox Input */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UploadCloud className="w-3.5 h-3.5 text-[#FF9933]" />
                        <span>Upload Any File for In-Memory Live Safe Viewing</span>
                      </span>
                    </label>

                    <div
                      id="dropzone-sandbox-file"
                      onClick={() => sandboxFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleSandboxFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-[#1E2536] hover:border-[#FF9933]/80 bg-[#090C12]/70 hover:bg-[#090C12] rounded-sm p-8 text-center cursor-pointer transition-all hover:shadow-[0_0_25px_rgba(255,153,51,0.2)]"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3.5 rounded-sm bg-[#121622] border border-[#FF9933]/40 text-[#FF9933] shadow-[0_0_12px_rgba(255,153,51,0.2)]">
                          <Eye className="w-8 h-8" />
                        </div>
                        <div className="text-xs font-bold text-white uppercase tracking-wider">
                          Drag &amp; Drop Any File to Launch Ephemeral Player
                        </div>
                        <p className="text-[10px] text-[#8E9299] max-w-md">
                          Instantly opens dedicated PowerPoint slide deck reader, PDF document viewer, Word document viewer, Excel grid, video player, audio visualizer, photo gallery, or archive explorer.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Supported Format Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-[#090C12] border border-[#1E2536] rounded-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-[#FF9933] text-[10px] font-bold uppercase">
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Vault Models</span>
                      </div>
                      <p className="text-[9px] text-[#8E9299]">Multi-format combos: MP3+PNG, MP3+MP4 in one .cf</p>
                    </div>

                    <div className="p-3 bg-[#090C12] border border-[#1E2536] rounded-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase">
                        <Grid className="w-3.5 h-3.5" />
                        <span>RAM Photo Gallery</span>
                      </div>
                      <p className="text-[9px] text-[#8E9299]">Pinch zoom, rotate, slideshow &amp; filmstrip</p>
                    </div>

                    <div className="p-3 bg-[#090C12] border border-[#1E2536] rounded-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-[#00F0FF] text-[10px] font-bold uppercase">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>PDF &amp; Presentation</span>
                      </div>
                      <p className="text-[9px] text-[#8E9299]">Adaptive device dimensions &amp; 16:9 slides</p>
                    </div>

                    <div className="p-3 bg-[#090C12] border border-[#1E2536] rounded-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-[#00FF66] text-[10px] font-bold uppercase">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Office &amp; Media</span>
                      </div>
                      <p className="text-[9px] text-[#8E9299]">DOCX, XLSX, MP4, MP3 with 5-hr auto-purge</p>
                    </div>
                  </div>
                </div>

                {/* Right: Instant Test Demos & Multi-Format Vaults */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#090C12] border border-[#1E2536] rounded-sm p-4 sm:p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#1E2536] pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#FF9933]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                          Multi-Format Vault Demos
                        </h3>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#A0AEC0]">
                      Test multi-file vault containers and dedicated in-memory viewers with 1-click:
                    </p>

                    <div className="space-y-2">
                      {/* Combo 1: MP3 & PNG Vault */}
                      <button
                        type="button"
                        onClick={() => handleLaunchSampleDemo('vault_mp3_png')}
                        className="w-full p-2.5 bg-[#121622] hover:bg-[#1E2536] border border-[#FF9933]/40 hover:border-[#FF9933] rounded-sm flex items-center justify-between text-xs text-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderArchive className="w-4 h-4 text-[#FF9933]" />
                          <div className="text-left">
                            <span className="font-bold block text-white text-[11px]">MP3 &amp; PNG Vault Model</span>
                            <span className="text-[9px] text-[#8E9299]">Dual Audio Briefing + Classified Emblem</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#FF9933] font-bold group-hover:translate-x-0.5 transition-transform">
                          OPEN VAULT →
                        </span>
                      </button>

                      {/* Combo 2: MP3 & MP4 Telemetry Vault */}
                      <button
                        type="button"
                        onClick={() => handleLaunchSampleDemo('vault_mp3_mp4')}
                        className="w-full p-2.5 bg-[#121622] hover:bg-[#1E2536] border border-[#FF9933]/40 hover:border-[#FF9933] rounded-sm flex items-center justify-between text-xs text-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderArchive className="w-4 h-4 text-[#FF9933]" />
                          <div className="text-left">
                            <span className="font-bold block text-white text-[11px]">Audio, Image &amp; PDF Vault</span>
                            <span className="text-[9px] text-[#8E9299]">Audio Track, Radar Image &amp; PDF Dossier</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#FF9933] font-bold group-hover:translate-x-0.5 transition-transform">
                          OPEN VAULT →
                        </span>
                      </button>

                      {/* Combo 3: 4-Photo Gallery Viewer */}
                      <button
                        type="button"
                        onClick={() => handleLaunchSampleDemo('vault_gallery')}
                        className="w-full p-2.5 bg-[#121622] hover:bg-[#1E2536] border border-amber-500/40 hover:border-amber-400 rounded-sm flex items-center justify-between text-xs text-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Grid className="w-4 h-4 text-amber-400" />
                          <div className="text-left">
                            <span className="font-bold block text-white text-[11px]">RAM Photo Gallery (4 Images)</span>
                            <span className="text-[9px] text-[#8E9299]">Pinch Zoom, Slideshow &amp; Grid Inspection</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                          VIEW GALLERY →
                        </span>
                      </button>

                      {/* Combo 4: Full Enterprise Vault Package */}
                      <button
                        type="button"
                        onClick={() => handleLaunchSampleDemo('vault_full')}
                        className="w-full p-2.5 bg-[#121622] hover:bg-[#1E2536] border border-[#00FF66]/40 hover:border-[#00FF66] rounded-sm flex items-center justify-between text-xs text-white transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderArchive className="w-4 h-4 text-[#00FF66]" />
                          <div className="text-left">
                            <span className="font-bold block text-white text-[11px]">Full Enterprise Vault (6 Files)</span>
                            <span className="text-[9px] text-[#8E9299]">PPTX, PDF, DOCX, XLSX, MP3, PNG</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#00FF66] font-bold group-hover:translate-x-0.5 transition-transform">
                          ENTERPRISE →
                        </span>
                      </button>

                      {/* Standard Format Launchers */}
                      <div className="pt-2 border-t border-[#1E2536] grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleLaunchSampleDemo('pptx')}
                          className="p-1.5 rounded bg-[#121622] hover:bg-[#1E2536] border border-[#1E2536] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer truncate"
                        >
                          <Presentation className="w-3 h-3 text-amber-400" />
                          <span>PPTX Deck</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchSampleDemo('pdf')}
                          className="p-1.5 rounded bg-[#121622] hover:bg-[#1E2536] border border-[#1E2536] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer truncate"
                        >
                          <BookOpen className="w-3 h-3 text-cyan-400" />
                          <span>PDF Reader</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchSampleDemo('audio')}
                          className="p-1.5 rounded bg-[#121622] hover:bg-[#1E2536] border border-[#1E2536] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer truncate"
                        >
                          <Music className="w-3 h-3 text-rose-400" />
                          <span>Audio Track</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchSampleDemo('docx')}
                          className="p-1.5 rounded bg-[#121622] hover:bg-[#1E2536] border border-[#1E2536] text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer truncate"
                        >
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span>Word DOCX</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODE 4: CIPHER LIBRARY (LOCAL DB) */}
      {/* ================================================================ */}
      {activeMode === 'library' && (
        <div className="space-y-6 animate-fade-in">
          {/* Guide Banner */}
          <div className="bg-[#121622]/80 border border-[#38BDF8]/40 p-3 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_0_15px_rgba(56,189,248,0.1)]">
            <div className="flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white uppercase text-[11px] block">
                  Local CipherFiles Library:
                </span>
                <p className="text-[#A0AEC0] text-[11px]">
                  Browse and manage your encrypted <code className="text-[#38BDF8] font-bold">.cf</code> files stored locally in this browser's secured storage. Files here remain encrypted until unlocked with the correct password.
                </p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded bg-[#090C12] border border-[#38BDF8]/40 text-[10px] text-[#38BDF8] font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>OFFLINE STORAGE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {libraryFiles.length === 0 ? (
              <div className="col-span-full py-16 text-center text-[#8E9299] space-y-3 bg-[#090C12]/50 border border-[#1E2536] rounded-sm">
                <HardDrive className="w-10 h-10 mx-auto text-[#1E2536]" />
                <p className="text-xs text-white font-bold uppercase">Library is Empty</p>
                <p className="text-[10px] text-[#8E9299] max-w-sm mx-auto">
                  Any new .cf files you encrypt will automatically appear here.
                </p>
              </div>
            ) : (
              libraryFiles.map((record) => (
                <div key={record.id} className="p-4 bg-[#090C12] border border-[#1E2536] rounded-sm flex items-center justify-between group hover:border-[#38BDF8]/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-[#121622] flex items-center justify-center shrink-0 border border-[#1E2536] group-hover:border-[#38BDF8]/30">
                      <Lock className="w-5 h-5 text-[#38BDF8]" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white block text-sm truncate">{record.id}</span>
                      <div className="flex items-center gap-2 text-[10px] text-[#8E9299] mt-0.5">
                        <span>{formatBytes(record.size)}</span>
                        <span>•</span>
                        <span>{new Date(record.dateAdded).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        playCyberBeep('click');
                        handleDecryptFileSelect(record.file);
                        setActiveMode('decrypt');
                      }}
                      className="px-3 py-1.5 bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 hover:border-[#38BDF8] rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Unlock</span>
                    </button>
                    <button
                      onClick={async () => {
                        playCyberBeep('alert');
                        await deleteCipherFile(record.id);
                        loadLibraryFiles();
                      }}
                      className="p-1.5 bg-[#121622] hover:bg-[#EF4444]/20 text-[#8E9299] hover:text-[#EF4444] border border-[#1E2536] hover:border-[#EF4444]/50 rounded transition-colors cursor-pointer"
                      title="Delete from Library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* System App Share Modal */}
      <SystemAppShareModal
        isOpen={showSystemShareModal}
        onClose={() => setShowSystemShareModal(false)}
        files={
          activeVaultFiles.length > 0
            ? activeVaultFiles.map((f) => ({
                blob: f.blob,
                fileName: f.fileName,
                fileSize: f.fileSize,
                mimeType: f.mimeType,
              }))
            : decryptResult?.files && decryptResult.files.length > 0
            ? decryptResult.files.map((f) => ({
                blob: f.blob,
                fileName: f.fileName,
                fileSize: f.fileSize,
                mimeType: f.mimeType,
              }))
            : decryptResult
            ? [
                {
                  blob: decryptResult.decryptedBlob,
                  fileName: decryptResult.suggestedFileName,
                  fileSize: decryptResult.originalSize,
                  mimeType: decryptResult.mimeType,
                },
              ]
            : []
        }
        vaultName={activeVaultName || decryptResult?.suggestedFileName?.replace(/\.[^/.]+$/, '') || 'cipherflow_vault'}
      />
    </div>
  );
}
