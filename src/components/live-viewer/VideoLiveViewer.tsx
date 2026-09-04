import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  FastForward,
  Film,
  Zap,
  Layers,
  Activity,
  Sliders,
  Flame,
  Clock,
  ShieldAlert,
  Tv,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';

interface VideoLiveViewerProps {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
  onPurgeRam?: () => void;
}

export const VideoLiveViewer: React.FC<VideoLiveViewerProps> = ({
  blob,
  fileName,
  mimeType,
  fileSize,
  onPurgeRam,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [cyberFilter, setCyberFilter] = useState<'normal' | 'cyber-night' | 'high-contrast' | 'matrix'>('normal');
  const [bufferedMb, setBufferedMb] = useState<number>(0);
  const [isFlushingBuffer, setIsFlushingBuffer] = useState<boolean>(false);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [blob]);

  // Track video buffered buffer in RAM
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const interval = setInterval(() => {
      if (v.buffered && v.buffered.length > 0 && duration > 0) {
        let totalBufferedSec = 0;
        for (let i = 0; i < v.buffered.length; i++) {
          totalBufferedSec += v.buffered.end(i) - v.buffered.start(i);
        }
        const fraction = totalBufferedSec / duration;
        const estMb = Math.round(fraction * (fileSize / (1024 * 1024)) * 10) / 10;
        setBufferedMb(Math.max(0.5, estMb));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, fileSize]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    playCyberBeep('click');
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setVideoDimensions({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    playCyberBeep('click');
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRateChange = (rate: number) => {
    playCyberBeep('click');
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    playCyberBeep('click');
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleFlushVideoRam = () => {
    playCyberBeep('lock');
    setIsFlushingBuffer(true);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      // Flush memory buffer
      const savedTime = videoRef.current.currentTime;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();

      setTimeout(() => {
        if (videoRef.current && videoUrl) {
          videoRef.current.src = videoUrl;
          videoRef.current.currentTime = savedTime;
          setIsFlushingBuffer(false);
          playCyberBeep('success');
        }
      }, 350);
    } else {
      setIsFlushingBuffer(false);
    }
  };

  const formatTime = (secs: number): string => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFilterStyle = () => {
    switch (cyberFilter) {
      case 'cyber-night':
        return 'contrast-125 brightness-95 hue-rotate-15 saturate-125';
      case 'high-contrast':
        return 'contrast-150 saturate-110';
      case 'matrix':
        return 'contrast-125 sepia-[.3] hue-rotate-[90deg] saturate-150';
      default:
        return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`bg-[#090C12] border border-[#1E2536] rounded-md flex flex-col overflow-hidden shadow-2xl font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen border-none bg-black' : ''
      }`}
    >
      {/* Top Media Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#0e131f] border-b border-[#1E2536] gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66]">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xs truncate max-w-[200px] sm:max-w-xs">
                {fileName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00FF66]/20 text-[#00FF66] font-bold border border-[#00FF66]/40">
                {videoDimensions ? `${videoDimensions.width}x${videoDimensions.height}` : 'HD VIDEO'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span className="text-slate-300">{mimeType || 'video/mp4'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Volatile RAM Codec</span>
            </div>
          </div>
        </div>

        {/* Video RAM Buffer Telemetry & Flush Action */}
        <div className="flex items-center gap-2">
          {/* Buffer Telemetry */}
          <div className="flex items-center gap-1.5 bg-[#07090f] px-2.5 py-1 rounded border border-[#1E2536] text-[11px] font-mono">
            <Activity className="w-3.5 h-3.5 text-[#00FF66]" />
            <span className="text-slate-400">Video Buffer:</span>
            <span className="text-[#00FF66] font-bold">{bufferedMb} MB</span>
          </div>

          {/* Video RAM Buffer Flush Button */}
          <button
            type="button"
            onClick={handleFlushVideoRam}
            disabled={isFlushingBuffer}
            title="Flush Decoded Frame Buffers from RAM Memory"
            className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/50 text-rose-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Flame className={`w-3.5 h-3.5 text-rose-400 ${isFlushingBuffer ? 'animate-spin' : ''}`} />
            <span>{isFlushingBuffer ? 'Flushing RAM...' : 'Flush Video Buffer'}</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport Stage */}
      <div className="relative bg-black flex items-center justify-center min-h-[300px] sm:min-h-[420px] overflow-hidden group">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            loop={isLooping}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className={`w-full max-h-[540px] object-contain cursor-pointer transition-all ${getFilterStyle()}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
            <Film className="w-10 h-10 text-[#00FF66] animate-pulse" />
            <span className="text-xs font-mono">Allocating volatile video buffer in RAM...</span>
          </div>
        )}

        {/* Big Play Overlay on Pause */}
        {!isPlaying && videoUrl && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#00FF66]/20 border border-[#00FF66] text-[#00FF66] flex items-center justify-center shadow-[0_0_30px_rgba(0,255,102,0.4)] backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer"
          >
            <Play className="w-8 h-8 fill-[#00FF66] ml-1" />
          </button>
        )}
      </div>

      {/* Video Control Bar */}
      <div className="p-3 sm:p-4 bg-[#0e131f] space-y-2.5">
        {/* Timeline Seek Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#161c2d] rounded-lg appearance-none cursor-pointer accent-[#00FF66]"
            />
          </div>
        </div>

        {/* Video Control Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left: Play/Pause, Rewind, Forward */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-[#00FF66] text-slate-950 font-bold hover:bg-[#39FF14] shadow-[0_0_15px_rgba(0,255,102,0.4)] cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              title="Rewind 10s"
              className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.min(duration, currentTime + 10);
              }}
              title="Forward 10s"
              className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
            </button>
          </div>

          {/* Center: Playback Rates & Filter Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Speed Rates */}
            <div className="flex bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRateChange(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    playbackRate === r
                      ? 'bg-[#00FF66] text-slate-950 shadow-[0_0_8px_rgba(0,255,102,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>

            {/* Video Filters */}
            <select
              value={cyberFilter}
              onChange={(e) => {
                playCyberBeep('click');
                setCyberFilter(e.target.value as 'normal' | 'cyber-night' | 'high-contrast' | 'matrix');
              }}
              className="bg-[#161c2d] border border-[#1E2536] text-slate-200 text-[11px] font-medium rounded px-2 py-1 outline-none cursor-pointer"
            >
              <option value="normal">Normal Optics</option>
              <option value="cyber-night">Cyber Night Glow</option>
              <option value="high-contrast">High Contrast</option>
              <option value="matrix">Matrix Phosphor</option>
            </select>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00FF66]" />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1.5 bg-[#161c2d] rounded-lg appearance-none cursor-pointer accent-[#00FF66]"
            />

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded bg-[#161c2d] hover:bg-[#1f273e] border border-[#1E2536] text-slate-200 cursor-pointer ml-1"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
