import React, { useState, useEffect } from 'react';
import {
  Archive,
  Folder,
  File,
  FileCode,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Download,
  Eye,
  Search,
  Sparkles,
  Layers,
} from 'lucide-react';
import { parseArchiveBlob, ArchiveDocument, ArchiveEntry } from '../../lib/officeParser';
import { playCyberBeep } from '../../lib/cyberAudio';

interface ArchiveLiveViewerProps {
  blob: Blob;
  fileName: string;
  fileSize: number;
  onPreviewSubFile?: (subFile: { blob: Blob; fileName: string; mimeType: string; fileSize: number }) => void;
}

export const ArchiveLiveViewer: React.FC<ArchiveLiveViewerProps> = ({
  blob,
  fileName,
  fileSize,
  onPreviewSubFile,
}) => {
  const [doc, setDoc] = useState<ArchiveDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewingPath, setPreviewingPath] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    parseArchiveBlob(blob)
      .then((parsed) => {
        if (!isMounted) return;
        setDoc(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Archive parse error:', err);
        setError('Could not inspect archive headers directly from container.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [blob]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (entryName: string, isDir: boolean) => {
    if (isDir) return <Folder className="w-4 h-4 text-[#FFB800]" />;
    const ext = entryName.split('.').pop()?.toLowerCase();
    if (['mp4', 'mkv', 'mov', 'webm'].includes(ext || '')) return <Video className="w-4 h-4 text-[#00F0FF]" />;
    if (['mp3', 'wav', 'flac'].includes(ext || '')) return <Music className="w-4 h-4 text-[#FF0055]" />;
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return <ImageIcon className="w-4 h-4 text-[#00FF66]" />;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return <FileText className="w-4 h-4 text-[#00F0FF]" />;
    return <FileCode className="w-4 h-4 text-[#A0AEC0]" />;
  };

  const filteredEntries = (doc?.entries || []).filter((e) =>
    e.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInspectEntry = async (entry: ArchiveEntry) => {
    if (entry.isDir) return;
    playCyberBeep('click');
    setPreviewingPath(entry.path);
    try {
      const subBlob = await entry.asyncGetBlob();
      const ext = entry.name.split('.').pop()?.toLowerCase() || '';
      let mime = 'application/octet-stream';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) mime = `image/${ext === 'svg' ? 'svg+xml' : ext}`;
      if (['mp4', 'webm'].includes(ext)) mime = `video/${ext}`;
      if (['mp3', 'wav', 'ogg'].includes(ext)) mime = `audio/${ext}`;
      if (['txt', 'md', 'json', 'csv', 'js', 'ts'].includes(ext)) mime = 'text/plain';
      if (ext === 'pdf') mime = 'application/pdf';

      if (onPreviewSubFile) {
        onPreviewSubFile({
          blob: subBlob,
          fileName: entry.name,
          mimeType: mime,
          fileSize: entry.size,
        });
      } else {
        // Download sub file
        const url = URL.createObjectURL(subBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = entry.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    } finally {
      setPreviewingPath(null);
    }
  };

  return (
    <div className="bg-[#090C12] border border-[#1E2536] rounded-sm flex flex-col overflow-hidden shadow-2xl font-mono">
      {/* Header HUD */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0D1017] border-b border-[#1E2536] text-[10px] gap-2">
        <div className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5 text-[#FFB800]" />
          <span className="text-white font-bold truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.2 rounded bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30 uppercase text-[9px] font-bold">
            ARCHIVE CONTAINER
          </span>
        </div>

        <div className="flex items-center gap-3 text-[#8E9299]">
          {doc && (
            <span>
              FILES: <strong className="text-white">{doc.totalFiles}</strong> • UNPACKED:{' '}
              <strong className="text-white">{formatBytes(doc.totalSize)}</strong>
            </span>
          )}
          <span>
            COMPRESSED: <strong className="text-white">{formatBytes(fileSize)}</strong>
          </span>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="p-2 bg-[#0D1017] border-b border-[#1E2536] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 bg-[#121622] px-2 py-1 rounded-sm border border-[#1E2536] w-full max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Search files inside archive..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-[11px] text-white outline-none w-full placeholder:text-[#555E6D]"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-[10px] text-[#8E9299] hover:text-white">
              ✕
            </button>
          )}
        </div>

        <span className="text-[10px] text-[#00FF66] font-bold">
          ⚡ ZERO-DISK IN-MEMORY EXTRACTION
        </span>
      </div>

      {/* Archive Files Table */}
      <div className="bg-[#05070A] min-h-[350px] max-h-[500px] overflow-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-xs text-[#8E9299]">
            <Archive className="w-8 h-8 text-[#FFB800] animate-pulse" />
            <span>Scanning archive contents in RAM...</span>
          </div>
        ) : error || !doc ? (
          <div className="p-8 text-center space-y-3">
            <Archive className="w-10 h-10 mx-auto text-[#FFB800]/50" />
            <p className="text-white font-bold text-xs uppercase">Archive Container Protected</p>
            <p className="text-[11px] text-[#A0AEC0] max-w-md mx-auto">
              This compressed archive is held securely in RAM. You can save a copy to your computer.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#0D1017] border-b border-[#1E2536] text-[#00F0FF] text-[10px] uppercase">
                <th className="p-2 border-r border-[#1E2536]">File / Folder Path</th>
                <th className="p-2 border-r border-[#1E2536] w-28">Unpacked Size</th>
                <th className="p-2 border-r border-[#1E2536] w-28">Compressed</th>
                <th className="p-2 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2536]">
              {filteredEntries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-[#121622]/60 text-[11px] text-[#A0AEC0]">
                  <td className="p-2 border-r border-[#1E2536] flex items-center gap-2">
                    {getFileIcon(entry.name, entry.isDir)}
                    <span className={`truncate ${entry.isDir ? 'text-[#FFB800] font-bold' : 'text-white'}`}>
                      {entry.path}
                    </span>
                  </td>
                  <td className="p-2 border-r border-[#1E2536] text-[#E2E8F0]">
                    {entry.isDir ? '-' : formatBytes(entry.size)}
                  </td>
                  <td className="p-2 border-r border-[#1E2536] text-[#8E9299]">
                    {entry.isDir ? '-' : formatBytes(entry.compressedSize)}
                  </td>
                  <td className="p-1.5 text-center">
                    {!entry.isDir && (
                      <button
                        type="button"
                        onClick={() => handleInspectEntry(entry)}
                        disabled={previewingPath === entry.path}
                        className="px-2 py-0.5 rounded bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/40 text-[#00F0FF] text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>PREVIEW</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
