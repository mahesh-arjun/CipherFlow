import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Download,
  Info,
  Layers,
  Sparkles,
  Sliders,
  Tv,
  Check,
  Grid,
  Grid3X3,
  Film,
  Eye,
  Search,
  ArrowUpDown,
  X,
  FileSpreadsheet,
  CheckCircle2,
  LayoutGrid,
  Share2,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import JSZip from 'jszip';
import { playCyberBeep } from '../../lib/cyberAudio';
import { encryptVaultCipherFlow } from '../../lib/fileCrypto';
import { generateSampleImageGalleryVault } from '../../lib/sampleDemoFiles';
import { SystemAppShareModal } from '../SystemAppShareModal';

export interface GalleryImageItem {
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType?: string;
}

interface ImageGalleryLiveViewerProps {
  images?: GalleryImageItem[];
  initialIndex?: number;
  isDedicatedWindow?: boolean;
  onToggleDedicatedWindow?: () => void;
}

export const ImageGalleryLiveViewer: React.FC<ImageGalleryLiveViewerProps> = ({
  images,
  initialIndex = 0,
  isDedicatedWindow = false,
  onToggleDedicatedWindow,
}) => {
  // Ensure default of 4 images in a grid if none provided
  const resolvedImages = useMemo<GalleryImageItem[]>(() => {
    if (images && images.length > 0) {
      return images;
    }
    const sampleItems = generateSampleImageGalleryVault();
    return sampleItems.map((it) => ({
      blob: it.blob,
      fileName: it.fileName,
      fileSize: it.fileSize,
      mimeType: it.mimeType,
    }));
  }, [images]);

  const [currentIndex, setCurrentIndex] = useState<number>(
    Math.min(Math.max(0, initialIndex), Math.max(0, resolvedImages.length - 1))
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [colorFilter, setColorFilter] = useState<'normal' | 'invert' | 'high_contrast' | 'sepia' | 'monochrome' | 'cyber_glow'>('normal');
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(false);
  const [slideshowSpeedSec, setSlideshowSpeedSec] = useState<number>(3);
  // Default to 4 images in a grid and grid viewing format as default for gallery
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('grid');
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4 | 6>(4);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'index' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc'>('index');
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  
  // Save as .cf Particulars Modal State (replacing send as .cf)
  const [showSaveParticularsModal, setShowSaveParticularsModal] = useState<boolean>(false);
  const [showSystemShareModal, setShowSystemShareModal] = useState<boolean>(false);
  const [savePassword, setSavePassword] = useState<string>('');
  const [isSavingParticulars, setIsSavingParticulars] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Cache blob object URLs for fast zero-disk preview
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const activeImgRef = useRef<HTMLImageElement | null>(null);
  const touchStartDistRef = useRef<number | null>(null);
  const initialTouchZoomRef = useRef<number>(1);

  // Generate object URLs for all gallery images
  useEffect(() => {
    const urls = resolvedImages.map((img) => URL.createObjectURL(img.blob));
    setObjectUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [resolvedImages]);

  // Reset zoom, rotation & flip when changing active image
  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setIsFlippedH(false);
    setImageDimensions(null);
  }, [currentIndex]);

  // Filtered & Sorted Images for Grid View
  const processedImages = useMemo(() => {
    let list = resolvedImages.map((img, originalIndex) => ({
      ...img,
      originalIndex,
      url: objectUrls[originalIndex] || '',
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((it) => it.fileName.toLowerCase().includes(q));
    }

    if (sortBy === 'name-asc') {
      list.sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else if (sortBy === 'name-desc') {
      list.sort((a, b) => b.fileName.localeCompare(a.fileName));
    } else if (sortBy === 'size-asc') {
      list.sort((a, b) => a.fileSize - b.fileSize);
    } else if (sortBy === 'size-desc') {
      list.sort((a, b) => b.fileSize - a.fileSize);
    }

    return list;
  }, [resolvedImages, objectUrls, searchQuery, sortBy]);

  // Slideshow auto-advance
  useEffect(() => {
    if (!isSlideshowPlaying || resolvedImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % resolvedImages.length);
    }, slideshowSpeedSec * 1000);

    return () => clearInterval(timer);
  }, [isSlideshowPlaying, slideshowSpeedSec, resolvedImages.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsSlideshowPlaying((prev) => !prev);
      } else if (e.key === 'KeyR') {
        e.preventDefault();
        handleRotateCw();
      } else if (e.key === 'KeyG') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'single' ? 'grid' : 'single'));
      } else if (e.key === 'KeyI') {
        e.preventDefault();
        setShowInfoPanel((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolvedImages.length]);

  const handleNext = () => {
    playCyberBeep('click');
    setCurrentIndex((prev) => (prev + 1) % resolvedImages.length);
  };

  const handlePrev = () => {
    playCyberBeep('click');
    setCurrentIndex((prev) => (prev - 1 + resolvedImages.length) % resolvedImages.length);
  };

  const handleRotateCw = () => {
    playCyberBeep('click');
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    playCyberBeep('click');
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleFlipH = () => {
    playCyberBeep('click');
    setIsFlippedH((prev) => !prev);
  };

  const handleZoomIn = () => {
    playCyberBeep('click');
    setZoomLevel((prev) => Math.min(prev + 0.25, 5.0));
  };

  const handleZoomOut = () => {
    playCyberBeep('click');
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.2));
  };

  const handleResetView = () => {
    playCyberBeep('click');
    setZoomLevel(1);
    setRotation(0);
    setIsFlippedH(false);
  };

  // Touch pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
      initialTouchZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const scale = currentDist / touchStartDistRef.current;
      const newZoom = Math.min(Math.max(initialTouchZoomRef.current * scale, 0.25), 5.0);
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Format file size helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentImage = resolvedImages[currentIndex];
  const currentUrl = objectUrls[currentIndex];

  const handleDownloadActive = () => {
    if (!currentImage || !currentUrl) return;
    playCyberBeep('success');
    const a = document.createElement('a');
    a.href = currentUrl;
    a.download = currentImage.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSelected = () => {
    if (selectedIndices.length === 0) return;
    playCyberBeep('success');
    selectedIndices.forEach((idx) => {
      const img = resolvedImages[idx];
      const url = objectUrls[idx];
      if (img && url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = img.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  };

  const triggerFileDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  // Open the "Save as .cf Particulars" confirmation modal
  const handleOpenSaveParticularsModal = () => {
    playCyberBeep('click');
    setSavePassword('');
    setSaveError(null);
    // If no images are explicitly checked, default to selecting all in grid or active in single
    if (selectedIndices.length === 0) {
      if (viewMode === 'single') {
        setSelectedIndices([currentIndex]);
      } else {
        setSelectedIndices(resolvedImages.map((_, i) => i));
      }
    }
    setShowSaveParticularsModal(true);
  };

  // Save as .cf particulars with newly selected images upon confirming vault password
  const executeSaveAsCfParticulars = async () => {
    const targetIndices = selectedIndices.length > 0 ? selectedIndices : resolvedImages.map((_, i) => i);
    if (targetIndices.length === 0) {
      setSaveError('Please select at least one image to save as .cf particulars.');
      playCyberBeep('alert');
      return;
    }

    if (!savePassword.trim()) {
      setSaveError('Please verify vault password to save as .cf particulars.');
      playCyberBeep('alert');
      return;
    }

    setIsSavingParticulars(true);
    setSaveError(null);
    playCyberBeep('generate');

    try {
      const filesToSave = targetIndices.map((idx) => {
        const img = resolvedImages[idx];
        return new File([img.blob], img.fileName, {
          type: img.blob.type || img.mimeType || 'image/png',
        });
      });

      // Construct in-memory payload for cryptographic vault container
      const vaultItems = await Promise.all(
        filesToSave.map(async (f) => {
          const data = await f.arrayBuffer();
          return {
            fileName: f.name,
            data,
            mimeType: f.type || 'application/octet-stream',
          };
        })
      );

      const vaultName = `cipherflow_particulars_${Date.now()}`;
      const result = await encryptVaultCipherFlow(
        vaultItems,
        vaultName,
        savePassword,
        { variant: 'argon2id', memorySizeKiB: 65536, iterations: 3, parallelism: 2 },
        () => {}
      );

      // Directly save the .cf file / vault with newly selected images to disk
      triggerFileDownload(result.encryptedBlob, result.encryptedFileName);
      playCyberBeep('success');
      showToast(`Saved as .cf particulars: ${result.encryptedFileName}`, 'success');

      setShowSaveParticularsModal(false);
      setSavePassword('');
    } catch (err: any) {
      setSaveError(err?.message || 'Error encrypting and saving .cf particulars.');
      playCyberBeep('alert');
    } finally {
      setIsSavingParticulars(false);
    }
  };

  // Optional export of decrypted images bundle
  const executeExportDecryptedZip = async () => {
    const targetIndices = selectedIndices.length > 0 ? selectedIndices : resolvedImages.map((_, i) => i);
    if (targetIndices.length === 0) return;

    setIsSavingParticulars(true);
    setSaveError(null);
    playCyberBeep('generate');

    try {
      const filesToExport = targetIndices.map((idx) => {
        const img = resolvedImages[idx];
        return new File([img.blob], img.fileName, {
          type: img.blob.type || img.mimeType || 'image/png',
        });
      });

      if (filesToExport.length === 1) {
        triggerFileDownload(filesToExport[0], filesToExport[0].name);
      } else {
        const zip = new JSZip();
        filesToExport.forEach((f) => {
          zip.file(f.name, f);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerFileDownload(zipBlob, `cipherflow_images_${Date.now()}.zip`);
      }
      playCyberBeep('success');
      showToast(`Exported ${filesToExport.length} decrypted image(s).`, 'success');
      setShowSaveParticularsModal(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Error exporting decrypted images.');
      playCyberBeep('alert');
    } finally {
      setIsSavingParticulars(false);
    }
  };

  const toggleSelectImage = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    playCyberBeep('click');
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const selectAll = () => {
    playCyberBeep('click');
    if (selectedIndices.length === resolvedImages.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(resolvedImages.map((_, i) => i));
    }
  };

  // Filter style mapping
  const filterStyle = {
    normal: '',
    invert: 'invert(100%) hue-rotate(180deg)',
    high_contrast: 'contrast(160%) brightness(110%) saturate(130%)',
    sepia: 'sepia(85%) contrast(115%)',
    monochrome: 'grayscale(100%) contrast(120%)',
    cyber_glow: 'hue-rotate(90deg) contrast(140%) brightness(105%) saturate(160%)',
  }[colorFilter];

  if (!resolvedImages || resolvedImages.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        No images available in this in-memory gallery.
      </div>
    );
  }

  return (
    <div className="bg-[#090C12] border border-[#1E2536] rounded-md flex flex-col overflow-hidden shadow-2xl font-sans w-full h-full flex-1 min-h-[520px]">
      {/* Top Gallery HUD Control Bar */}
      <div className="bg-[#0e131f] border-b border-[#1E2536] p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
        {/* Left: Gallery Badge & Image Counter */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#FF9933]/15 border border-[#FF9933]/30 text-[#FF9933]">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-xs tracking-wider">
                RAM PHOTO GALLERY
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40 font-mono font-bold">
                {viewMode === 'single' ? `${currentIndex + 1} / ${resolvedImages.length}` : `${processedImages.length} of ${resolvedImages.length} photos`}
              </span>
            </div>
            {viewMode === 'single' && (
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-xs">
                {currentImage?.fileName} ({formatBytes(currentImage?.fileSize || 0)})
                {imageDimensions ? ` • ${imageDimensions.width}×${imageDimensions.height}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Center/Right: Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Toggle: Lightbox (Single) vs Grid View */}
          <div className="flex rounded bg-[#161c2d] border border-[#1E2536] p-0.5">
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('single');
              }}
              title="Single Lightbox View (G)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'single'
                  ? 'bg-[#FF9933] text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Viewer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('grid');
              }}
              title="Gallery Grid View (G)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-[#FF9933] text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Grid</span>
            </button>
          </div>

          {/* GRID VIEW CONTROLS */}
          {viewMode === 'grid' && (
            <>
              {/* Search Bar in Grid */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter images..."
                  className="bg-[#161c2d] border border-[#1E2536] focus:border-[#FF9933] rounded pl-6 pr-2 py-1 text-[10px] text-white placeholder-slate-500 outline-none w-28 sm:w-36 font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Grid Column Selector */}
              <div className="hidden sm:flex items-center gap-1 bg-[#161c2d] border border-[#1E2536] rounded p-0.5">
                {([2, 3, 4, 6] as const).map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setGridColumns(cols);
                    }}
                    title={`${cols} Columns`}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer ${
                      gridColumns === cols
                        ? 'bg-[#FF9933] text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cols}C
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                title="Sort Images"
                className="bg-[#161c2d] border border-[#1E2536] text-[10px] font-mono text-slate-300 rounded px-1.5 py-1 outline-none cursor-pointer"
              >
                <option value="index">Default Order</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-desc">Size (Large-Small)</option>
                <option value="size-asc">Size (Small-Large)</option>
              </select>

              {/* Select All Toggle */}
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] text-[10px] font-mono cursor-pointer"
                title="Select / Deselect All"
              >
                {selectedIndices.length === resolvedImages.length ? 'Deselect All' : 'Select All'}
              </button>

              {/* Save as .cf particulars Button in Grid */}
              <button
                type="button"
                onClick={handleOpenSaveParticularsModal}
                className={`px-2.5 py-1 rounded font-mono text-[10px] flex items-center gap-1.5 cursor-pointer transition-all ${
                  selectedIndices.length > 0
                    ? 'bg-[#00FF66] text-[#090C12] font-bold shadow-[0_0_12px_rgba(0,255,102,0.35)] hover:bg-[#00e65c]'
                    : 'bg-[#161c2d] hover:bg-[#1f273e] text-[#00FF66] border border-[#00FF66]/40'
                }`}
                title="Save selected images as .cf particulars file / vault"
              >
                <Lock className="w-3 h-3" />
                <span>Save as .cf particulars{selectedIndices.length > 0 ? ` (${selectedIndices.length})` : ''}</span>
              </button>

              {/* Share to System Apps Button in Grid */}
              <button
                type="button"
                onClick={() => {
                  playCyberBeep('click');
                  setShowSystemShareModal(true);
                }}
                className={`px-2.5 py-1 rounded font-mono text-[10px] flex items-center gap-1.5 cursor-pointer transition-all ${
                  selectedIndices.length > 0
                    ? 'bg-[#38BDF8] text-[#090C12] font-bold shadow-[0_0_12px_rgba(56,189,248,0.35)] hover:bg-[#60cdff]'
                    : 'bg-[#161c2d] hover:bg-[#1f273e] text-[#38BDF8] border border-[#38BDF8]/40'
                }`}
                title="Share selected decrypted images using system downloaded apps (WhatsApp, Drive, Gmail, etc.)"
              >
                <Share2 className="w-3 h-3" />
                <span>Share to System Apps{selectedIndices.length > 0 ? ` (${selectedIndices.length})` : ''}</span>
              </button>

              {/* Batch Download Selected Raw */}
              {selectedIndices.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadSelected}
                  className="px-2 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                  title="Download Raw Files"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              )}
            </>
          )}

          {/* SINGLE LIGHTBOX VIEW CONTROLS */}
          {viewMode === 'single' && (
            <>
              {/* Zoom Out / Percent / In */}
              <div className="flex items-center gap-1 bg-[#161c2d] border border-[#1E2536] rounded px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  title="Reset Zoom & Orientation"
                  className="text-[10px] font-mono text-amber-300 font-bold px-1 hover:underline cursor-pointer"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rotate Clockwise */}
              <button
                type="button"
                onClick={handleRotateCw}
                title="Rotate 90° Clockwise (R)"
                className="p-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              {/* Flip Horizontal */}
              <button
                type="button"
                onClick={handleFlipH}
                title="Flip Horizontally"
                className={`p-1 rounded border transition-colors cursor-pointer ${
                  isFlippedH
                    ? 'bg-[#FF9933] text-slate-950 border-[#FF9933]'
                    : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border-[#1E2536]'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Color Filter Selector */}
              <select
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value as any)}
                title="Color Inspection Filter"
                className="bg-[#161c2d] border border-[#1E2536] text-[10px] font-mono text-slate-300 rounded px-2 py-1 outline-none cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="invert">Invert</option>
                <option value="high_contrast">Contrast</option>
                <option value="sepia">Sepia</option>
                <option value="monochrome">B&amp;W</option>
                <option value="cyber_glow">Cyber</option>
              </select>

              {/* Slideshow Toggle */}
              <div className="flex items-center gap-1 bg-[#161c2d] border border-[#1E2536] rounded p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    playCyberBeep('click');
                    setIsSlideshowPlaying(!isSlideshowPlaying);
                  }}
                  title={isSlideshowPlaying ? 'Pause Slideshow (Space)' : 'Play Slideshow (Space)'}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isSlideshowPlaying
                      ? 'bg-amber-500 text-slate-950 border border-amber-400 animate-pulse'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isSlideshowPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isSlideshowPlaying ? 'Playing' : 'Slideshow'}</span>
                </button>

                <select
                  value={slideshowSpeedSec}
                  onChange={(e) => setSlideshowSpeedSec(Number(e.target.value))}
                  title="Slideshow Speed"
                  className="bg-[#0f1422] border-none text-[9px] font-mono text-amber-300 rounded px-1 py-0.5 outline-none cursor-pointer"
                >
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>

              {/* Image Info Drawer Toggle */}
              <button
                type="button"
                onClick={() => {
                  playCyberBeep('click');
                  setShowInfoPanel(!showInfoPanel);
                }}
                title="Toggle Photo Metadata (I)"
                className={`p-1 rounded border transition-colors cursor-pointer ${
                  showInfoPanel
                    ? 'bg-[#FF9933] text-slate-950 border-[#FF9933]'
                    : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border-[#1E2536]'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Download Active Image */}
              <button
                type="button"
                onClick={handleDownloadActive}
                title="Download Active Photo to Disk"
                className="p-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Save as .cf particulars */}
              <button
                type="button"
                onClick={handleOpenSaveParticularsModal}
                title="Save photo as .cf particulars file / vault"
                className="px-2 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#00FF66] border border-[#00FF66]/40 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Save as .cf particulars</span>
              </button>

              {/* Share to System Apps */}
              <button
                type="button"
                onClick={() => {
                  playCyberBeep('click');
                  setShowSystemShareModal(true);
                }}
                title="Share photo using system downloaded apps (WhatsApp, Drive, Gmail, etc.)"
                className="px-2 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-[#38BDF8] border border-[#38BDF8]/40 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Share to System Apps</span>
              </button>
            </>
          )}

          {/* Dedicated Window Toggle */}
          {onToggleDedicatedWindow && (
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                onToggleDedicatedWindow();
              }}
              title={isDedicatedWindow ? 'Exit Dedicated Stage' : 'Open Dedicated Full Stage'}
              className="p-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-amber-400 border border-[#1E2536] transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden bg-[#07090e]">
        {viewMode === 'single' ? (
          /* LIGHTBOX / SINGLE PHOTO VIEW */
          <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
            <div
              className="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 select-none touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  const delta = e.deltaY < 0 ? 0.15 : -0.15;
                  setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.25), 5.0));
                }
              }}
            >
              {/* Background Checker Pattern for Transparency Detection */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#1E2536 1px, transparent 1px)`,
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Active Display Image */}
              {currentUrl && (
                <div
                  className="transition-transform duration-100 ease-out max-h-full max-w-full flex items-center justify-center"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                    filter: filterStyle,
                  }}
                >
                  <img
                    ref={activeImgRef}
                    src={currentUrl}
                    alt={currentImage?.fileName}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                    className="max-h-[68vh] max-w-full object-contain rounded shadow-2xl border border-[#1E2536]/60 pointer-events-auto"
                  />
                </div>
              )}

              {/* Floating Left / Right Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    title="Previous Image (Left Arrow)"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#0e131f]/85 hover:bg-[#161c2d] text-white border border-[#1E2536] shadow-2xl backdrop-blur-md transition-all hover:scale-110 cursor-pointer z-10"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#FF9933]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    title="Next Image (Right Arrow)"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-[#0e131f]/85 hover:bg-[#161c2d] text-white border border-[#1E2536] shadow-2xl backdrop-blur-md transition-all hover:scale-110 cursor-pointer z-10"
                  >
                    <ChevronRight className="w-5 h-5 text-[#FF9933]" />
                  </button>
                </>
              )}

              {/* Floating Zoom Indicator Pill */}
              {zoomLevel !== 1 && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-[#0e131f]/90 border border-[#FF9933]/50 text-[#FF9933] font-mono text-[10px] font-bold shadow-xl backdrop-blur-sm">
                  Zoom: {Math.round(zoomLevel * 100)}% (Pinch / Ctrl+Scroll to zoom)
                </div>
              )}
            </div>

            {/* Metadata Info Drawer (Collapsible) */}
            {showInfoPanel && currentImage && (
              <div className="bg-[#0c101a] border-t border-[#1E2536] p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">File Name</span>
                    <span className="text-white font-bold">{currentImage.fileName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">File Size</span>
                    <span className="text-amber-300 font-bold">{formatBytes(currentImage.fileSize)}</span>
                  </div>
                  {imageDimensions && (
                    <>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Dimensions</span>
                        <span className="text-cyan-300 font-bold">{imageDimensions.width} × {imageDimensions.height} px</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Aspect Ratio</span>
                        <span className="text-slate-300 font-bold">
                          {(imageDimensions.width / imageDimensions.height).toFixed(2)}:1
                        </span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">MIME Type</span>
                    <span className="text-slate-300">{currentImage.mimeType || 'image/auto'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase">RAM Security</span>
                    <span className="text-[#00FF66] font-bold">Zero-Disk Volatile Blob</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInfoPanel(false)}
                  className="text-slate-400 hover:text-white text-[10px] underline cursor-pointer"
                >
                  Close Info
                </button>
              </div>
            )}

            {/* Bottom Filmstrip Carousel */}
            {resolvedImages.length > 1 && (
              <div className="bg-[#0b0e17] border-t border-[#1E2536] p-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
                {resolvedImages.map((img, idx) => {
                  const isSelected = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playCyberBeep('click');
                        setCurrentIndex(idx);
                      }}
                      title={`View ${img.fileName}`}
                      className={`relative shrink-0 w-14 h-14 rounded border overflow-hidden transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#FF9933] ring-2 ring-[#FF9933]/60 scale-105'
                          : 'border-[#1E2536] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={objectUrls[idx]}
                        alt={img.fileName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white font-mono text-center truncate px-0.5">
                        #{idx + 1}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#FF9933]/15 pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* RICH PHOTO GRID VIEW (LIKE GOOGLE / APPLE PHOTOS) */
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col space-y-4 bg-[#07090e]">
            {/* Grid Layout Container */}
            <div
              className={`grid gap-3.5 ${
                gridColumns === 2
                  ? 'grid-cols-2'
                  : gridColumns === 3
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : gridColumns === 4
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6'
              }`}
            >
              {processedImages.map((img) => {
                const isSelected = selectedIndices.includes(img.originalIndex);
                const isCurrent = img.originalIndex === currentIndex;

                return (
                  <div
                    key={img.originalIndex}
                    onClick={() => {
                      playCyberBeep('click');
                      setCurrentIndex(img.originalIndex);
                      setViewMode('single');
                    }}
                    className={`group relative rounded-md border flex flex-col overflow-hidden bg-[#0c101a] cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'border-[#00FF66] ring-2 ring-[#00FF66]/50 shadow-[0_0_15px_rgba(0,255,102,0.3)]'
                        : isCurrent
                        ? 'border-[#FF9933] ring-1 ring-[#FF9933] shadow-[0_0_15px_rgba(255,153,51,0.25)]'
                        : 'border-[#1E2536] hover:border-slate-500'
                    }`}
                  >
                    {/* Thumbnail Stage */}
                    <div className="aspect-square w-full bg-[#05070a] flex items-center justify-center p-2 overflow-hidden relative">
                      <img
                        src={img.url}
                        alt={img.fileName}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105"
                      />

                      {/* Photo Index Badge */}
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-300 font-bold backdrop-blur-sm border border-white/10">
                        #{img.originalIndex + 1}
                      </div>

                      {/* Multi-Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleSelectImage(img.originalIndex, e)}
                        title={isSelected ? 'Deselect image' : 'Select image'}
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00FF66] text-black ring-2 ring-white'
                            : 'bg-black/60 text-transparent hover:text-white hover:bg-black/90 border border-white/30'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* Meta Footer */}
                    <div className="p-2.5 bg-[#0e131f] border-t border-[#1E2536] text-[10px] font-mono flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-1">
                        <p className="text-white font-medium truncate" title={img.fileName}>
                          {img.fileName}
                        </p>
                        <p className="text-slate-400 text-[9px] mt-0.5">
                          {formatBytes(img.fileSize)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playCyberBeep('success');
                          const a = document.createElement('a');
                          a.href = img.url;
                          a.download = img.fileName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        title={`Download ${img.fileName}`}
                        className="p-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 hover:text-[#00FF66] border border-[#1E2536] shrink-0"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {processedImages.length === 0 && (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                No images matching "{searchQuery}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save as .cf Particulars Modal */}
      {showSaveParticularsModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <div className="bg-[#090C12] border border-[#00FF66]/50 shadow-[0_0_35px_rgba(0,255,102,0.25)] rounded-md w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
            <div className="bg-[#0e141f] p-3.5 border-b border-[#1E2536] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#00FF66] font-bold text-xs uppercase font-mono tracking-wide">
                <Lock className="w-4 h-4" />
                <span>Save as .cf particulars ({selectedIndices.length > 0 ? selectedIndices.length : resolvedImages.length} Photos)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playCyberBeep('click');
                  setShowSaveParticularsModal(false);
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[#121824] border border-[#1E2536] rounded p-3 text-[11px] font-mono text-slate-300 space-y-1">
                <p className="text-white font-semibold flex items-center gap-1.5 text-xs text-[#00FF66]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
                  Verify Password to Save Vault Container
                </p>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Enter and confirm your master password below to seal the newly selected photo particulars into a zero-leak Argon2id + AES-GCM encrypted <strong className="text-white">.cf</strong> vault.
                </p>
              </div>

              {saveError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                  Vault Password Confirmation
                </label>
                <input
                  type="password"
                  value={savePassword}
                  onChange={(e) => {
                    setSavePassword(e.target.value);
                    if (saveError) setSaveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSavingParticulars && savePassword.trim()) {
                      executeSaveAsCfParticulars();
                    }
                  }}
                  placeholder="Enter vault password to confirm..."
                  className="w-full bg-[#161c2d] border border-[#1E2536] focus:border-[#00FF66] rounded px-3 py-2.5 text-white outline-none font-mono text-xs shadow-inner"
                  autoFocus
                />
              </div>

              <div className="space-y-2 pt-1 font-mono">
                {/* Primary Button: Save as .cf particulars */}
                <button
                  type="button"
                  disabled={isSavingParticulars || !savePassword.trim()}
                  onClick={executeSaveAsCfParticulars}
                  className="w-full py-3 px-4 rounded bg-[#00FF66] hover:bg-[#00e65c] text-[#090C12] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,102,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Confirm password and save .cf particulars vault"
                >
                  <Lock className="w-4 h-4" />
                  <span>Save as .cf particulars</span>
                </button>

                {/* Secondary Option: Export Decrypted ZIP */}
                <button
                  type="button"
                  disabled={isSavingParticulars}
                  onClick={executeExportDecryptedZip}
                  className="w-full py-2 px-3 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-400 hover:text-slate-200 border border-[#1E2536] text-[10px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Export raw image files (unencrypted ZIP/direct)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download as Decrypted Files / ZIP</span>
                </button>
              </div>

              {isSavingParticulars && (
                <div className="text-center text-[#00FF66] text-[10px] font-mono animate-pulse pt-1">
                  Deriving Argon2id keys & encrypting selected images into .cf particulars...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* System App Share Modal */}
      <SystemAppShareModal
        isOpen={showSystemShareModal}
        onClose={() => setShowSystemShareModal(false)}
        files={resolvedImages.map((img) => ({
          blob: img.blob,
          fileName: img.fileName,
          fileSize: img.fileSize,
          mimeType: img.mimeType,
        }))}
        vaultName="cipherflow_image_gallery"
        initialSelectedIndices={
          selectedIndices.length > 0
            ? selectedIndices
            : viewMode === 'single'
            ? [currentIndex]
            : undefined
        }
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded shadow-2xl font-mono text-xs flex items-center gap-2 border animate-fade-in ${
            toastMessage.type === 'success'
              ? 'bg-[#091512] text-[#00FF66] border-[#00FF66]/50 shadow-[0_0_20px_rgba(0,255,102,0.25)]'
              : toastMessage.type === 'error'
              ? 'bg-[#1a0c0f] text-rose-300 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
              : 'bg-[#0c1626] text-[#38BDF8] border-[#38BDF8]/50 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#00FF66] shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#38BDF8] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
