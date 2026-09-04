import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Zap,
  Lock,
  Terminal,
  CheckCircle2,
  HardDrive,
  Activity,
  Sparkles,
  ChevronRight,
  Eye,
  KeyRound,
  Layers,
  Radio,
} from 'lucide-react';
import { playCyberBeep } from '../lib/cyberAudio';
import { CipherFlowLogo } from './CipherFlowLogo';

interface BootSequenceProps {
  onComplete: () => void;
  isReplay?: boolean;
}

interface BootStep {
  id: string;
  label: string;
  sublabel: string;
  code: string;
  durationMs: number;
}

const BOOT_STEPS: BootStep[] = [
  {
    id: 'crypto_subsystem',
    label: 'INITIALIZING SUBTLECRYPTO CORE',
    sublabel: 'Hardware-accelerated AES-256-GCM authenticated cipher engine',
    code: 'SEC_CORE::AES_GCM_256 [VERIFIED]',
    durationMs: 380,
  },
  {
    id: 'argon2_core',
    label: 'ALLOCATING RFC 9106 ARGON2id MATRIX',
    sublabel: '64MB memory-hard derivation matrix & BLAKE2b entropy vectors',
    code: 'ARGON2ID::65536_KB_VECTORS [ACTIVE]',
    durationMs: 420,
  },
  {
    id: 'ram_sandbox',
    label: 'MOUNTING ZERO-DISK RAM SANDBOX',
    sublabel: 'Ephemeral memory pipeline for PPTX, PDF, Office & Media codecs',
    code: 'RAM_PIPELINE::EPHEMERAL_HEAP [MOUNTED]',
    durationMs: 380,
  },
  {
    id: 'entropy_pool',
    label: 'CALIBRATING CSPRNG ENTROPY POOL',
    sublabel: 'window.crypto.getRandomValues() cryptographic entropy verification',
    code: 'ENTROPY_CSPRNG::256_BIT [100% UNBIASED]',
    durationMs: 350,
  },
  {
    id: 'vault_ready',
    label: 'HARDENED ZERO-LEAK VAULT ONLINE',
    sublabel: 'Client-side isolated cryptographic workstation ready for operation',
    code: 'CIPHERFLOW_VAULT::ONLINE_STANDALONE',
    durationMs: 400,
  },
];

// Potential paths to load the exact uploaded logo image
const LOGO_CANDIDATES = [
  '/WhatsApp Image 2026-09-04 at 2.44.53 PM.jpeg',
  '/WhatsApp%20Image%202026-09-04%20at%202.44.53%20PM.jpeg',
  '/WhatsApp Image 2026-09-04 at 2.44.53 PM.jpg',
  '/WhatsApp%20Image%202026-09-04%20at%202.44.53%20PM.jpg',
  '/logo.jpeg',
  '/logo.jpg',
  '/logo.png',
  '/cipherflow-logo.jpeg',
  '/cipherflow-logo.jpg',
  '/cipherflow-logo-white.png',
  '/cipherflow-logo.png',
];

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete, isReplay = false }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [allocatedKb, setAllocatedKb] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [logoSrcIdx, setLogoSrcIdx] = useState<number>(0);

  // Step progression & animated memory counter
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const memInterval = setInterval(() => {
      setAllocatedKb((prev) => Math.min(65536, prev + 1024));
    }, 30);

    const runStep = (index: number) => {
      if (index >= BOOT_STEPS.length) {
        setProgressPercent(100);
        setAllocatedKb(65536);
        setIsFinished(true);
        playCyberBeep('success');
        timeoutId = setTimeout(() => {
          onComplete();
        }, 450);
        return;
      }

      setCurrentStepIndex(index);
      playCyberBeep('click');
      const targetPercent = Math.round(((index + 1) / BOOT_STEPS.length) * 100);
      setProgressPercent(targetPercent);

      timeoutId = setTimeout(() => {
        runStep(index + 1);
      }, BOOT_STEPS[index].durationMs);
    };

    runStep(0);

    // Keyboard listener for ESC/Space to skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        playCyberBeep('success');
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(memInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  const handleSkip = () => {
    playCyberBeep('success');
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 bg-[#05070B] flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-hidden"
    >
      {/* Background Cybernetic Glow & Ambient Rays */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 cyber-scanlines opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-[#00F0FF]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-[#00FF66]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Center Boot Sequence Card */}
      <div className="relative w-full max-w-2xl bg-[#090C14]/95 border border-[#1E2536] rounded-lg p-6 sm:p-8 shadow-[0_0_100px_rgba(0,240,255,0.18)] backdrop-blur-2xl space-y-6">
        {/* Top Header & Brand Identity */}
        <div className="flex items-center justify-between border-b border-[#1E2536] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-[#CCA43B]/60 flex items-center justify-center p-1 shadow-[0_0_20px_rgba(204,164,59,0.3)] shrink-0 overflow-hidden">
              <img
                src="/cipherflow-logo-white.png"
                alt="CipherFlow Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-wider text-white">
                  CIPHER<span className="text-[#CCA43B]">FLOW</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#00FF66]/15 text-[#00FF66] border border-[#00FF66]/30">
                  SYSTEM READY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                MILITARY-GRADE HARDENED CRYPTO SUITE
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="px-3 py-1.5 rounded bg-[#161C2B] hover:bg-[#20283E] text-slate-300 hover:text-white border border-[#1E2536] text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Skip [ESC]</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#00F0FF]" />
          </button>
        </div>

        {/* Central Display with Exact Logo Image - No artificial changes or alterations */}
        <div className="py-3 flex flex-col items-center justify-center">
          <div className="w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center select-none">
            <img
              src={LOGO_CANDIDATES[logoSrcIdx]}
              onError={() => {
                if (logoSrcIdx < LOGO_CANDIDATES.length - 1) {
                  setLogoSrcIdx((prev) => prev + 1);
                }
              }}
              alt="CipherFlow Official Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-center gap-4 mt-4 font-mono text-xs">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 block">DIAGNOSTICS</span>
              <span className="text-[#00F0FF] font-extrabold tracking-wider">{progressPercent}%</span>
            </div>
            <div className="h-4 w-px bg-[#1E2536]" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 block">RAM ALLOCATION</span>
              <span className="text-[#00FF66] font-extrabold">{allocatedKb.toLocaleString()} KB</span>
            </div>
          </div>
        </div>

        {/* Progress Bar with Cyan/Emerald Gradient */}
        <div className="space-y-1.5">
          <div className="h-2 w-full bg-[#121622] rounded-full overflow-hidden border border-[#1E2536]">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00F0FF] via-[#00FF66] to-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.9)]"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ ease: 'easeOut', duration: 0.25 }}
            />
          </div>
        </div>

        {/* Real-time Checklist of Diagnostic Steps */}
        <div className="space-y-2 bg-[#06080E] p-4 rounded-md border border-[#1E2536]/90 font-mono text-xs">
          {BOOT_STEPS.map((step, idx) => {
            const isPassed = idx < currentStepIndex || (idx === currentStepIndex && isFinished);
            const isCurrent = idx === currentStepIndex && !isFinished;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-2.5 transition-all ${
                  isPassed
                    ? 'text-emerald-400 opacity-100'
                    : isCurrent
                    ? 'text-cyan-300 opacity-100'
                    : 'text-slate-600 opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />
                  ) : isCurrent ? (
                    <Activity className="w-4 h-4 text-[#00F0FF] animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] truncate tracking-wide">
                      {step.label}
                    </span>
                    <span className="text-[10px] uppercase font-mono">
                      {isPassed ? '[OK]' : isCurrent ? '[ACTIVE]' : '[QUEUED]'}
                    </span>
                  </div>
                  {isCurrent && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate">{step.sublabel}</span>
                      <span className="text-[#00F0FF] font-bold font-mono ml-2 shrink-0">{step.code}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Auto-Enter Action */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-ping" />
            <span className="text-slate-300 font-bold">ZERO-DISK EPHEMERAL CLIENT</span>
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[#00F0FF] hover:text-[#33F3FF] hover:underline font-bold cursor-pointer flex items-center gap-1"
          >
            <span>LAUNCH APPLICATION →</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
