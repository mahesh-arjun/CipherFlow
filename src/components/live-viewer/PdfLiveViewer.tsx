import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Search,
  Copy,
  Check,
  Download,
  Flame,
  Layers,
  Sparkles,
  Sun,
  Moon,
  Tv,
  FileText,
  Sidebar,
  RefreshCw,
  AlertCircle,
  Sliders,
  Move,
  Smartphone,
  Monitor,
  Maximize,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfLiveViewerProps {
  blob: Blob;
  fileName: string;
  fileSize: number;
  isDedicatedWindow?: boolean;
  onToggleDedicatedWindow?: () => void;
}

export const PdfLiveViewer: React.FC<PdfLiveViewerProps> = ({
  blob,
  fileName,
  fileSize,
  isDedicatedWindow = false,
  onToggleDedicatedWindow,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // PDF Document State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [zoomMode, setZoomMode] = useState<'fit-width' | 'fit-page' | 'fit-device' | 'custom'>('fit-device');
  const [theme, setTheme] = useState<'dark' | 'light' | 'invert' | 'sepia'>('dark');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Dynamic Device Dimensions & User Bounds Adjuster
  const [deviceDimensions, setDeviceDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });
  const [customStageWidthPercent, setCustomStageWidthPercent] = useState<number>(100);
  const [customStageMaxHeightVh, setCustomStageMaxHeightVh] = useState<number>(85);
  const [showDimensionsModal, setShowDimensionsModal] = useState<boolean>(false);

  // Pinch-to-Zoom Gesture State
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [pinchScaleDisplay, setPinchScaleDisplay] = useState<number>(1.0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Text Extraction & Search
  const [pageInput, setPageInput] = useState<string>('1');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [showTextDrawer, setShowTextDrawer] = useState<boolean>(false);

  // Render task cancellation ref to avoid canvas overlap
  const renderTaskRef = useRef<any>(null);

  // Track window & device dimensions reactively
  useEffect(() => {
    const handleResize = () => {
      setDeviceDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-hide thumbnails on small mobile screens to prevent overflow
  useEffect(() => {
    if (deviceDimensions.width < 640 && showThumbnails) {
      setShowThumbnails(false);
    }
  }, [deviceDimensions.width]);

  // Load PDF from Blob arrayBuffer
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentPage(1);
    setPageInput('1');

    async function loadPdf() {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('PDF load error:', err);
          setErrorMessage(
            'Unable to parse PDF binary stream. Opening in high-security text reader mode.'
          );
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [blob]);

  // Render current active page to Canvas with strict Device Bounds Calculation
  useEffect(() => {
    if (!pdfDoc || currentPage < 1 || currentPage > numPages) return;

    let isCancelled = false;
    setIsRendering(true);

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }

        const page = await pdfDoc!.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const unscaledViewport = page.getViewport({ scale: 1, rotation });

        // Calculate available dimensions from device & container
        const stageEl = stageViewportRef.current;
        const availableContainerWidth = stageEl?.clientWidth || (deviceDimensions.width - (showThumbnails ? 180 : 32));
        const availableContainerHeight = stageEl?.clientHeight || Math.max(350, deviceDimensions.height - 240);

        // Safe bounds taking device padding into account
        const safeWidth = Math.max(280, availableContainerWidth - 32);
        const safeHeight = Math.max(300, availableContainerHeight - 32);

        let effectiveScale = scale;

        if (zoomMode === 'fit-device') {
          // Scale to fit perfectly inside device bounds (both width and height)
          const scaleW = safeWidth / unscaledViewport.width;
          const scaleH = safeHeight / unscaledViewport.height;
          effectiveScale = Math.min(scaleW, scaleH, 2.5);
          setScale(effectiveScale);
        } else if (zoomMode === 'fit-width') {
          effectiveScale = safeWidth / unscaledViewport.width;
        } else if (zoomMode === 'fit-page') {
          effectiveScale = safeHeight / unscaledViewport.height;
        }

        // Clamp scale to valid ranges
        effectiveScale = Math.max(0.3, Math.min(4.0, effectiveScale));

        const viewport = page.getViewport({ scale: effectiveScale, rotation });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext as any);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setIsRendering(false);
          setPinchScaleDisplay(effectiveScale);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('PDF Page render error:', err);
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, rotation, zoomMode, showThumbnails, deviceDimensions]);

  // =========================================================================
  // MULTI-TOUCH PINCH-TO-ZOOM & TRACKPAD GESTURE HANDLERS
  // =========================================================================
  const getTouchDistance = (touches: React.TouchList | TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      const ratio = currentDist / pinchStartDistRef.current;
      const newScale = Math.max(0.35, Math.min(4.0, parseFloat((pinchStartScaleRef.current * ratio).toFixed(2))));

      setZoomMode('custom');
      setScale(newScale);
      setPinchScaleDisplay(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      setTimeout(() => setIsPinching(false), 500);
    }
  };

  // Wheel listener for pinch-to-zoom on trackpads (ctrl + wheel)
  useEffect(() => {
    const stageEl = stageViewportRef.current;
    if (!stageEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.005;
        setScale((prev) => {
          const next = Math.max(0.35, Math.min(4.0, parseFloat((prev + delta).toFixed(2))));
          setPinchScaleDisplay(next);
          return next;
        });
        setZoomMode('custom');
        setIsPinching(true);
        clearTimeout((window as any)._pinchTimeout);
        (window as any)._pinchTimeout = setTimeout(() => setIsPinching(false), 800);
      }
    };

    stageEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => stageEl.removeEventListener('wheel', handleWheel);
  }, []);

  // Page Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      playCyberBeep('click');
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      setPageInput(String(nextP));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      playCyberBeep('click');
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      setPageInput(String(nextP));
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      playCyberBeep('click');
      setCurrentPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    playCyberBeep('click');
    setZoomMode('custom');
    setScale((prev) => {
      const next = Math.min(4.0, parseFloat((prev + 0.2).toFixed(2)));
      setPinchScaleDisplay(next);
      return next;
    });
  };

  const handleZoomOut = () => {
    playCyberBeep('click');
    setZoomMode('custom');
    setScale((prev) => {
      const next = Math.max(0.35, parseFloat((prev - 0.2).toFixed(2)));
      setPinchScaleDisplay(next);
      return next;
    });
  };

  const handleRotate = () => {
    playCyberBeep('click');
    setRotation((prev) => (prev + 90) % 360);
  };

  // Text Extraction & Search
  const handleExtractText = async () => {
    if (!pdfDoc) return;
    playCyberBeep('click');
    setIsExtractingText(true);
    setShowTextDrawer(true);

    try {
      let fullText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- PAGE ${i} ---\n${pageText}\n\n`;
      }
      setExtractedText(fullText.trim());
    } catch (e) {
      console.error('Error extracting text:', e);
    } finally {
      setIsExtractingText(false);
    }
  };

  const handleCopyExtractedText = () => {
    if (!extractedText) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(extractedText)
        .then(() => {
          playCyberBeep('success');
          setCopiedText(true);
          setTimeout(() => setCopiedText(false), 2000);
        })
        .catch(() => {
          fallbackCopyPdfText(extractedText);
        });
    } else {
      fallbackCopyPdfText(extractedText);
    }
  };

  const fallbackCopyPdfText = (text: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      playCyberBeep('success');
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted frames
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${customStageWidthPercent}%`,
        maxHeight: isDedicatedWindow ? `${customStageMaxHeightVh}vh` : '780px',
      }}
      className={`bg-[#090C12] border border-[#1E2536] rounded-md flex flex-col overflow-hidden shadow-2xl font-sans transition-all mx-auto ${
        isDedicatedWindow ? 'w-full max-w-full h-full flex-1 min-h-0' : 'min-h-[480px] w-full'
      }`}
    >
      {/* Top Document Header HUD */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#0e131f] border-b border-[#1E2536] gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-xs truncate max-w-[180px] sm:max-w-xs font-mono">
                {fileName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40">
                ADAPTIVE DEVICE CANVAS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span className="text-slate-300">
                {numPages > 0 ? `${numPages} ${numPages === 1 ? 'Page' : 'Pages'}` : 'Decrypted PDF'}
              </span>
              <span>•</span>
              <span className="text-[#00FF66] font-semibold">Protected RAM</span>
            </div>
          </div>
        </div>

        {/* Top Right: Format & Stage controls */}
        <div className="flex items-center gap-2">
          {/* Device Dimension Adjuster Button */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setShowDimensionsModal(!showDimensionsModal);
            }}
            title="Adjust Stage Dimensions & Device Bounds"
            className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
              showDimensionsModal
                ? 'bg-[#00F0FF] text-slate-950 border-[#00F0FF] font-bold'
                : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-200 border-[#1E2536]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span className="hidden sm:inline">Device Bounds</span>
          </button>

          {/* Text Extract Button */}
          <button
            type="button"
            onClick={handleExtractText}
            title="Extract Clean Text from PDF"
            className="px-2.5 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-200 border border-[#1E2536] text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span className="hidden sm:inline">Text Reader</span>
          </button>

          {/* Toggle Dedicated Stage Button */}
          {onToggleDedicatedWindow && (
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                onToggleDedicatedWindow();
              }}
              title={isDedicatedWindow ? 'Exit Dedicated Stage' : 'Expand Dedicated Stage'}
              className={`px-2.5 py-1 rounded border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDedicatedWindow
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-[#161c2d] hover:bg-[#1f273e] text-slate-200 border-[#1E2536]'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {isDedicatedWindow ? 'Windowed' : 'Dedicated Stage'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Device Dimensions Adjustment Drawer/Bar */}
      {showDimensionsModal && (
        <div className="px-4 py-3 bg-[#0a0d15] border-b border-[#00F0FF]/30 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs animate-fade-in font-mono">
          <div className="sm:col-span-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#00F0FF]" />
            <div>
              <div className="text-white font-bold text-xs">
                Device Screen: {deviceDimensions.width} × {deviceDimensions.height} px
              </div>
              <div className="text-[10px] text-slate-400">
                Live viewport calculation preventing canvas overflow
              </div>
            </div>
          </div>

          <div className="sm:col-span-8 flex items-center gap-3 justify-between sm:justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Stage Width:</span>
              <input
                type="range"
                min="50"
                max="100"
                value={customStageWidthPercent}
                onChange={(e) => setCustomStageWidthPercent(Number(e.target.value))}
                className="w-24 accent-[#00F0FF] cursor-pointer"
              />
              <span className="text-[10px] text-[#00F0FF] font-bold">{customStageWidthPercent}%</span>
            </div>

            {isDedicatedWindow && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Max Height:</span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={customStageMaxHeightVh}
                  onChange={(e) => setCustomStageMaxHeightVh(Number(e.target.value))}
                  className="w-24 accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-amber-400 font-bold">{customStageMaxHeightVh}vh</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCustomStageWidthPercent(100);
                setCustomStageMaxHeightVh(85);
                setZoomMode('fit-device');
                playCyberBeep('click');
              }}
              className="px-2 py-1 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 border border-[#1E2536] text-[10px] cursor-pointer"
            >
              Reset to Device Optimal
            </button>
          </div>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="px-3 sm:px-4 py-2 bg-[#0c101a] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        {/* Left: Page Jump & Thumbnails Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setShowThumbnails(!showThumbnails);
            }}
            title={showThumbnails ? 'Hide Thumbnails' : 'Show Thumbnails'}
            className={`p-1.5 rounded border text-xs cursor-pointer transition-colors ${
              showThumbnails
                ? 'bg-[#00F0FF]/20 border-[#00F0FF]/40 text-[#00F0FF]'
                : 'bg-[#161c2d] border-[#1E2536] text-slate-400 hover:text-white'
            }`}
          >
            <Sidebar className="w-3.5 h-3.5" />
          </button>

          {/* Page Navigator */}
          <div className="flex items-center bg-[#161c2d] rounded border border-[#1E2536] p-0.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center px-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => setPageInput(String(currentPage))}
                className="w-8 text-center bg-[#0e131f] border border-[#1E2536] rounded text-[11px] font-mono text-white py-0.5 outline-none"
              />
              <span className="text-[10px] font-mono text-slate-400 ml-1">/ {numPages || 1}</span>
            </form>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-1 rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              title="Next Page (Right Arrow)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Zoom Controls & Pinch-to-Zoom Adaptive Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
            {/* Auto Device Fit */}
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setZoomMode('fit-device');
              }}
              title="Scale strictly inside device bounds (zero overflow)"
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                zoomMode === 'fit-device'
                  ? 'bg-[#00F0FF] text-slate-950 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Device Fit
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setZoomMode('fit-width');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                zoomMode === 'fit-width'
                  ? 'bg-[#00F0FF] text-slate-950 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fit Width
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setZoomMode('fit-page');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                zoomMode === 'fit-page'
                  ? 'bg-[#00F0FF] text-slate-950 font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Fit Page
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-1 min-w-[40px] text-center font-bold">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            title="Rotate 90° Clockwise"
            className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 hover:text-white border border-[#1E2536] cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Reading Theme Modes */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              title="Modern Dark Theme"
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-[#1E2536] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              title="High Contrast White Theme"
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                theme === 'light' ? 'bg-white text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('invert')}
              title="OLED Invert Mode"
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                theme === 'invert' ? 'bg-[#00FF66] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Invert
            </button>
          </div>
        </div>
      </div>

      {/* Main Stage & Document Area */}
      <div
        ref={stageViewportRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex flex-1 overflow-auto relative bg-[#06080e] min-h-[380px] select-none touch-pan-x touch-pan-y"
      >
        {/* Left Thumbnails Filmstrip Drawer */}
        {showThumbnails && numPages > 0 && (
          <div className="w-32 sm:w-40 bg-[#0a0d16] border-r border-[#1E2536] p-2 overflow-y-auto space-y-2 shrink-0 max-h-full">
            <div className="text-[10px] font-mono font-bold text-slate-400 px-1 uppercase mb-1">
              Thumbnails ({numPages})
            </div>
            {Array.from({ length: numPages }).map((_, idx) => {
              const pNum = idx + 1;
              const isSelected = pNum === currentPage;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => {
                    playCyberBeep('click');
                    setCurrentPage(pNum);
                    setPageInput(String(pNum));
                  }}
                  className={`w-full p-1.5 rounded text-left transition-all cursor-pointer border flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'bg-[#121622] hover:bg-[#1a2133] border-[#1E2536] text-slate-400'
                  }`}
                >
                  <div className="w-full aspect-[3/4] bg-[#07090f] rounded-xs flex items-center justify-center text-[10px] font-mono text-slate-400 border border-[#1E2536]">
                    <div className="p-1 text-center">
                      <div className="text-[9px] text-slate-500 font-bold mb-0.5">PAGE {pNum}</div>
                      <div className="w-10 h-1 bg-slate-700 mx-auto mb-1 rounded-full" />
                      <div className="w-7 h-1 bg-slate-700 mx-auto mb-1 rounded-full" />
                      <div className="w-9 h-1 bg-slate-800 mx-auto rounded-full" />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected ? 'text-[#00F0FF]' : 'text-slate-400'
                    }`}
                  >
                    Page {pNum}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Center Canvas Stage Area with Responsive Bounds Containment */}
        <div className="flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center relative min-w-0">
          {/* Active Pinch HUD Overlay Indicator */}
          {isPinching && (
            <div className="absolute top-4 z-30 px-3 py-1.5 rounded-full bg-[#090C12]/90 border border-[#00F0FF] text-[#00F0FF] text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,240,255,0.5)] flex items-center gap-2 backdrop-blur-sm animate-bounce">
              <Move className="w-3.5 h-3.5 animate-spin" />
              <span>Pinch Zoom: {Math.round(pinchScaleDisplay * 100)}%</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
              <RefreshCw className="w-8 h-8 text-[#00F0FF] animate-spin" />
              <div className="font-mono">DECODING EPHEMERAL PDF IN BROWSER RAM...</div>
            </div>
          ) : errorMessage ? (
            <div className="p-6 bg-[#0e131f] border border-rose-500/50 rounded-md text-center max-w-md space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="text-white font-bold text-xs">{errorMessage}</div>
              <button
                type="button"
                onClick={handleExtractText}
                className="px-3 py-1.5 rounded bg-[#00F0FF] text-slate-950 font-bold text-xs cursor-pointer"
              >
                Open in Pure Text Reader Mode
              </button>
            </div>
          ) : (
            <div
              className={`transition-all relative shadow-2xl rounded-sm max-w-full overflow-hidden ${
                theme === 'dark'
                  ? 'ring-1 ring-[#1E2536] bg-[#121622]'
                  : theme === 'light'
                  ? 'ring-4 ring-slate-800 bg-white'
                  : theme === 'invert'
                  ? 'filter invert contrast-125'
                  : 'bg-[#FAF0E6]'
              }`}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto block rounded-sm select-none"
              />

              {isRendering && (
                <div className="absolute inset-0 bg-[#07090e]/60 backdrop-blur-xs flex items-center justify-center rounded-sm">
                  <RefreshCw className="w-6 h-6 text-[#00F0FF] animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Text Drawer if opened */}
        {showTextDrawer && (
          <div className="w-72 sm:w-88 bg-[#0a0d16] border-l border-[#1E2536] flex flex-col overflow-hidden z-20 shrink-0 max-h-full">
            <div className="p-3 bg-[#0e131f] border-b border-[#1E2536] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <FileText className="w-4 h-4 text-[#00F0FF]" />
                <span>Extracted Document Text</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyExtractedText}
                  className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-300 hover:text-white border border-[#1E2536] text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  {copiedText ? (
                    <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#00F0FF]" />
                  )}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTextDrawer(false)}
                  className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] text-slate-400 hover:text-white border border-[#1E2536] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {isExtractingText ? (
                <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#00F0FF]" />
                  <span>Extracting text strings...</span>
                </div>
              ) : extractedText ? (
                extractedText
              ) : (
                <div className="text-slate-500 text-center py-8">No text extracted</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#0a0d16] border-t border-[#1E2536] flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Device-Aware PDF Stage • Pinch-to-Zoom Active
          </span>
          <span className="hidden sm:inline text-slate-500">//</span>
          <span className="hidden md:inline">Pinch with two fingers or use Ctrl+Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-2">
          <span>
            Page {currentPage} of {numPages || 1}
          </span>
        </div>
      </div>
    </div>
  );
};
