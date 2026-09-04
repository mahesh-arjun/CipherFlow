import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Square,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Palette,
  Clock,
  Layers,
  ChevronDown,
  Tv,
  Check,
  Eye,
  Type,
  Maximize,
  Ratio,
  PenTool,
  Highlighter,
  Eraser,
  Trash2,
  Undo2,
  Search,
  Sliders,
  Copy,
  Download,
  BookOpen,
  MonitorPlay,
  Timer,
  Info,
  Table as TableIcon,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { parsePptxBlob, PptxDocument, PptxSlide, PptxParagraph, PptxTable } from '../../lib/officeParser';
import { playCyberBeep } from '../../lib/cyberAudio';

interface PresentationLiveViewerProps {
  blob: Blob;
  fileName: string;
  fileSize: number;
  isDedicatedWindow?: boolean;
  onToggleDedicatedWindow?: () => void;
}

type SlideTheme =
  | 'clean-light'
  | 'modern-dark'
  | 'midnight-navy'
  | 'executive-slate'
  | 'obsidian-emerald'
  | 'warm-paper';

type ViewMode = 'stage' | 'dual' | 'grid' | 'outline';
type SlideFont = 'calibri' | 'aptos' | 'arial' | 'segoe' | 'georgia' | 'trebuchet' | 'garamond' | 'mono';
type AspectRatioMode = 'auto' | '16:9' | '4:3' | '16:10';
type FitMode = 'fit' | '100' | 'fill';
type AnnotationTool = 'none' | 'laser' | 'pen' | 'highlighter' | 'eraser';

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  opacity: number;
  points: DrawPoint[];
}

const FONT_MAP: Record<SlideFont, { name: string; family: string }> = {
  calibri: { name: 'Calibri (Default Office)', family: 'Calibri, Aptos, Arial, sans-serif' },
  aptos: { name: 'Aptos (Modern 365)', family: 'Aptos, Calibri, "Segoe UI", sans-serif' },
  arial: { name: 'Arial (Clean Modern)', family: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  segoe: { name: 'Segoe UI (Enterprise)', family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  georgia: { name: 'Georgia (Editorial Serif)', family: 'Georgia, "Times New Roman", Times, serif' },
  trebuchet: { name: 'Trebuchet MS (Dynamic)', family: '"Trebuchet MS", "Lucida Grande", sans-serif' },
  garamond: { name: 'Garamond (Executive Serif)', family: 'Garamond, "Hoefler Text", "Times New Roman", serif' },
  mono: { name: 'JetBrains Mono (Technical)', family: '"JetBrains Mono", monospace' },
};

const ASPECT_DIMENSIONS: Record<string, { width: number; height: number; ratioLabel: string }> = {
  '16:9': { width: 1280, height: 720, ratioLabel: '16:9 Widescreen' },
  '4:3': { width: 1024, height: 768, ratioLabel: '4:3 Standard' },
  '16:10': { width: 1280, height: 800, ratioLabel: '16:10 Display' },
};

export const PresentationLiveViewer: React.FC<PresentationLiveViewerProps> = ({
  blob,
  fileName,
  fileSize,
  isDedicatedWindow = false,
  onToggleDedicatedWindow,
}) => {
  // Document State
  const [doc, setDoc] = useState<PptxDocument | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View & Presentation Modes
  const [viewMode, setViewMode] = useState<ViewMode>('stage');
  const [aspectRatioMode, setAspectRatioMode] = useState<AspectRatioMode>('auto');
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Styling & Typography
  const [slideTheme, setSlideTheme] = useState<SlideTheme>('clean-light');
  const [selectedFont, setSelectedFont] = useState<SlideFont>('calibri');
  const [fontScaleMultiplier, setFontScaleMultiplier] = useState<number>(1);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto Slideshow & Timer
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoPlayIntervalSec, setAutoPlayIntervalSec] = useState<number>(5);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Annotation & Laser Pointer
  const [activeTool, setActiveTool] = useState<AnnotationTool>('none');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penSize, setPenSize] = useState<number>(3);
  const [annotations, setAnnotations] = useState<Record<number, DrawStroke[]>>({});
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Layout & Container Measurements for Mathematical Fit
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drawingSvgRef = useRef<SVGSVGElement | null>(null);
  const [stageDimensions, setStageDimensions] = useState<{ width: number; height: number }>({
    width: 900,
    height: 520,
  });

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopwatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Parse PPTX file in-memory
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    parsePptxBlob(blob)
      .then((parsed) => {
        if (!isMounted) return;
        setDoc(parsed);
        setCurrentSlideIndex(0);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('PPTX parse error:', err);
        setError('Could not decode slide structure from this PowerPoint container.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [blob]);

  // 2. Stage Dimensions Resize Observer for dynamic scale calculations
  useEffect(() => {
    const stageEl = stageContainerRef.current;
    if (!stageEl) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setStageDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(stageEl);
    return () => observer.disconnect();
  }, [viewMode, showThumbnails, isFullScreen]);

  // 3. Resolve active aspect ratio and virtual canvas dimensions
  const activeRatioKey: '16:9' | '4:3' | '16:10' = useMemo(() => {
    if (aspectRatioMode === 'auto') {
      return doc?.detectedRatio || '16:9';
    }
    return aspectRatioMode;
  }, [aspectRatioMode, doc]);

  const virtualDims = ASPECT_DIMENSIONS[activeRatioKey] || ASPECT_DIMENSIONS['16:9'];

  // 4. Calculate Mathematical Scale Factor to Fit Stage with Zero Distortion
  const computedScale = useMemo(() => {
    const paddingX = 32;
    const paddingY = 32;
    const availW = Math.max(200, stageDimensions.width - paddingX);
    const availH = Math.max(150, stageDimensions.height - paddingY);

    if (fitMode === '100') {
      return (zoomLevel / 100);
    }

    if (fitMode === 'fill') {
      return Math.max(availW / virtualDims.width, availH / virtualDims.height) * (zoomLevel / 100);
    }

    // Default 'fit' mode: perfect proportional fit
    const baseFitScale = Math.min(availW / virtualDims.width, availH / virtualDims.height);
    return Math.max(0.15, baseFitScale * (zoomLevel / 100));
  }, [stageDimensions, virtualDims, fitMode, zoomLevel]);

  // 5. Slideshow Auto-play loop
  useEffect(() => {
    if (!isAutoPlaying || !doc || doc.slides.length <= 1) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        if (prev >= doc.slides.length - 1) {
          return 0; // Loop back
        }
        return prev + 1;
      });
    }, autoPlayIntervalSec * 1000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, doc, autoPlayIntervalSec]);

  // 6. Presentation Meeting Stopwatch Timer
  useEffect(() => {
    if (isTimerRunning) {
      stopwatchTimerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    }
    return () => {
      if (stopwatchTimerRef.current) clearInterval(stopwatchTimerRef.current);
    };
  }, [isTimerRunning]);

  // 7. Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in search input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (!doc) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'n') {
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'p') {
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(doc.slides.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullScreen();
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool((prev) => (prev === 'laser' ? 'none' : 'laser'));
      } else if (e.key === 'Escape') {
        if (isFullScreen) {
          setIsFullScreen(false);
        }
        setActiveTool('none');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doc, isFullScreen, currentSlideIndex]);

  const handleNextSlide = () => {
    if (!doc) return;
    playCyberBeep('click');
    setCurrentSlideIndex((prev) => Math.min(doc.slides.length - 1, prev + 1));
  };

  const handlePrevSlide = () => {
    if (!doc) return;
    playCyberBeep('click');
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const toggleFullScreen = () => {
    playCyberBeep('click');
    if (!isFullScreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullScreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreen(false);
    }
  };

  // Convert client coordinates to virtual slide SVG/Canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLElement>): DrawPoint | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = virtualDims.width / rect.width;
    const scaleY = virtualDims.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Drawing & Annotation handlers
  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== 'pen' && activeTool !== 'highlighter') return;
    const pt = getCanvasCoords(e);
    if (!pt) return;

    setIsDrawing(true);
    const newStroke: DrawStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: activeTool,
      color: penColor,
      size: activeTool === 'highlighter' ? penSize * 4 : penSize,
      opacity: activeTool === 'highlighter' ? 0.35 : 1,
      points: [pt],
    };
    setCurrentStroke(newStroke);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Laser pointer tracking
    if (activeTool === 'laser' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setLaserPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    // Freehand Pen / Highlighter
    if (!isDrawing || !currentStroke) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;

    setCurrentStroke((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, pt],
      };
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);

    setAnnotations((prev) => {
      const slideStrokes = prev[currentSlideIndex] || [];
      return {
        ...prev,
        [currentSlideIndex]: [...slideStrokes, currentStroke],
      };
    });
    setCurrentStroke(null);
  };

  const handleUndoAnnotation = () => {
    playCyberBeep('click');
    setAnnotations((prev) => {
      const slideStrokes = prev[currentSlideIndex] || [];
      if (slideStrokes.length === 0) return prev;
      return {
        ...prev,
        [currentSlideIndex]: slideStrokes.slice(0, -1),
      };
    });
  };

  const handleClearAnnotations = () => {
    playCyberBeep('click');
    setAnnotations((prev) => {
      const next = { ...prev };
      delete next[currentSlideIndex];
      return next;
    });
  };

  const handleCopySlideText = () => {
    if (!doc) return;
    const slide = doc.slides[currentSlideIndex];
    if (!slide) return;

    const fullText = [
      `Slide ${slide.slideNumber}: ${slide.title}`,
      slide.subtitle ? `Subtitle: ${slide.subtitle}` : '',
      ...slide.texts,
      slide.notes ? `\nSpeaker Notes:\n${slide.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(fullText)
        .then(() => {
          playCyberBeep('click');
          setCopiedNotice(true);
          setTimeout(() => setCopiedNotice(false), 2000);
        })
        .catch(() => {
          fallbackCopySlideText(fullText);
        });
    } else {
      fallbackCopySlideText(fullText);
    }
  };

  const fallbackCopySlideText = (text: string) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      playCyberBeep('click');
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted frames
    }
  };

  const formatTimer = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper theme classes for slide canvas
  const getThemeStyles = (theme: SlideTheme) => {
    switch (theme) {
      case 'clean-light':
        return {
          canvasBg: 'bg-white text-slate-900',
          titleColor: 'text-slate-900',
          subtitleColor: 'text-sky-600',
          textColor: 'text-slate-700',
          cardBg: 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm',
          badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
          dividerColor: 'border-slate-200',
          accentColor: '#0284c7',
          bulletDot: 'bg-sky-600',
          footerColor: 'text-slate-400',
          tableHeaderBg: 'bg-slate-100 text-slate-900 border-slate-300',
          tableCellBorder: 'border-slate-200',
        };
      case 'modern-dark':
        return {
          canvasBg: 'bg-[#0f172a] text-slate-100',
          titleColor: 'text-white',
          subtitleColor: 'text-cyan-400',
          textColor: 'text-slate-300',
          cardBg: 'bg-slate-800/90 border-slate-700 text-slate-200 shadow-sm',
          badgeBg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60',
          dividerColor: 'border-slate-700',
          accentColor: '#00F0FF',
          bulletDot: 'bg-cyan-400',
          footerColor: 'text-slate-500',
          tableHeaderBg: 'bg-slate-800 text-cyan-300 border-slate-700',
          tableCellBorder: 'border-slate-800',
        };
      case 'midnight-navy':
        return {
          canvasBg: 'bg-[#0b132b] text-slate-100',
          titleColor: 'text-white',
          subtitleColor: 'text-amber-400',
          textColor: 'text-slate-300',
          cardBg: 'bg-[#1c2541] border-[#3a506b] text-slate-200 shadow-sm',
          badgeBg: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
          dividerColor: 'border-[#3a506b]',
          accentColor: '#FFB800',
          bulletDot: 'bg-amber-400',
          footerColor: 'text-slate-500',
          tableHeaderBg: 'bg-[#1c2541] text-amber-300 border-[#3a506b]',
          tableCellBorder: 'border-[#1c2541]',
        };
      case 'executive-slate':
        return {
          canvasBg: 'bg-slate-900 text-white',
          titleColor: 'text-white',
          subtitleColor: 'text-indigo-400',
          textColor: 'text-slate-300',
          cardBg: 'bg-slate-800 border-slate-700 text-slate-200 shadow-sm',
          badgeBg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
          dividerColor: 'border-slate-700',
          accentColor: '#818cf8',
          bulletDot: 'bg-indigo-400',
          footerColor: 'text-slate-500',
          tableHeaderBg: 'bg-slate-800 text-indigo-300 border-slate-700',
          tableCellBorder: 'border-slate-800',
        };
      case 'obsidian-emerald':
        return {
          canvasBg: 'bg-[#06110d] text-emerald-100',
          titleColor: 'text-white',
          subtitleColor: 'text-emerald-400',
          textColor: 'text-emerald-200/90',
          cardBg: 'bg-[#0d221a] border-emerald-900/60 text-emerald-100 shadow-sm',
          badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
          dividerColor: 'border-emerald-900/60',
          accentColor: '#10b981',
          bulletDot: 'bg-emerald-400',
          footerColor: 'text-emerald-600',
          tableHeaderBg: 'bg-[#0d221a] text-emerald-300 border-emerald-900',
          tableCellBorder: 'border-emerald-950',
        };
      case 'warm-paper':
        return {
          canvasBg: 'bg-[#fbf9f4] text-stone-900',
          titleColor: 'text-stone-900',
          subtitleColor: 'text-amber-700',
          textColor: 'text-stone-700',
          cardBg: 'bg-stone-100/90 border-stone-300 text-stone-800 shadow-sm',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
          dividerColor: 'border-stone-300',
          accentColor: '#b45309',
          bulletDot: 'bg-amber-700',
          footerColor: 'text-stone-500',
          tableHeaderBg: 'bg-stone-200 text-stone-900 border-stone-300',
          tableCellBorder: 'border-stone-200',
        };
    }
  };

  const themeStyle = getThemeStyles(slideTheme);
  const currentSlide: PptxSlide | null = doc ? doc.slides[currentSlideIndex] : null;
  const currentFontFamily = FONT_MAP[selectedFont].family;

  // Filter slides if searching
  const filteredSlideIndices = useMemo(() => {
    if (!doc || !searchQuery.trim()) {
      return doc ? doc.slides.map((_, idx) => idx) : [];
    }
    const q = searchQuery.toLowerCase();
    return doc.slides
      .map((s, idx) => {
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesSubtitle = s.subtitle?.toLowerCase().includes(q);
        const matchesTexts = s.texts.some((t) => t.toLowerCase().includes(q));
        const matchesNotes = s.notes?.toLowerCase().includes(q);
        return matchesTitle || matchesSubtitle || matchesTexts || matchesNotes ? idx : -1;
      })
      .filter((idx) => idx !== -1);
  }, [doc, searchQuery]);

  // Convert points array to smooth SVG path string
  const pointsToSvgPath = (points: DrawPoint[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // ----------------------------------------------------
  // HIGH-QUALITY SLIDE RENDERING (IN FIXED COORDINATES)
  // ----------------------------------------------------
  const renderSlideContent = (slide: PptxSlide, isThumbnail = false) => {
    const isTitleSlide = slide.slideNumber === 1 || slide.layoutType === 'title';
    const isTwoColumn = slide.layoutType === 'two-column' || (slide.texts.length >= 4 && !slide.tables);
    const hasTable = slide.tables && slide.tables.length > 0;
    const hasImages = slide.images && slide.images.length > 0;

    const baseTextStyle: React.CSSProperties = {
      fontFamily: currentFontFamily,
      letterSpacing: 'normal',
      lineHeight: '1.45',
      fontSize: `${16 * fontScaleMultiplier}px`,
    };

    if (isTitleSlide) {
      return (
        <div
          style={baseTextStyle}
          className="w-full h-full flex flex-col justify-between p-12 lg:p-16 relative overflow-hidden select-text"
        >
          {/* Top category / deck badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${themeStyle.badgeBg}`}
              >
                PRESENTATION BRIEFING
              </span>
              <span className={`text-xs font-semibold ${themeStyle.footerColor}`}>
                SLIDE {slide.slideNumber} OF {doc?.slides.length || 1}
              </span>
            </div>
            <div className={`text-xs font-mono font-medium ${themeStyle.footerColor}`}>
              {activeRatioKey} CANVAS
            </div>
          </div>

          {/* Centered Presentation Main Title */}
          <div className="my-auto space-y-6 max-w-4xl">
            <div className="space-y-3">
              <h1
                style={{ fontSize: `${42 * fontScaleMultiplier}px` }}
                className={`font-black leading-tight tracking-tight ${themeStyle.titleColor}`}
              >
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p
                  style={{ fontSize: `${22 * fontScaleMultiplier}px` }}
                  className={`font-normal leading-relaxed max-w-3xl ${themeStyle.subtitleColor}`}
                >
                  {slide.subtitle}
                </p>
              )}
            </div>

            {slide.texts.length > 0 && (
              <div className="pt-4 flex flex-wrap gap-3">
                {slide.texts.map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium ${themeStyle.cardBg} flex items-center gap-2`}
                  >
                    <div className={`w-2 h-2 rounded-full ${themeStyle.bulletDot}`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Metadata */}
          <div
            className={`pt-6 border-t ${themeStyle.dividerColor} flex items-center justify-between text-xs font-medium ${themeStyle.footerColor}`}
          >
            <span>{doc?.title || fileName}</span>
            <span className="uppercase font-mono tracking-wider">CONFIDENTIAL &amp; PROPRIETARY</span>
          </div>
        </div>
      );
    }

    // Standard Slide with Content, Columns, or Tables
    return (
      <div
        style={baseTextStyle}
        className="w-full h-full flex flex-col justify-between p-10 lg:p-14 relative overflow-hidden select-text"
      >
        {/* Slide Header */}
        <div className={`pb-4 border-b ${themeStyle.dividerColor} flex items-center justify-between gap-4`}>
          <div className="space-y-1">
            <h2
              style={{ fontSize: `${30 * fontScaleMultiplier}px` }}
              className={`font-bold leading-snug tracking-tight ${themeStyle.titleColor}`}
            >
              {slide.title}
            </h2>
            <div className={`text-xs font-bold uppercase tracking-wider ${themeStyle.subtitleColor}`}>
              SECTION {slide.slideNumber} • {fileName}
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-md text-xs font-bold border shrink-0 ${themeStyle.badgeBg}`}>
            #{slide.slideNumber}
          </span>
        </div>

        {/* Slide Body Content */}
        <div className="flex-1 my-6 flex flex-col justify-center overflow-hidden">
          {hasTable ? (
            /* Table Rendering */
            <div className="space-y-4 overflow-hidden">
              {slide.tables?.map((table, tIdx) => (
                <div key={tIdx} className="overflow-x-auto rounded-lg border border-slate-300/40 shadow-sm">
                  <table className="w-full text-left text-sm border-collapse">
                    {table.headers && (
                      <thead>
                        <tr className={themeStyle.tableHeaderBg}>
                          {table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-4 py-2.5 font-bold border-b border-slate-300/40">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {table.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`${
                            rIdx % 2 === 0 ? 'bg-transparent' : 'bg-black/5 dark:bg-white/5'
                          } border-b ${themeStyle.tableCellBorder}`}
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-2.5 text-xs font-medium">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {slide.texts.length > 0 && (
                <div className="pt-2 text-xs opacity-80">
                  {slide.texts.map((t, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {t}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : isTwoColumn ? (
            /* Two Column Cards */
            <div className="grid grid-cols-2 gap-5">
              {slide.texts.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${themeStyle.cardBg} flex items-start gap-3.5 shadow-sm`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${themeStyle.bulletDot}`} />
                  <div
                    style={{ fontSize: `${15 * fontScaleMultiplier}px` }}
                    className={`leading-relaxed font-medium ${themeStyle.textColor}`}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single Column List */
            <div className="space-y-3.5 max-w-4xl">
              {slide.texts.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${themeStyle.cardBg} flex items-start gap-3.5 shadow-sm`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${themeStyle.bulletDot}`} />
                  <span
                    style={{ fontSize: `${16 * fontScaleMultiplier}px` }}
                    className={`leading-relaxed font-medium ${themeStyle.textColor}`}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Embedded Slide Images (if any parsed) */}
          {hasImages && !isThumbnail && (
            <div className="mt-4 flex items-center gap-3 overflow-x-auto">
              {slide.images?.map((imgUrl, iIdx) => (
                <img
                  key={iIdx}
                  src={imgUrl}
                  alt={`Slide ${slide.slideNumber} image ${iIdx + 1}`}
                  className="max-h-32 rounded-lg border border-slate-400/30 object-contain shadow-md"
                />
              ))}
            </div>
          )}
        </div>

        {/* Slide Footer */}
        <div
          className={`pt-4 border-t ${themeStyle.dividerColor} flex items-center justify-between text-xs font-medium ${themeStyle.footerColor}`}
        >
          <span>{doc?.title || fileName}</span>
          <span>
            Slide {slide.slideNumber} of {doc?.slides.length || 1}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#080b12] border border-[#1E2536] rounded-lg flex flex-col overflow-hidden shadow-2xl transition-all ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen border-none bg-black' : 'min-h-[620px]'
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* TOP HEADER CONTROLS BAR (FULL SUITE OF OPTIONS)      */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#0d121f] border-b border-[#1E2536] gap-2 text-xs">
        {/* Left: Document Info & Detection Tag */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Presentation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xs truncate max-w-[170px] sm:max-w-xs">{fileName}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                {activeRatioKey} DECK
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
              <span>{doc?.slides.length || 0} Slides</span>
              <span>•</span>
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">RAM-Sandboxed</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Tools & Advanced Mode Dropdown */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View Mode Toggle Tabs */}
          <div className="flex bg-[#141a29] p-0.5 rounded-md border border-[#1E2536]">
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('stage');
              }}
              title="Stage View (Single Slide Fit)"
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'stage'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Stage</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('dual');
              }}
              title="Dual Presenter View (Current + Next Slide + Timer + Notes)"
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'dual'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Presenter</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('grid');
              }}
              title="Slide Sorter Grid"
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setViewMode('outline');
              }}
              title="Document Outline Reader"
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === 'outline'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Outline</span>
            </button>
          </div>

          {/* Aspect Ratio Switcher (Auto, 16:9, 4:3, 16:10) */}
          <div className="flex items-center bg-[#141a29] px-2 py-1 rounded-md border border-[#1E2536]">
            <Ratio className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
            <select
              value={aspectRatioMode}
              onChange={(e) => {
                playCyberBeep('click');
                setAspectRatioMode(e.target.value as AspectRatioMode);
              }}
              title="Set Presentation Canvas Aspect Ratio"
              className="bg-transparent text-white text-[11px] font-mono font-bold outline-none cursor-pointer"
            >
              <option value="auto" className="bg-[#0f1422] text-white">
                Auto ({doc?.detectedRatio || '16:9'})
              </option>
              <option value="16:9" className="bg-[#0f1422] text-white">
                16:9 Widescreen
              </option>
              <option value="4:3" className="bg-[#0f1422] text-white">
                4:3 Standard
              </option>
              <option value="16:10" className="bg-[#0f1422] text-white">
                16:10 Display
              </option>
            </select>
          </div>

          {/* Advanced Presentation Options Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
              title="Advanced Presentation View Options & Settings"
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                showAdvancedMenu
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-[#141a29] hover:bg-[#1f273e] text-slate-200 border-[#1E2536]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Advanced</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Advanced Settings Dropdown Drawer */}
            {showAdvancedMenu && (
              <div className="absolute right-0 top-full mt-1.5 bg-[#0f1422] border border-[#1E2536] rounded-lg shadow-2xl p-3.5 z-40 w-72 space-y-3.5 text-xs text-slate-200">
                <div className="flex items-center justify-between border-b border-[#1E2536] pb-2 font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Presentation Options
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedMenu(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Typography Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <Type className="w-3 h-3 text-amber-400" />
                    Slide Typography
                  </label>
                  <select
                    value={selectedFont}
                    onChange={(e) => {
                      playCyberBeep('click');
                      setSelectedFont(e.target.value as SlideFont);
                    }}
                    className="w-full bg-[#161c2d] border border-[#1E2536] rounded p-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    {Object.entries(FONT_MAP).map(([key, info]) => (
                      <option key={key} value={key} className="bg-[#0f1422] text-white">
                        {info.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Sizing Scale */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Text Scale ({Math.round(fontScaleMultiplier * 100)}%)
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      [0.85, '85%'],
                      [1.0, '100%'],
                      [1.15, '115%'],
                      [1.3, '130%'],
                    ].map(([scale, label]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          playCyberBeep('click');
                          setFontScaleMultiplier(scale as number);
                        }}
                        className={`py-1 rounded text-[11px] font-medium border text-center cursor-pointer ${
                          fontScaleMultiplier === scale
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-[#161c2d] text-slate-300 border-[#1E2536] hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slide Themes */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-amber-400" />
                    Canvas Theme
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {(
                      [
                        ['clean-light', 'Clean Light'],
                        ['modern-dark', 'Modern Dark'],
                        ['midnight-navy', 'Midnight Navy'],
                        ['executive-slate', 'Executive Slate'],
                        ['obsidian-emerald', 'Obsidian Matrix'],
                        ['warm-paper', 'Warm Paper'],
                      ] as [SlideTheme, string][]
                    ).map(([t, label]) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          playCyberBeep('click');
                          setSlideTheme(t);
                        }}
                        className={`p-1.5 rounded text-left border flex items-center justify-between cursor-pointer ${
                          slideTheme === t
                            ? 'bg-amber-500/20 text-amber-300 font-bold border-amber-500/50'
                            : 'bg-[#161c2d] text-slate-300 border-[#1E2536] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        {slideTheme === t && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-Play Timing */}
                <div className="space-y-1 pt-1 border-t border-[#1E2536]">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Slideshow Interval ({autoPlayIntervalSec}s)
                  </label>
                  <div className="flex gap-1">
                    {[3, 5, 8, 12, 20].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          playCyberBeep('click');
                          setAutoPlayIntervalSec(sec);
                        }}
                        className={`flex-1 py-1 rounded text-[11px] font-mono border text-center cursor-pointer ${
                          autoPlayIntervalSec === sec
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-[#161c2d] text-slate-300 border-[#1E2536]'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slideshow Auto-Play Toggle */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setIsAutoPlaying(!isAutoPlaying);
            }}
            title={isAutoPlaying ? 'Pause Slideshow' : 'Start Auto Slideshow'}
            className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border transition-colors cursor-pointer ${
              isAutoPlaying
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#141a29] hover:bg-[#1f273e] text-slate-300 border-[#1E2536]'
            }`}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isAutoPlaying ? 'Playing' : 'Slideshow'}</span>
          </button>

          {/* Dedicated Window Popout Toggle */}
          {onToggleDedicatedWindow && (
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                onToggleDedicatedWindow();
              }}
              title={isDedicatedWindow ? 'Return to Sandbox Tab' : 'Open Dedicated Window Stage'}
              className="p-1.5 rounded-md bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Mode */}
          <button
            type="button"
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Fullscreen' : 'Present Fullscreen (Press F)'}
            className="p-1.5 rounded-md bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-slate-200 cursor-pointer"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECONDARY TOOLBAR: ZOOM, ANNOTATION & NAVIGATION     */}
      {/* ---------------------------------------------------- */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#090d16] border-b border-[#1E2536] flex items-center justify-between gap-2 text-xs flex-wrap">
        {/* Left: Navigation Controls & Slide Selector */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={!doc || currentSlideIndex === 0}
            title="Previous Slide (Left Arrow)"
            className="px-2 py-1 rounded bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {doc && (
            <select
              value={currentSlideIndex}
              onChange={(e) => {
                playCyberBeep('click');
                setCurrentSlideIndex(Number(e.target.value));
              }}
              className="bg-[#141a29] border border-[#1E2536] text-white rounded px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
            >
              {doc.slides.map((s, idx) => (
                <option key={s.slideNumber} value={idx}>
                  Slide {idx + 1}: {s.title.slice(0, 24)}...
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleNextSlide}
            disabled={!doc || currentSlideIndex === (doc?.slides.length || 1) - 1}
            title="Next Slide (Right Arrow / Space)"
            className="px-2 py-1 rounded bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 font-bold text-xs cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Meeting Stopwatch */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-[#141a29] border border-[#1E2536] text-slate-300 font-mono text-[11px]">
            <Timer className="w-3 h-3 text-amber-400" />
            <span>{formatTimer(timerSeconds)}</span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerSeconds(0);
                setIsTimerRunning(false);
              }}
              title="Reset Timer"
              className="text-slate-500 hover:text-white cursor-pointer ml-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Right: Interactive Presenter Tools (Laser, Pen, Highlighter, Zoom) */}
        <div className="flex items-center gap-1.5">
          {/* Virtual Laser Pointer */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setActiveTool(activeTool === 'laser' ? 'none' : 'laser');
            }}
            title="Virtual Laser Pointer (Press L)"
            className={`p-1.5 rounded text-xs border transition-colors cursor-pointer ${
              activeTool === 'laser'
                ? 'bg-rose-600 text-white font-bold border-rose-400 shadow-[0_0_12px_#ff0055]'
                : 'bg-[#141a29] text-slate-300 border-[#1E2536] hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Live Drawing Pen */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setActiveTool(activeTool === 'pen' ? 'none' : 'pen');
            }}
            title="Slide Drawing Pen"
            className={`p-1.5 rounded text-xs border transition-colors cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#141a29] text-slate-300 border-[#1E2536] hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>

          {/* Highlighter */}
          <button
            type="button"
            onClick={() => {
              playCyberBeep('click');
              setActiveTool(activeTool === 'highlighter' ? 'none' : 'highlighter');
            }}
            title="Slide Highlighter"
            className={`p-1.5 rounded text-xs border transition-colors cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-yellow-400 text-slate-950 font-bold border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                : 'bg-[#141a29] text-slate-300 border-[#1E2536] hover:text-white'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Annotation Color Palette (when pen or highlighter active) */}
          {(activeTool === 'pen' || activeTool === 'highlighter') && (
            <div className="flex items-center gap-1 bg-[#141a29] p-1 rounded border border-[#1E2536]">
              {['#ef4444', '#00F0FF', '#eab308', '#22c55e', '#a855f7'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${
                    penColor === c ? 'ring-2 ring-white scale-110' : 'border-transparent'
                  }`}
                />
              ))}
              <button
                type="button"
                onClick={handleUndoAnnotation}
                title="Undo last stroke"
                className="p-0.5 text-slate-400 hover:text-white cursor-pointer ml-1"
              >
                <Undo2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleClearAnnotations}
                title="Clear slide drawings"
                className="p-0.5 text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Zoom Slider Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#141a29] px-2 py-0.5 rounded border border-[#1E2536] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              title="Zoom Out"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center font-bold text-slate-300">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(250, z + 10))}
              title="Zoom In"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="text-[10px] text-amber-400 hover:text-amber-300 ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Copy Slide Text */}
          <button
            type="button"
            onClick={handleCopySlideText}
            title="Copy current slide text"
            className="p-1.5 rounded bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 hover:text-white cursor-pointer relative"
          >
            {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MAIN PRESENTATION BODY (STAGE, DUAL, GRID, OUTLINE)  */}
      {/* ---------------------------------------------------- */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-3 text-slate-400">
          <Presentation className="w-10 h-10 text-amber-400 animate-pulse" />
          <span className="text-xs font-medium font-mono">
            Decoding PowerPoint OpenXML container into volatile RAM...
          </span>
        </div>
      ) : error || !doc ? (
        <div className="p-12 text-center space-y-3">
          <Presentation className="w-12 h-12 mx-auto text-amber-400/60" />
          <h3 className="text-white font-bold text-sm">PowerPoint Presentation Protected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error || 'Unable to decode presentation.'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ---------------------------------------------------- */
        /* VIEW MODE: SLIDE SORTER GRID                         */
        /* ---------------------------------------------------- */
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[720px] bg-[#06080e] space-y-4">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-[#1E2536] pb-3 gap-2">
            <span className="font-bold text-slate-200 font-mono">
              Slide Sorter Overview ({doc.slides.length} slides • {activeRatioKey})
            </span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search slides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#101524] border border-[#1E2536] rounded-md pl-8 pr-3 py-1 text-xs text-white outline-none focus:border-amber-400 w-44"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSlideIndices.map((idx) => {
              const s = doc.slides[idx];
              return (
                <div
                  key={s.slideNumber}
                  onClick={() => {
                    playCyberBeep('click');
                    setCurrentSlideIndex(idx);
                    setViewMode('stage');
                  }}
                  className={`group cursor-pointer rounded-xl border transition-all overflow-hidden relative shadow-lg ${
                    idx === currentSlideIndex
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                      : 'border-[#1E2536] hover:border-amber-400/60 bg-[#0d121f]'
                  }`}
                >
                  {/* Miniature Scaled Preview with Exact Aspect Ratio */}
                  <div
                    style={{
                      aspectRatio: activeRatioKey === '4:3' ? '4/3' : activeRatioKey === '16:10' ? '16/10' : '16/9',
                    }}
                    className={`w-full overflow-hidden ${themeStyle.canvasBg} relative`}
                  >
                    {/* Fixed Virtual Rendering scaled into thumb */}
                    <div
                      style={{
                        width: `${virtualDims.width}px`,
                        height: `${virtualDims.height}px`,
                        transform: `scale(${340 / virtualDims.width})`,
                        transformOrigin: 'top left',
                      }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      {renderSlideContent(s, true)}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0e1320] border-t border-[#1E2536] flex items-center justify-between text-xs">
                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                      #{s.slideNumber}: {s.title}
                    </span>
                    {s.notes && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono shrink-0">
                        Notes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'outline' ? (
        /* ---------------------------------------------------- */
        /* VIEW MODE: DOCUMENT OUTLINE READER                   */
        /* ---------------------------------------------------- */
        <div className="p-6 sm:p-10 overflow-y-auto max-h-[720px] bg-[#06080e] space-y-8 max-w-4xl mx-auto">
          <div className="border-b border-[#1E2536] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{doc.title || fileName}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Executive Document Briefing • {doc.slides.length} Slides Decoded
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySlideText}
              className="px-3 py-1.5 rounded bg-[#141a29] hover:bg-[#1f273e] border border-[#1E2536] text-amber-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Full Outline</span>
            </button>
          </div>

          <div className="space-y-6">
            {doc.slides.map((s, idx) => (
              <div
                key={s.slideNumber}
                className="p-6 rounded-xl border border-[#1E2536] bg-[#0c101b] space-y-3 relative shadow-md hover:border-amber-400/50 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-[#1E2536] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold text-xs border border-amber-500/40">
                      SLIDE {s.slideNumber}
                    </span>
                    <h3 className="text-base font-bold text-white">{s.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSlideIndex(idx);
                      setViewMode('stage');
                    }}
                    className="text-xs text-slate-400 hover:text-amber-400 underline cursor-pointer"
                  >
                    View on Stage →
                  </button>
                </div>

                {s.subtitle && <p className="text-sm text-sky-400 italic">{s.subtitle}</p>}

                <div className="space-y-2 pt-1">
                  {s.texts.map((t, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>

                {s.notes && (
                  <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-xs text-sky-200 mt-3 space-y-1">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-sky-400 font-mono">
                      Speaker Notes:
                    </span>
                    <p className="leading-relaxed">{s.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'dual' ? (
        /* ---------------------------------------------------- */
        /* VIEW MODE: DUAL PRESENTER COCKPIT                    */
        /* ---------------------------------------------------- */
        <div className="flex-1 bg-[#05070c] p-3 sm:p-6 overflow-auto flex flex-col lg:flex-row gap-5">
          {/* Main Presenter Stage on Left */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-xs font-mono font-bold text-slate-400 mb-2 flex items-center justify-between w-full max-w-3xl">
              <span className="text-amber-400">● LIVE BROADCAST STAGE</span>
              <span>
                Slide {currentSlideIndex + 1} / {doc.slides.length}
              </span>
            </div>

            {/* Mathematically Fitted Virtual Canvas */}
            <div
              style={{
                width: `${virtualDims.width * computedScale * 0.85}px`,
                height: `${virtualDims.height * computedScale * 0.85}px`,
              }}
              className="relative rounded-xl overflow-hidden shadow-2xl border border-black/40"
            >
              <div
                style={{
                  width: `${virtualDims.width}px`,
                  height: `${virtualDims.height}px`,
                  transform: `scale(${computedScale * 0.85})`,
                  transformOrigin: 'top left',
                }}
                className={`absolute inset-0 ${themeStyle.canvasBg}`}
              >
                {currentSlide && renderSlideContent(currentSlide)}
              </div>
            </div>
          </div>

          {/* Next Slide Preview & Notes on Right */}
          <div className="w-full lg:w-96 flex flex-col gap-4 bg-[#0b0f1a] p-4 rounded-xl border border-[#1E2536]">
            {/* Next Slide Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 font-mono">
                <span className="text-sky-400">UP NEXT →</span>
                <span>
                  Slide {Math.min(doc.slides.length, currentSlideIndex + 2)} of {doc.slides.length}
                </span>
              </div>

              {currentSlideIndex < doc.slides.length - 1 ? (
                <div
                  style={{
                    aspectRatio: activeRatioKey === '4:3' ? '4/3' : activeRatioKey === '16:10' ? '16/10' : '16/9',
                  }}
                  className={`w-full rounded-lg overflow-hidden border border-[#1E2536] relative ${themeStyle.canvasBg}`}
                >
                  <div
                    style={{
                      width: `${virtualDims.width}px`,
                      height: `${virtualDims.height}px`,
                      transform: `scale(${320 / virtualDims.width})`,
                      transformOrigin: 'top left',
                    }}
                    className="absolute inset-0 pointer-events-none opacity-80"
                  >
                    {renderSlideContent(doc.slides[currentSlideIndex + 1], true)}
                  </div>
                </div>
              ) : (
                <div className="h-32 rounded-lg border border-dashed border-[#1E2536] flex items-center justify-center text-xs text-slate-500">
                  End of Presentation Deck
                </div>
              )}
            </div>

            {/* Live Speaker Notes */}
            <div className="flex-1 flex flex-col space-y-2 pt-2 border-t border-[#1E2536]">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  CONFIDENTIAL PRESENTER NOTES
                </span>
              </div>
              <div className="flex-1 bg-[#101524] p-3 rounded-lg border border-[#1E2536] text-xs text-slate-300 leading-relaxed overflow-y-auto max-h-48">
                {currentSlide?.notes ? (
                  <p>{currentSlide.notes}</p>
                ) : (
                  <p className="text-slate-500 italic">No speaker notes recorded for this slide.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------- */
        /* VIEW MODE: PRIMARY SINGLE STAGE (PERFECT FIT ENGINE) */
        /* ---------------------------------------------------- */
        <div className="flex flex-col md:flex-row flex-1 bg-[#05070c] overflow-hidden relative">
          {/* Left Slide Thumbnails Filmstrip */}
          {showThumbnails && !isFullScreen && (
            <div className="w-full md:w-60 bg-[#0a0d16] border-r border-[#1E2536] flex flex-col overflow-y-auto p-2.5 gap-2.5 shrink-0 max-h-[640px]">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider font-mono">
                <span>Slides ({doc.slides.length})</span>
                <button
                  type="button"
                  onClick={() => setShowThumbnails(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Hide
                </button>
              </div>

              {doc.slides.map((s, idx) => {
                const isSelected = idx === currentSlideIndex;
                return (
                  <button
                    key={s.slideNumber}
                    type="button"
                    onClick={() => {
                      playCyberBeep('click');
                      setCurrentSlideIndex(idx);
                    }}
                    className={`rounded-xl p-2 text-left transition-all border cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
                        : 'border-[#1E2536] bg-[#0e1320] hover:bg-[#141b2e] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={isSelected ? 'text-amber-400' : 'text-slate-400'}>#{s.slideNumber}</span>
                      <span className="text-slate-300 font-normal truncate max-w-[120px]">{s.title}</span>
                    </div>

                    {/* Miniature Aspect Ratio Preview */}
                    <div
                      style={{
                        aspectRatio: activeRatioKey === '4:3' ? '4/3' : activeRatioKey === '16:10' ? '16/10' : '16/9',
                      }}
                      className={`w-full rounded-md overflow-hidden relative ${themeStyle.canvasBg} border border-black/20`}
                    >
                      <div
                        style={{
                          width: `${virtualDims.width}px`,
                          height: `${virtualDims.height}px`,
                          transform: `scale(${220 / virtualDims.width})`,
                          transformOrigin: 'top left',
                        }}
                        className="absolute inset-0 pointer-events-none"
                      >
                        {renderSlideContent(s, true)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Center: Stage Viewport with Precise Geometric Fitting */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {!showThumbnails && !isFullScreen && (
              <button
                type="button"
                onClick={() => setShowThumbnails(true)}
                className="absolute top-2 left-2 z-20 px-2 py-1 rounded bg-[#141a29]/90 backdrop-blur hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 text-[11px] font-medium cursor-pointer shadow-lg"
              >
                ← Show Filmstrip
              </button>
            )}

            {/* Dynamic Sizing Stage Container */}
            <div
              ref={stageContainerRef}
              className="flex-1 w-full h-full p-2 sm:p-4 overflow-hidden flex items-center justify-center bg-[#05070c] relative"
            >
              {currentSlide && (
                <div
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onMouseLeave={() => {
                    setLaserPos(null);
                    if (isDrawing) handlePointerUp();
                  }}
                  style={{
                    width: `${virtualDims.width * computedScale}px`,
                    height: `${virtualDims.height * computedScale}px`,
                    cursor:
                      activeTool === 'laser'
                        ? 'none'
                        : activeTool === 'pen' || activeTool === 'highlighter'
                        ? 'crosshair'
                        : 'default',
                  }}
                  className={`relative shrink-0 select-text overflow-hidden rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/10 ${themeStyle.canvasBg}`}
                >
                  {/* Fixed Virtual Coordinate Canvas scaled to exact stage viewport */}
                  <div
                    style={{
                      width: `${virtualDims.width}px`,
                      height: `${virtualDims.height}px`,
                      transform: `scale(${computedScale})`,
                      transformOrigin: 'top left',
                    }}
                    className="absolute inset-0 select-text"
                  >
                    {renderSlideContent(currentSlide)}
                  </div>

                  {/* SVG Annotation Drawing Layer */}
                  <svg
                    ref={drawingSvgRef}
                    viewBox={`0 0 ${virtualDims.width} ${virtualDims.height}`}
                    className="absolute inset-0 w-full h-full pointer-events-none z-30"
                  >
                    {/* Saved Strokes for this slide */}
                    {(annotations[currentSlideIndex] || []).map((stroke) => (
                      <path
                        key={stroke.id}
                        d={pointsToSvgPath(stroke.points)}
                        stroke={stroke.color}
                        strokeWidth={stroke.size}
                        strokeOpacity={stroke.opacity}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}

                    {/* Current Active Stroke */}
                    {currentStroke && (
                      <path
                        d={pointsToSvgPath(currentStroke.points)}
                        stroke={currentStroke.color}
                        strokeWidth={currentStroke.size}
                        strokeOpacity={currentStroke.opacity}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>

                  {/* Virtual Presenter Laser Pointer */}
                  {activeTool === 'laser' && laserPos && (
                    <div
                      className="absolute pointer-events-none w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_20px_#ff0055,0_0_40px_#ff0055] -translate-x-1/2 -translate-y-1/2 z-40 animate-pulse"
                      style={{
                        left: `${laserPos.x}px`,
                        top: `${laserPos.y}px`,
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Speaker Notes Drawer */}
            {showNotes && currentSlide?.notes && (
              <div className="p-3 bg-[#0d111d] border-t border-[#1E2536] text-xs text-slate-300 flex items-start gap-3 animate-in slide-in-from-bottom duration-200">
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-sky-400 text-[10px] uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Presenter Notes (Slide {currentSlide.slideNumber})</span>
                    <button
                      type="button"
                      onClick={() => setShowNotes(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{currentSlide.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
