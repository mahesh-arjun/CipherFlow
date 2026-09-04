import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Volume2,
  VolumeX,
  HelpCircle,
  Cpu,
  Activity,
  Terminal,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { toggleCyberAudio, isCyberAudioEnabled, playCyberBeep } from '../lib/cyberAudio';
import { CyberGlossaryModal } from './CyberGlossaryModal';
import { CipherFlowLogo } from './CipherFlowLogo';

interface NavbarProps {
  onReplayBoot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReplayBoot }) => {
  const [audioActive, setAudioActive] = useState<boolean>(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);
  const [cyberTime, setCyberTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCyberTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAudioToggle = () => {
    const next = toggleCyberAudio();
    setAudioActive(next);
  };

  return (
    <>
      <header className="border-b border-[#1E2536] bg-[#0A0D15]/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Cyber Brand & Logo */}
          <div className="flex items-center gap-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => {
                playCyberBeep('click');
                if (onReplayBoot) onReplayBoot();
              }}
              title="Click to replay system diagnostics"
            >
              <div className="w-10 h-10 bg-white border border-[#1E2536] group-hover:border-[#CCA43B] rounded-md flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(204,164,59,0.25)] group-hover:shadow-[0_0_24px_rgba(204,164,59,0.5)] transition-all p-0.5 overflow-hidden">
                <CipherFlowLogo size={36} animate={true} />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#CCA43B] rounded-full animate-ping opacity-75"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#CCA43B] rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-display font-extrabold tracking-wider uppercase text-white flex items-center gap-1.5">
                  <span className="text-white">CIPHER</span><span className="text-[#CCA43B]">FLOW</span>
                  <span className="text-[11px] font-mono text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 rounded border border-[#00FF66]/30">
                    v1.0
                  </span>
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-[#121622] text-[#00F0FF] border border-[#1E2536] tracking-wider uppercase">
                  ZERO-LEAK SAFE BOX (.CF)
                </span>
              </div>
              <p className="text-[10px] text-[#8E9299] font-mono tracking-tight flex items-center gap-1.5 mt-0.5">
                <span className="text-[#00FF66]">ARGON2</span> (RFC 9106) // <span className="text-[#00F0FF]">AES-256-GCM</span> STEALTH FILE SUITE
              </p>
            </div>
          </div>

          {/* Cyber Controls, Telemetry & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] uppercase tracking-wider">
            {/* Live Cyber Time Telemetry */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 bg-[#121622] border border-[#1E2536] rounded-sm text-[#A0AEC0] font-mono">
              <Activity className="w-3 h-3 text-[#00F0FF] animate-pulse" />
              <span>SYS_CLOCK: <strong className="text-white">{cyberTime}</strong></span>
            </div>

            {/* Cipher Suite Badge */}
            <div className="hidden sm:flex flex-col items-end font-mono">
              <span className="text-[#8E9299] text-[9px]">ACTIVE CIPHER</span>
              <span className="text-[#00FF66] font-bold text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]"></span>
                AES-256-GCM
              </span>
            </div>

            {/* Replay Boot Sequence Diagnostic */}
            {onReplayBoot && (
              <button
                type="button"
                onClick={() => {
                  playCyberBeep('click');
                  onReplayBoot();
                }}
                className="px-2.5 py-1.5 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-slate-300 hover:text-white border border-[#1E2536] text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Re-run Diagnostic Boot Sequence"
              >
                <RefreshCw className="w-3 h-3 text-[#00F0FF]" />
                <span className="hidden sm:inline">BOOT DIAGNOSTICS</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleAudioToggle}
              className={`px-2.5 py-1.5 rounded-sm border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                audioActive
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'bg-[#121622] border-[#1E2536] text-[#8E9299] hover:text-white hover:border-[#2A334A]'
              }`}
              title={audioActive ? 'Cyber Sound FX: Enabled' : 'Cyber Sound FX: Muted'}
            >
              {audioActive ? <Volume2 className="w-3.5 h-3.5 text-[#00F0FF]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{audioActive ? 'FX: ON' : 'FX: OFF'}</span>
            </button>

            {/* User-Friendly Cyber Glossary & Guide Button */}
            <button
              type="button"
              onClick={() => {
                playCyberBeep('click');
                setIsGlossaryOpen(true);
              }}
              className="px-3 py-1.5 rounded-sm bg-[#090C12] hover:bg-[#121622] text-[#00FF66] hover:text-white border border-[#00FF66]/50 hover:border-[#00FF66] text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,255,102,0.15)] cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#00FF66]" />
              <span>HELP & KEYWORDS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cyber Glossary Modal */}
      <CyberGlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </>
  );
};
