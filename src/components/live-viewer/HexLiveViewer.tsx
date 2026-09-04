import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Binary,
  Layers,
  Sparkles,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';

interface HexLiveViewerProps {
  blob: Blob;
  fileName: string;
  fileSize: number;
}

export const HexLiveViewer: React.FC<HexLiveViewerProps> = ({
  blob,
  fileName,
  fileSize,
}) => {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize] = useState<number>(1024); // 1KB per page for smooth scrolling
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [detectedMagic, setDetectedMagic] = useState<string | null>(null);

  useEffect(() => {
    // Load up to first 64KB for hex analysis
    const slice = blob.slice(0, Math.min(blob.size, 65536));
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const u8 = new Uint8Array(e.target.result);
        setBytes(u8);

        // Detect Magic Signature
        if (u8.length >= 4) {
          if (u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05)) {
            setDetectedMagic('ZIP / JAR / DOCX / APK Archive Container');
          } else if (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46) {
            setDetectedMagic('Adobe Portable Document Format (%PDF)');
          } else if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
            setDetectedMagic('Portable Network Graphics (PNG)');
          } else if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
            setDetectedMagic('JPEG / JFIF Image');
          } else if (u8[0] === 0x1f && u8[1] === 0x8b) {
            setDetectedMagic('GZIP Compressed Data');
          } else if (u8[0] === 0x37 && u8[1] === 0x7a && u8[2] === 0xbc && u8[3] === 0xaf) {
            setDetectedMagic('7-Zip High-Compression Archive');
          } else if (u8[0] === 0x53 && u8[1] === 0x46 && u8[2] === 0x30 && u8[3] === 0x31) {
            setDetectedMagic('CipherFlow v1.0 Encrypted Safe Box (SF01)');
          } else if (u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
            setDetectedMagic('GIF Image Format');
          } else if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
            setDetectedMagic('MP3 Audio with ID3v2 Tag');
          } else if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
            setDetectedMagic('RIFF Container (WAV / AVI / WEBP)');
          } else {
            setDetectedMagic('Generic Binary Stream');
          }
        }
      }
    };
    reader.readAsArrayBuffer(slice);
  }, [blob]);

  const totalPages = useMemo(() => {
    if (!bytes) return 1;
    return Math.max(1, Math.ceil(bytes.length / pageSize));
  }, [bytes, pageSize]);

  // Generate 16-byte rows
  const hexRows = useMemo(() => {
    if (!bytes) return [];
    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, bytes.length);
    const rows = [];

    for (let i = start; i < end; i += 16) {
      const offsetHex = i.toString(16).padStart(8, '0').toUpperCase();
      const chunk = bytes.slice(i, Math.min(i + 16, bytes.length));

      const hexArr = [];
      const asciiArr = [];

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexArr.push(byte.toString(16).padStart(2, '0').toUpperCase());
          // Printable ASCII 32..126
          if (byte >= 32 && byte <= 126) {
            asciiArr.push(String.fromCharCode(byte));
          } else {
            asciiArr.push('·');
          }
        } else {
          hexArr.push('  ');
          asciiArr.push(' ');
        }
      }

      rows.push({
        offset: offsetHex,
        hex: hexArr.join(' '),
        ascii: asciiArr.join(''),
      });
    }

    return rows;
  }, [bytes, currentPage, pageSize]);

  const handleCopyPage = () => {
    const text = hexRows.map((r) => `${r.offset}  ${r.hex}  |${r.ascii}|`).join('\n');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          playCyberBeep('click');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyText(text);
        });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted frames
    }
  };

  const formatBytes = (b: number): string => {
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-[#090C12] border border-[#1E2536] rounded-sm flex flex-col overflow-hidden shadow-2xl font-mono">
      {/* HUD Header */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0D1017] border-b border-[#1E2536] text-[10px] gap-2">
        <div className="flex items-center gap-2">
          <Binary className="w-3.5 h-3.5 text-[#00F0FF]" />
          <span className="text-white font-bold truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.2 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 uppercase text-[9px] font-bold">
            HEX STREAM
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#8E9299]">
          {detectedMagic && (
            <span className="text-[#00FF66] font-bold hidden sm:inline">
              MAGIC: {detectedMagic}
            </span>
          )}
          <span>
            SIZE: <strong className="text-white">{formatBytes(fileSize)}</strong>
          </span>
        </div>
      </div>

      {/* Pagination & Tools */}
      <div className="p-2 bg-[#0D1017] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#121622] px-2 py-1 rounded-sm border border-[#1E2536] text-[10px]">
            <button
              disabled={currentPage === 0}
              onClick={() => {
                playCyberBeep('click');
                setCurrentPage((p) => Math.max(0, p - 1));
              }}
              className="disabled:opacity-30 text-[#8E9299] hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-white px-2">
              PAGE <strong className="text-[#00F0FF]">{currentPage + 1}</strong> / {totalPages} (
              {bytes ? `${bytes.length} bytes loaded` : '0'})
            </span>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => {
                playCyberBeep('click');
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
              }}
              className="disabled:opacity-30 text-[#8E9299] hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleCopyPage}
          className="px-2.5 py-1 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-white border border-[#1E2536] text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-[#00FF66]" /> : <Copy className="w-3 h-3 text-[#00F0FF]" />}
          <span>{copied ? 'HEX COPIED' : 'COPY PAGE HEX'}</span>
        </button>
      </div>

      {/* Hex Stream Dump */}
      <div className="p-3 bg-[#05070A] min-h-[350px] max-h-[500px] overflow-auto text-[11px] leading-relaxed text-[#A0AEC0] select-text">
        <div className="font-mono space-y-1">
          {/* Hex Columns Header */}
          <div className="flex items-center text-[10px] text-[#555E6D] border-b border-[#1E2536] pb-1">
            <span className="w-20 font-bold">OFFSET</span>
            <span className="w-[340px] font-bold">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
            <span className="font-bold pl-4">ASCII DUMP</span>
          </div>

          {hexRows.map((row, idx) => (
            <div key={idx} className="flex items-center hover:bg-[#121622]/60 py-0.5 rounded-xs">
              <span className="w-20 text-[#00F0FF] select-none font-bold text-[10px]">
                {row.offset}
              </span>
              <span className="w-[340px] text-[#E2E8F0] tracking-wider text-[11px]">
                {row.hex}
              </span>
              <span className="pl-4 text-[#00FF66] font-bold text-[11px] select-all border-l border-[#1E2536]/50">
                {row.ascii}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
