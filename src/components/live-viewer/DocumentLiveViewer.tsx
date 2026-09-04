import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Copy,
  Check,
  Search,
  WrapText,
  Download,
  FileSpreadsheet,
  Terminal,
  Layers,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Table,
} from 'lucide-react';
import { playCyberBeep } from '../../lib/cyberAudio';
import {
  parseDocxBlob,
  parseXlsxBlob,
  DocxDocument,
  XlsxDocument,
} from '../../lib/officeParser';
import { PdfLiveViewer } from './PdfLiveViewer';

interface DocumentLiveViewerProps {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isDedicatedWindow?: boolean;
  onToggleDedicatedWindow?: () => void;
}

export const DocumentLiveViewer: React.FC<DocumentLiveViewerProps> = ({
  blob,
  fileName,
  mimeType,
  fileSize,
  isDedicatedWindow = false,
  onToggleDedicatedWindow,
}) => {
  const [textContent, setTextContent] = useState<string>('');
  const [docxDoc, setDocxDoc] = useState<DocxDocument | null>(null);
  const [xlsxDoc, setXlsxDoc] = useState<XlsxDocument | null>(null);
  const [activeXlsxSheetIdx, setActiveXlsxSheetIdx] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeViewMode, setActiveViewMode] = useState<'text' | 'table' | 'pdf' | 'docx' | 'xlsx'>('text');

  const ext = useMemo(() => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }, [fileName]);

  const isPdf = ext === 'pdf' || mimeType.includes('pdf');
  const isDocx = ['docx', 'doc', 'dotx'].includes(ext) || mimeType.includes('word');
  const isXlsx = ['xlsx', 'xls', 'xlsm', 'ods'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel');
  const isCsv = ['csv', 'tsv'].includes(ext) || mimeType.includes('csv');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setDocxDoc(null);
    setXlsxDoc(null);

    // 1. PDF
    if (isPdf) {
      setActiveViewMode('pdf');
      setIsLoading(false);
      return;
    }

    // 2. DOCX
    if (isDocx) {
      parseDocxBlob(blob)
        .then((doc) => {
          setDocxDoc(doc);
          setActiveViewMode('docx');
          setIsLoading(false);
        })
        .catch(() => {
          readAsRawText();
        });
      return;
    }

    // 3. XLSX
    if (isXlsx) {
      parseXlsxBlob(blob)
        .then((doc) => {
          setXlsxDoc(doc);
          setActiveXlsxSheetIdx(0);
          setActiveViewMode('xlsx');
          setIsLoading(false);
        })
        .catch(() => {
          readAsRawText();
        });
      return;
    }

    // 4. Default Text / CSV
    readAsRawText();

    function readAsRawText() {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextContent(text || '');
        if (isCsv) {
          setActiveViewMode('table');
        } else {
          setActiveViewMode('text');
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError('Unable to decode document stream directly.');
        setIsLoading(false);
      };
      reader.readAsText(blob);
    }
  }, [blob, isPdf, isDocx, isXlsx, isCsv]);

  // If PDF, render PdfLiveViewer directly to avoid Chrome iframe security blocks
  if (isPdf) {
    return (
      <PdfLiveViewer
        blob={blob}
        fileName={fileName}
        fileSize={fileSize}
        isDedicatedWindow={isDedicatedWindow}
        onToggleDedicatedWindow={onToggleDedicatedWindow}
      />
    );
  }

  // CSV parser for tabular view
  const parsedTable = useMemo(() => {
    if (!textContent || (!isCsv && activeViewMode !== 'table')) return null;
    const delimiter = ext === 'tsv' ? '\t' : ',';
    const rawLines = textContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (rawLines.length === 0) return null;

    const headers = rawLines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows = rawLines.slice(1).map((line) => {
      return line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
    });

    return { headers, rows };
  }, [textContent, isCsv, ext, activeViewMode]);

  // Filtered Lines for Code / Text Viewer
  const textLines = useMemo(() => {
    if (!textContent) return [];
    return textContent.split('\n');
  }, [textContent]);

  const filteredLines = useMemo(() => {
    if (!searchTerm) return textLines.map((line, idx) => ({ line, num: idx + 1 }));
    const term = searchTerm.toLowerCase();
    return textLines
      .map((line, idx) => ({ line, num: idx + 1 }))
      .filter((item) => item.line.toLowerCase().includes(term));
  }, [textLines, searchTerm]);

  const handleCopy = () => {
    let copyTarget = textContent;
    if (docxDoc) {
      copyTarget = docxDoc.paragraphs.map((p) => p.text).join('\n\n');
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(copyTarget)
        .then(() => {
          playCyberBeep('click');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyDocText(copyTarget);
        });
    } else {
      fallbackCopyDocText(copyTarget);
    }
  };

  const fallbackCopyDocText = (text: string) => {
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeSheet = xlsxDoc ? xlsxDoc.sheets[activeXlsxSheetIdx] : null;

  return (
    <div
      className={`bg-[#090C12] border border-[#1E2536] rounded-md flex flex-col overflow-hidden shadow-2xl font-sans ${
        isDedicatedWindow ? 'w-full max-w-5xl mx-auto my-auto min-h-[500px]' : ''
      }`}
    >
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2.5 bg-[#0D1017] border-b border-[#1E2536] text-xs gap-2">
        <div className="flex items-center gap-2">
          {isDocx ? (
            <FileText className="w-4 h-4 text-[#00F0FF]" />
          ) : isXlsx || isCsv ? (
            <FileSpreadsheet className="w-4 h-4 text-[#00FF66]" />
          ) : (
            <FileText className="w-4 h-4 text-[#00F0FF]" />
          )}
          <span className="text-white font-bold truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 uppercase text-[9px] font-bold font-mono">
            {isDocx
              ? 'WORD DOCUMENT (.DOCX)'
              : isXlsx
              ? 'EXCEL SPREADSHEET (.XLSX)'
              : isCsv
              ? 'DATA SHEET'
              : 'TEXT / DOCUMENT'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
          {docxDoc && (
            <span>
              WORDS: <strong className="text-white">{docxDoc.wordCount}</strong>
            </span>
          )}
          {xlsxDoc && (
            <span>
              SHEETS: <strong className="text-white">{xlsxDoc.sheets.length}</strong>
            </span>
          )}
          <span>
            SIZE: <strong className="text-white">{formatBytes(fileSize)}</strong>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30 text-[9px] font-bold">
            ZERO_DISK_STREAM
          </span>
        </div>
      </div>

      {/* Mode Switches & Toolbar for Text/Data/Word */}
      <div className="p-2 bg-[#0D1017] border-b border-[#1E2536] flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: View Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sheet tabs for XLSX */}
          {isXlsx && xlsxDoc && (
            <div className="flex gap-1 bg-[#121622] p-0.5 rounded-sm border border-[#1E2536]">
              {xlsxDoc.sheets.map((sheet, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    playCyberBeep('click');
                    setActiveXlsxSheetIdx(idx);
                  }}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer ${
                    activeXlsxSheetIdx === idx
                      ? 'bg-[#00FF66] text-[#090C12]'
                      : 'text-[#8E9299] hover:text-white'
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}

          {isCsv && (
            <div className="flex bg-[#121622] p-0.5 rounded-sm border border-[#1E2536] text-[10px]">
              <button
                onClick={() => {
                  playCyberBeep('click');
                  setActiveViewMode('table');
                }}
                className={`px-2 py-0.5 rounded-sm font-bold transition-all cursor-pointer ${
                  activeViewMode === 'table'
                    ? 'bg-[#00FF66] text-[#090C12]'
                    : 'text-[#8E9299] hover:text-white'
                }`}
              >
                TABLE GRID
              </button>
              <button
                onClick={() => {
                  playCyberBeep('click');
                  setActiveViewMode('text');
                }}
                className={`px-2 py-0.5 rounded-sm font-bold transition-all cursor-pointer ${
                  activeViewMode === 'text'
                    ? 'bg-[#00F0FF] text-[#090C12]'
                    : 'text-[#8E9299] hover:text-white'
                }`}
              >
                RAW TEXT
              </button>
            </div>
          )}

          {/* Search within document */}
          {activeViewMode === 'text' && (
            <div className="flex items-center gap-1.5 bg-[#121622] px-2 py-1 rounded-sm border border-[#1E2536]">
              <Search className="w-3.5 h-3.5 text-[#8E9299]" />
              <input
                type="text"
                placeholder="Filter lines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-[11px] text-white outline-none w-28 sm:w-40 placeholder:text-[#555E6D]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-[10px] text-[#8E9299] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Word Wrap & Copy */}
        <div className="flex items-center gap-2">
          {activeViewMode === 'text' && (
            <button
              onClick={() => {
                playCyberBeep('click');
                setWordWrap(!wordWrap);
              }}
              className={`px-2 py-1 rounded-sm border text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                wordWrap
                  ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]'
                  : 'bg-[#121622] border-[#1E2536] text-[#8E9299] hover:text-white'
              }`}
            >
              <WrapText className="w-3 h-3" />
              <span>WRAP</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-sm bg-[#121622] hover:bg-[#1E2536] text-white border border-[#1E2536] text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-[#00FF66]" /> : <Copy className="w-3 h-3 text-[#00F0FF]" />}
            <span>{copied ? 'COPIED' : 'COPY CONTENT'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="bg-[#05070A] min-h-[350px] max-h-[550px] overflow-auto relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-xs text-[#8E9299]">
            <Terminal className="w-6 h-6 text-[#00F0FF] animate-pulse" />
            <span className="font-mono">Decoding in-memory stream buffer...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-400">
            <p>{error}</p>
          </div>
        ) : activeViewMode === 'docx' && docxDoc ? (
          /* Rich DOCX Word Document Viewer */
          <div className="p-6 sm:p-10 max-w-3xl mx-auto bg-[#0D1017] border border-[#1E2536] my-4 rounded-md shadow-xl space-y-4 font-sans text-neutral-200">
            <div className="border-b border-[#1E2536] pb-3 mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {docxDoc.title}
              </h1>
              <div className="text-[11px] text-[#8E9299] font-mono mt-1">
                {docxDoc.wordCount} words • In-Memory Zero-Disk Document View
              </div>
            </div>

            {docxDoc.paragraphs.map((p, idx) => {
              if (p.type === 'heading1') {
                return (
                  <h2 key={idx} className="text-lg font-bold text-[#00F0FF] pt-3 pb-1 border-b border-[#1E2536]">
                    {p.text}
                  </h2>
                );
              }
              if (p.type === 'heading2') {
                return (
                  <h3 key={idx} className="text-base font-bold text-[#00FF66] pt-2">
                    {p.text}
                  </h3>
                );
              }
              if (p.type === 'heading3') {
                return (
                  <h4 key={idx} className="text-sm font-semibold text-[#FFB800]">
                    {p.text}
                  </h4>
                );
              }
              if (p.type === 'bullet') {
                return (
                  <div key={idx} className="flex items-start gap-2 text-sm text-neutral-300 pl-3">
                    <span className="text-[#00FF66]">•</span>
                    <span>{p.text}</span>
                  </div>
                );
              }
              if (p.type === 'table' && p.tableRows) {
                return (
                  <div key={idx} className="my-3 overflow-x-auto border border-[#1E2536] rounded-sm">
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {p.tableRows.map((r, rI) => (
                          <tr key={rI} className={rI === 0 ? 'bg-[#121622] font-bold text-white' : 'border-t border-[#1E2536]'}>
                            {r.map((c, cI) => (
                              <td key={cI} className="p-2 border-r border-[#1E2536]">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              return (
                <p key={idx} className="text-sm leading-relaxed text-neutral-300">
                  {p.text}
                </p>
              );
            })}
          </div>
        ) : activeViewMode === 'xlsx' && activeSheet ? (
          /* Multi-Sheet Excel Viewer */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#0D1017] border-b border-[#1E2536] text-[#00FF66] text-[10px] uppercase">
                  <th className="p-2 border-r border-[#1E2536] w-12 text-center text-[#8E9299]">#</th>
                  {activeSheet.headers.map((h, i) => (
                    <th key={i} className="p-2 border-r border-[#1E2536] font-bold">
                      {h || `COL ${String.fromCharCode(65 + (i % 26))}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2536]">
                {activeSheet.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#121622]/50 text-[11px] text-[#A0AEC0]">
                    <td className="p-1.5 border-r border-[#1E2536] text-center text-[#555E6D] text-[10px] bg-[#090C12]">
                      {rIdx + 2}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 border-r border-[#1E2536] truncate max-w-xs text-white">
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeViewMode === 'table' && parsedTable ? (
          /* CSV / TSV tabular view */
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#0D1017] border-b border-[#1E2536] text-[#00F0FF] text-[10px] uppercase">
                  <th className="p-2 border-r border-[#1E2536] w-10 text-center text-[#8E9299]">#</th>
                  {parsedTable.headers.map((h, i) => (
                    <th key={i} className="p-2 border-r border-[#1E2536] font-bold">
                      {h || `COL_${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2536]">
                {parsedTable.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#121622]/50 text-[11px] text-[#A0AEC0]">
                    <td className="p-1.5 border-r border-[#1E2536] text-center text-[#555E6D] text-[10px]">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 border-r border-[#1E2536] truncate max-w-xs text-white">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Monospace text viewer with line numbers */
          <div className="p-3 text-xs leading-relaxed">
            <table className="w-full border-collapse font-mono">
              <tbody>
                {filteredLines.map((item) => (
                  <tr key={item.num} className="hover:bg-[#121622]/60">
                    <td className="select-none pr-4 text-right text-[10px] text-[#555E6D] align-top w-12 border-r border-[#1E2536]/60">
                      {item.num}
                    </td>
                    <td
                      className={`pl-4 align-top text-[#E2E8F0] ${
                        wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
                      }`}
                    >
                      {item.line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
