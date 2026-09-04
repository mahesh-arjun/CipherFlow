import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { FileCryptoVault } from './components/FileCryptoVault';
import { BootSequence } from './components/BootSequence';
import { ShieldCheck, CheckCircle2, Terminal, Zap, Lock, Sparkles, Cpu } from 'lucide-react';

export default function App() {
  const [showBoot, setShowBoot] = useState<boolean>(() => {
    // Check if user already saw boot this session, but allow first run
    const hasBooted = sessionStorage.getItem('cipherflow_booted');
    return !hasBooted;
  });

  const handleBootComplete = () => {
    sessionStorage.setItem('cipherflow_booted', 'true');
    setShowBoot(false);
  };

  const handleReplayBoot = () => {
    setShowBoot(true);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-[#E2E8F0] font-sans flex flex-col selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] relative overflow-x-hidden">
      {/* Background Cyber Ambient Lights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#00F0FF]/4 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-[#00FF66]/4 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Cyber Navigation Header */}
      <Navbar onReplayBoot={handleReplayBoot} />

      {/* Main Content Area with entrance transition */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4">
        <FileCryptoVault />
      </main>

      {/* Cyber Footer */}
      <footer className="border-t border-[#1E2536] bg-[#0A0D15] py-3.5 mt-auto text-[10px] text-[#8E9299] uppercase tracking-wider shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono">
          <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
            <span className="text-[#00F0FF] font-extrabold flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#00F0FF]" />
              CipherFlow v1.0
            </span>
            <span className="text-[#1E2536]">//</span>
            <span className="text-[#A0AEC0]">
              Argon2 (RFC 9106) Memory-Hard Derivation + AES-256-GCM Zero-Leak Safe Box (.cf) + Ephemeral Live RAM Stream
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-[#00FF66] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CLIENT-SIDE HARDENED</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Opening / Boot Sequence Overlay */}
      <AnimatePresence>
        {showBoot && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>
    </div>
  );
}
