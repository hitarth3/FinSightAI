import React, { useEffect, useState } from 'react';
import { Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ReceiptPreviewProps {
  receiptUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
}

import { API_BASE, apiFetch } from '../../services/apiClient';

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

/**
 * Fetches a protected file with the Authorization header (never as a URL query
 * param, which would leak the access token into server logs/browser history)
 * and exposes it as a local object URL.
 */
function useAuthorizedObjectUrl(url: string | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let currentBlobUrl: string | null = null;
    const token = localStorage.getItem('finsight_access_token');

    apiFetch(resolveUrl(url), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('Failed to load file'))))
      .then((blob) => {
        if (cancelled) return;
        currentBlobUrl = URL.createObjectURL(blob);
        setObjectUrl(currentBlobUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [url]);

  return objectUrl;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ receiptUrl, thumbnailUrl, fileName }) => {
  const thumbnailObjectUrl = useAuthorizedObjectUrl(thumbnailUrl || null);
  const receiptObjectUrl = useAuthorizedObjectUrl(receiptUrl || null);
  const isPdf = receiptUrl ? receiptUrl.toLowerCase().endsWith('.pdf') : false;

  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]/55">Receipt Preview</span>

      <GlassCard className="relative overflow-hidden group flex items-center justify-center bg-black/40 border-[var(--border-color)] h-44 rounded-xl p-3">
        {thumbnailObjectUrl ? (
          <img
            src={thumbnailObjectUrl}
            alt={fileName || "Receipt Thumbnail"}
            className="h-full w-auto object-contain rounded-lg transition-transform duration-500 group-hover:scale-105"
          />
        ) : isPdf ? (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <FileText className="w-12 h-12 text-[var(--primary-color)]/60" />
            <span className="text-[10px] font-medium tracking-wide truncate max-w-[150px]">{fileName || "Document.pdf"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
            <ImageIcon className="w-12 h-12 text-[var(--secondary-color)]/60" />
            <span className="text-[10px] font-medium tracking-wide truncate max-w-[150px]">{fileName || "Image Receipt"}</span>
          </div>
        )}

        <a
          href={receiptObjectUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white"
        >
          <Eye className="w-5 h-5 text-[var(--primary-color)]" />
          <span className="text-[9px] uppercase tracking-wider font-bold">Open Original Receipt</span>
        </a>
      </GlassCard>
    </div>
  );
};
export default ReceiptPreview;
