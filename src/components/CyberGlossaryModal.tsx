import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Database,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  FileCode,
  Zap,
  Eye,
} from 'lucide-react';

interface CyberGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CyberGlossaryModal: React.FC<CyberGlossaryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const terms = [
    {
      id: 'sf-container',
      title: '.CF Container (Zero-Leak File Box)',
      cyberTag: 'CONTAINER_V1.0',
      color: 'text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/10',
      simpleMeaning: 'A locked digital safe box containing your file.',
      details:
        'CipherFlow packs your file and completely hides its real name and format (.mp4, .pdf, .zip, etc.). An attacker opening or sniffing the .cf file cannot tell if it is a video, audio, or document until the password is provided.',
      icon: <Lock className="w-4 h-4 text-[#00F0FF]" />,
    },
    {
      id: 'passphrase',
      title: 'Secret Master Key (Password)',
      cyberTag: 'ENTROPY_KEY',
      color: 'text-[#00FF66] border-[#00FF66]/30 bg-[#00FF66]/10',
      simpleMeaning: 'The password only you know to unlock the file.',
      details:
        'CipherFlow never saves your password. Instead, it feeds your password into the Argon2 algorithm to generate an unbreakable 256-bit encryption key.',
      icon: <Key className="w-4 h-4 text-[#00FF66]" />,
    },
    {
      id: 'argon2',
      title: 'Argon2 (Memory-Hard Shield)',
      cyberTag: 'RFC_9106_ALGO',
      color: 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10',
      simpleMeaning: 'The world-champion algorithm that stops supercomputers and hackers.',
      details:
        'Winner of the Password Hashing Competition. It forces the computer to allocate physical RAM (e.g. 64 MB), making it mathematically impossible for brute-force hackers using expensive graphics cards (GPUs) or ASIC rigs to guess your password.',
      icon: <Cpu className="w-4 h-4 text-[#FFB800]" />,
    },
    {
      id: 'salt',
      title: 'Defense Salt (Anti-Hacking Code)',
      cyberTag: 'SALT_ENTROPY',
      color: 'text-[#FF0055] border-[#FF0055]/30 bg-[#FF0055]/10',
      simpleMeaning: 'A unique random code blended with your password.',
      details:
        'Even if two users use the exact same password, their defense salts will be totally different. This completely destroys pre-computed "Rainbow Tables" and dictionary attacks.',
      icon: <Layers className="w-4 h-4 text-[#FF0055]" />,
    },
    {
      id: 'aes-gcm',
      title: 'AES-256-GCM (Military-Grade Encryption)',
      cyberTag: 'AUTHENTICATED_CIPHER',
      color: 'text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/10',
      simpleMeaning: 'The gold-standard cipher used by banks and governments.',
      details:
        'GCM (Galois/Counter Mode) provides both confidentiality (nobody can read it) and authentication (detects any tampering or corrupt data immediately).',
      icon: <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />,
    },
    {
      id: 'comparison-hash',
      title: 'Tamper-Proof Digital Seal (Verification Tag)',
      cyberTag: 'PRE_AUTH_HASH',
      color: 'text-[#00FF66] border-[#00FF66]/30 bg-[#00FF66]/10',
      simpleMeaning: 'A quick fingerprint that checks your password before decrypting.',
      details:
        'Embedded in the .cf header. When you type your password to unlock, CipherFlow checks this seal first to ensure the password is correct without damaging or corrupting your payload.',
      icon: <CheckCircle2 className="w-4 h-4 text-[#00FF66]" />,
    },
    {
      id: 'zero-leak',
      title: 'Zero-Leak Metadata',
      cyberTag: 'STEALTH_ARCHITECTURE',
      color: 'text-[#FFB800] border-[#FFB800]/30 bg-[#FFB800]/10',
      simpleMeaning: 'Total invisibility for your file types and timestamps.',
      details:
        'Normal encryption tools leak that a file is a ".mp4" or "secret_tax_form.pdf". CipherFlow locks the filename and MIME type inside the encrypted payload itself.',
      icon: <Sparkles className="w-4 h-4 text-[#FFB800]" />,
    },
    {
      id: 'live-view',
      title: 'Ephemeral Live RAM Safe View',
      cyberTag: 'ZERO_DISK_EXPOSURE',
      color: 'text-[#00FF66] border-[#00FF66]/30 bg-[#00FF66]/10',
      simpleMeaning: 'Safely view videos, audio, photos, or documents without saving unencrypted copies to disk.',
      details:
        'Prevents accidental data leaks caused by forgetting unencrypted files on your computer. When you select Live View, CipherFlow decrypts directly into volatile RAM memory with built-in video players, audio visualizers, image zoom/pan, and document readers, then purges the buffer when done.',
      icon: <Eye className="w-4 h-4 text-[#00FF66]" />,
    },
    {
      id: 'pre-naming',
      title: 'Pre-Decryption Renaming',
      cyberTag: 'RESTORE_OVERRIDE',
      color: 'text-[#00F0FF] border-[#00F0FF]/30 bg-[#00F0FF]/10',
      simpleMeaning: 'Decide what to name your unlocked file before downloading.',
      details:
        'You can either let CipherFlow automatically restore the original name & format, or specify a brand new name before decrypting.',
      icon: <FileCode className="w-4 h-4 text-[#00F0FF]" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
      <div className="bg-[#0D1017] border border-[#00F0FF]/40 rounded-sm w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(0,240,255,0.2)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2536] bg-[#090C12]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-sm bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  CYBER GLOSSARY // USER-FRIENDLY TERMS
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40 uppercase">
                  PLAIN ENGLISH
                </span>
              </div>
              <p className="text-[11px] text-[#8E9299]">
                Everything you need to know about CipherFlow zero-leak file cryptography
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm hover:bg-[#1E2536] text-[#8E9299] hover:text-[#00F0FF] transition-colors border border-transparent hover:border-[#00F0FF]/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Glossary List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 cyber-grid">
          {terms.map((item) => (
            <div
              key={item.id}
              className="bg-[#121622]/90 border border-[#1E2536] hover:border-[#00F0FF]/50 p-3.5 rounded-sm transition-all shadow-sm space-y-2 group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-sm bg-[#090C12] border border-[#1E2536]">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wide group-hover:text-[#00F0FF] transition-colors">
                    {item.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border self-start sm:self-auto ${item.color}`}>
                  {item.cyberTag}
                </span>
              </div>

              <div className="pl-8 space-y-1">
                <div className="text-[11px] font-bold text-[#00FF66] flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#00FF66]" />
                  <span>Simple Definition: {item.simpleMeaning}</span>
                </div>
                <p className="text-[11px] text-[#A0AEC0] leading-relaxed">
                  {item.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1E2536] bg-[#090C12] flex items-center justify-between text-[11px]">
          <span className="text-[#8E9299]">
            CipherFlow v1.0 • Client-side Zero-Knowledge Web Crypto
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm bg-[#00F0FF] hover:bg-[#00d0de] text-[#090C12] font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
          >
            GOT IT / CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
