import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Music,
  Activity,
  Zap,
  Repeat,
  Sparkles,
  Layers,
  Sliders,
  Flame,
  Tv,
  Radio,
  Disc3,
  Gauge,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';

interface AudioLiveViewerProps {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isDedicatedWindow?: boolean;
  onToggleDedicatedWindow?: () => void;
}

export const AudioLiveViewer: React.FC<AudioLiveViewerProps> = ({
  blob,
  fileName,
  mimeType,
  fileSize,
  isDedicatedWindow = false,
  onToggleDedicatedWindow,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visualizerContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [soundLevel, setSoundLevel] = useState<number>(0); // 0 to 100
  const [peakLevel, setPeakLevel] = useState<number>(0);
  const [colorTheme, setColorTheme] = useState<'cyan' | 'matrix' | 'sunset'>('cyan');

  // Peak caps physics for equalizer bars
  const peakCapsRef = useRef<number[]>(new Array(64).fill(0));
  const peakDecayRef = useRef<number[]>(new Array(64).fill(0));

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSoundLevel(0);
    setPeakLevel(0);

    return () => {
      URL.revokeObjectURL(url);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          // ignore
        }
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch {
          // ignore
        }
        analyserRef.current = null;
      }
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
        audioCtxRef.current = null;
      }
    };
  }, [blob]);

  // Setup Web Audio Analyser
  const setupAudioContext = () => {
    if (!audioRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch {
      // Graceful fallback to synthetic high-fps harmonic physics
      analyserRef.current = null;
      sourceRef.current = null;
    }
  };

  // High-FPS Audio Canvas Rendering Engine with Responsive Sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    let lastLevelUpdate = 0;

    const render = (timestamp: number) => {
      // Dynamically sync canvas internal pixel buffer with CSS container width/height
      const container = visualizerContainerRef.current;
      if (container) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = container.getBoundingClientRect();
        const targetWidth = Math.max(300, Math.floor(rect.width * dpr));
        const targetHeight = Math.max(160, Math.floor(rect.height * dpr));

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }
      }

      const width = canvas.width;
      const height = canvas.height;
      phase += 0.05;

      // Dark cyber background
      ctx.fillStyle = '#07090f';
      ctx.fillRect(0, 0, width, height);

      // Background subtle grid lines
      ctx.strokeStyle = 'rgba(30, 37, 54, 0.4)';
      ctx.lineWidth = 1;
      const gridStepX = Math.max(30, Math.floor(width / 24));
      const gridStepY = Math.max(20, Math.floor(height / 10));

      for (let x = 0; x < width; x += gridStepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Collect audio frequency data (Real Analyser or High-Fidelity Synthetic Audio Physics)
      const numBins = 56;
      const freqData = new Uint8Array(numBins);
      const timeData = new Uint8Array(numBins * 2);

      let hasRealData = false;
      let calculatedRms = 0;

      if (analyserRef.current && isPlaying) {
        try {
          const rawFreq = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(rawFreq);
          analyserRef.current.getByteTimeDomainData(timeData);

          let sumSquares = 0;
          for (let i = 0; i < numBins; i++) {
            freqData[i] = rawFreq[i % rawFreq.length];
            sumSquares += freqData[i] * freqData[i];
            if (freqData[i] > 5) hasRealData = true;
          }
          calculatedRms = Math.min(
            100,
            Math.round((Math.sqrt(sumSquares / numBins) / 255) * 100 * (volume / 0.85))
          );
        } catch {
          hasRealData = false;
        }
      }

      // If no audio analyser data is available but audio is playing, synthesize harmonic frequency movement
      if (!hasRealData && isPlaying) {
        const t = (audioRef.current?.currentTime || 0) * 8;
        let sumSquares = 0;
        for (let i = 0; i < numBins; i++) {
          const bass = Math.sin(t * 1.5) * 60 + 120;
          const mid = Math.sin(t * 3.0 + i * 0.2) * 50 + 100;
          const treble = Math.sin(t * 6.0 + i * 0.4) * 40 + 70;
          const noise = Math.sin(phase * 4 + i) * 20;

          const energy =
            i < 12
              ? bass * 0.9 + noise
              : i < 36
              ? mid * 0.8 + noise
              : treble * 0.7 + noise;

          const val = Math.max(10, Math.min(255, energy * volume));
          freqData[i] = val;
          timeData[i] = Math.floor(128 + Math.sin(t * 4 + i * 0.3) * (val / 4));
          sumSquares += val * val;
        }
        calculatedRms = Math.min(
          100,
          Math.round((Math.sqrt(sumSquares / numBins) / 255) * 100)
        );
      } else if (!isPlaying) {
        calculatedRms = 0;
        for (let i = 0; i < numBins; i++) {
          freqData[i] = 4;
          timeData[i] = 128;
        }
      }

      // Update Sound Level 0-100 state throttled at ~20fps for UI performance
      if (timestamp - lastLevelUpdate > 50) {
        lastLevelUpdate = timestamp;
        setSoundLevel(calculatedRms);
        setPeakLevel((prev) => Math.max(calculatedRms, Math.round(prev * 0.94)));
      }

      // -------------------------------------------------------------
      // EQUALIZER SPECTRUM BARS
      // -------------------------------------------------------------
      const barCount = 48;
      const padX = 24;
      const totalBarWidth = width - padX * 2;
      const barWidth = Math.max(3, totalBarWidth / barCount - 4);
      const baseHeight = height * 0.72;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i] || (isPlaying ? 15 : 4);
        const barHeight = Math.max(4, (val / 255) * (baseHeight * 0.85));
        const x = padX + i * (barWidth + 4);
        const y = baseHeight - barHeight;

        // Bar Gradient based on theme
        const grad = ctx.createLinearGradient(0, y, 0, baseHeight);
        if (colorTheme === 'matrix') {
          grad.addColorStop(0, val > 180 ? '#FFFFFF' : '#00FF66');
          grad.addColorStop(0.6, '#00DD55');
          grad.addColorStop(1, 'rgba(0, 255, 102, 0.15)');
        } else if (colorTheme === 'sunset') {
          grad.addColorStop(0, '#FF0055');
          grad.addColorStop(0.5, '#FFB800');
          grad.addColorStop(1, 'rgba(255, 184, 0, 0.15)');
        } else {
          grad.addColorStop(0, val > 200 ? '#FF0077' : val > 140 ? '#00FF66' : '#00F0FF');
          grad.addColorStop(0.6, '#00F0FF');
          grad.addColorStop(1, 'rgba(0, 240, 255, 0.15)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        // Peak Cap Physics
        if (barHeight > (peakCapsRef.current[i] || 0)) {
          peakCapsRef.current[i] = barHeight;
          peakDecayRef.current[i] = 0;
        } else {
          peakDecayRef.current[i] = (peakDecayRef.current[i] || 0) + 0.35;
          peakCapsRef.current[i] = Math.max(
            0,
            (peakCapsRef.current[i] || 0) - peakDecayRef.current[i]
          );
        }

        // Draw Glowing Peak Cap
        const capY = baseHeight - peakCapsRef.current[i] - 3;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = colorTheme === 'matrix' ? '#00FF66' : '#00F0FF';
        ctx.shadowBlur = 8;
        ctx.fillRect(x, Math.max(10, capY), barWidth, 2);
        ctx.shadowBlur = 0;

        // Subtle reflection below baseline
        const reflectHeight = barHeight * 0.22;
        const reflectGrad = ctx.createLinearGradient(0, baseHeight + 2, 0, baseHeight + 2 + reflectHeight);
        reflectGrad.addColorStop(
          0,
          colorTheme === 'matrix' ? 'rgba(0, 255, 102, 0.25)' : 'rgba(0, 240, 255, 0.25)'
        );
        reflectGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = reflectGrad;
        ctx.fillRect(x, baseHeight + 2, barWidth, reflectHeight);
      }

      // Center Baseline
      ctx.strokeStyle = colorTheme === 'matrix' ? 'rgba(0, 255, 102, 0.6)' : 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, baseHeight);
      ctx.lineTo(width - 10, baseHeight);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, volume, colorTheme]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    playCyberBeep('click');
    setupAudioContext();

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    playCyberBeep('click');
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleRateChange = (rate: number) => {
    playCyberBeep('click');
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
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

  return (
    <div
      ref={containerRef}
      className={`bg-[#090C12] border border-[#1E2536] rounded-md flex flex-col overflow-hidden shadow-2xl font-sans transition-all ${
        isDedicatedWindow
          ? 'w-full max-w-4xl mx-auto my-auto min-h-[480px]'
          : 'w-full max-w-4xl mx-auto'
      }`}
    >
      {/* Top Track Information Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-[#0e131f] border-b border-[#1E2536] gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-md bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF]">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-xs truncate max-w-[200px] sm:max-w-xs">
                {fileName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40">
                AUDIO DECODER
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{formatBytes(fileSize)}</span>
              <span>•</span>
              <span className="text-slate-300">{mimeType || 'audio/x-dsp'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Volatile RAM Stream</span>
            </div>
          </div>
        </div>

        {/* Live Sound Level (0 to 100) HUD Gauge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-[#07090f] px-2.5 sm:px-3 py-1.5 rounded-md border border-[#1E2536]">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-bold text-slate-400">SOUND LEVEL</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono font-extrabold text-white">
                  {soundLevel}
                </span>
                <span className="text-[9px] font-mono text-[#00F0FF]">/ 100</span>
              </div>
            </div>

            {/* Sound Level LED Meter Bar (0-100) */}
            <div className="w-20 sm:w-28 h-3 bg-[#121622] rounded-sm p-0.5 border border-[#1E2536] flex items-center gap-0.5 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => {
                const segmentThreshold = (i + 1) * 5; // 5% per segment
                const isActive = soundLevel >= segmentThreshold;
                const isPeak = peakLevel >= segmentThreshold && !isActive;

                let color = 'bg-[#00F0FF]';
                if (i >= 16) color = 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
                else if (i >= 12) color = 'bg-amber-400';
                else if (i >= 6) color = 'bg-[#00FF66]';

                return (
                  <div
                    key={i}
                    className={`h-full flex-1 rounded-xs transition-opacity duration-75 ${
                      isActive
                        ? `${color} opacity-100`
                        : isPeak
                        ? `${color} opacity-40`
                        : 'bg-slate-800/60 opacity-30'
                    }`}
                  />
                );
              })}
            </div>
          </div>

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

      {/* Equalizer Spectrum Header & Theme Switcher Bar */}
      <div className="px-3 sm:px-4 py-1.5 bg-[#0c101a] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#161c2d] border border-[#1E2536] text-[10px] font-mono font-bold text-[#00F0FF]">
            <Disc3 className={`w-3 h-3 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>SPECTRUM EQUALIZER</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Theme:</span>
          <div className="flex bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setColorTheme('cyan');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                colorTheme === 'cyan' ? 'bg-[#00F0FF] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cyan Neon
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setColorTheme('matrix');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                colorTheme === 'matrix' ? 'bg-[#00FF66] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Matrix Green
            </button>
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setColorTheme('sunset');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                colorTheme === 'sunset' ? 'bg-[#FFB800] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sunset Gold
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Visualizer Stage */}
      <div
        ref={visualizerContainerRef}
        className={`relative bg-[#07090f] p-3 flex flex-col items-center justify-center border-b border-[#1E2536] w-full ${
          isDedicatedWindow ? 'h-[280px] sm:h-[340px]' : 'h-[200px] sm:h-[240px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-md block select-none shadow-[0_0_30px_rgba(0,0,0,0.8)]"
        />

        {/* Live Audio Telemetry Badge Overlay */}
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <div className="px-2 py-0.5 rounded bg-[#07090f]/85 backdrop-blur-md border border-[#1E2536] text-[10px] font-mono text-[#00F0FF] flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#00F0FF] animate-pulse" />
            <span>REAL-TIME HARDWARE DSP</span>
          </div>

          <div className="px-2 py-0.5 rounded bg-[#07090f]/85 backdrop-blur-md border border-[#1E2536] text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span>PEAK: </span>
            <strong className="text-white">{peakLevel}%</strong>
          </div>
        </div>
      </div>

      {/* Audio Controls & Playback Toolbar */}
      <div className="p-3 sm:p-4 bg-[#0e131f] space-y-3">
        {/* Seek Track Bar */}
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
              className="w-full h-1.5 bg-[#161c2d] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
            />
          </div>
        </div>

        {/* Main Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left: Playback Rate & Loop Controls */}
          <div className="flex items-center gap-2">
            {/* Speed Rate */}
            <div className="flex bg-[#161c2d] p-0.5 rounded border border-[#1E2536]">
              {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRateChange(r)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    playbackRate === r
                      ? 'bg-[#00F0FF] text-slate-950 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setIsLooping(!isLooping);
              }}
              title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
              className={`p-1.5 rounded border text-xs transition-colors cursor-pointer ${
                isLooping
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(0,255,102,0.2)]'
                  : 'bg-[#161c2d] border-[#1E2536] text-slate-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Play / Pause Big Button & Skip */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 5);
              }}
              title="Rewind 5s"
              className="p-2 rounded bg-[#161c2d] hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className={`p-3 rounded-full font-bold text-slate-950 transition-all cursor-pointer shadow-lg flex items-center justify-center ${
                isPlaying
                  ? 'bg-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.5)] hover:scale-105'
                  : 'bg-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:scale-105'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioRef.current)
                  audioRef.current.currentTime = Math.min(duration, currentTime + 5);
              }}
              title="Forward 5s"
              className="p-2 rounded bg-[#161c2d] hover:bg-[#1f273e] border border-[#1E2536] text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
            </button>
          </div>

          {/* Right: Volume Slider & Mute */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#00F0FF]" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 sm:w-24 h-1.5 bg-[#161c2d] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
            />
            <span className="text-[10px] font-mono text-slate-400 w-8">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        loop={isLooping}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};
