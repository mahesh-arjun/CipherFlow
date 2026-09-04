import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize,
  Image as ImageIcon,
  Sun,
  Eye,
  RefreshCw,
  Sliders,
  Compass,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';

interface ImageLiveViewerProps {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export const ImageLiveViewer: React.FC<ImageLiveViewerProps> = ({
  blob,
  fileName,
  mimeType,
  fileSize,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [opticFilter, setOpticFilter] = useState<'normal' | 'invert' | 'matrix' | 'high-contrast'>('normal');

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setImageUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleZoom = (delta: number) => {
    playCyberBeep('click');
    setScale((prev) => Math.min(Math.max(0.2, prev + delta), 5));
  };

  const handleRotate = (deg: number) => {
    playCyberBeep('click');
    setRotation((prev) => (prev + deg) % 360);
  };

  const handleReset = () => {
    playCyberBeep('click');
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only primary mouse button
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setScale((prev) => Math.min(Math.max(0.2, prev + delta), 5));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOpticStyle = () => {
    if (opticFilter === 'invert') return 'invert';
    if (opticFilter === 'matrix') return 'sepia hue-rotate-[90deg] contrast-150 saturate-200';
    if (opticFilter === 'high-contrast') return 'contrast-200 brightness-110';
    return '';
  };

  return (
    <div className="bg-[#090C12] border border-[#1E2536] rounded-sm flex flex-col overflow-hidden shadow-2xl font-mono select-none">
      {/* Top HUD Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0D1017] border-b border-[#1E2536] text-[10px] gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-[#00FF66]" />
          <span className="text-white font-bold truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.2 rounded bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30 uppercase text-[9px] font-bold">
            IMAGE RASTER
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#8E9299]">
          {imageDims && (
            <span>
              DIMENSIONS: <strong className="text-white">{imageDims.width} × {imageDims.height} px</strong>
            </span>
          )}
          <span>
            ZOOM: <strong className="text-[#00F0FF]">{Math.round(scale * 100)}%</strong>
          </span>
          <span>
            SIZE: <strong className="text-white">{formatBytes(fileSize)}</strong>
          </span>
        </div>
      </div>

      {/* Viewport Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="relative bg-[#05070A] h-[450px] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing checkerboard-bg"
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={fileName}
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className={`max-w-full max-h-full object-contain pointer-events-none ${getOpticStyle()}`}
          />
        )}

        {/* Drag Helper Tip Overlay */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#0D1017]/80 border border-[#1E2536] text-[9px] text-[#8E9299] pointer-events-none backdrop-blur-xs">
          Scroll to Zoom • Drag to Pan Canvas
        </div>
      </div>

      {/* Bottom Controls HUD */}
      <div className="p-2.5 bg-[#0D1017] border-t border-[#1E2536] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleZoom(-0.25)}
            className="p-1.5 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#8E9299] hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="px-2 py-1 text-[11px] font-bold text-white bg-[#090C12] border border-[#1E2536] rounded-sm min-w-[54px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => handleZoom(0.25)}
            className="p-1.5 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#8E9299] hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="px-2 py-1 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#00F0FF] border border-[#1E2536] text-[10px] font-bold transition-colors cursor-pointer ml-1"
          >
            RESET
          </button>
        </div>

        {/* Rotation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRotate(-90)}
            className="p-1.5 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#8E9299] hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleRotate(90)}
            className="p-1.5 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-[#8E9299] hover:text-white border border-[#1E2536] transition-colors cursor-pointer"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <span className="text-[10px] text-[#8E9299] ml-1">
            ROTATION: <strong className="text-white">{rotation}°</strong>
          </span>
        </div>

        {/* Optics Filter Mode */}
        <div className="flex items-center gap-1.5">
          <select
            value={opticFilter}
            onChange={(e) => {
              playCyberBeep('click');
              setOpticFilter(e.target.value as typeof opticFilter);
            }}
            className="bg-[#121622] border border-[#1E2536] text-[10px] text-[#00FF66] rounded-sm px-2 py-1 outline-none cursor-pointer"
          >
            <option value="normal">Optics: Natural</option>
            <option value="invert">Optics: Invert Dark</option>
            <option value="high-contrast">Optics: High Contrast</option>
            <option value="matrix">Optics: Matrix HUD</option>
          </select>
        </div>
      </div>
    </div>
  );
};
