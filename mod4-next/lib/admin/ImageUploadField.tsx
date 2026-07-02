'use client';

import { useRef, useState } from 'react';
import { resolveImageUrl } from './resolveImageUrl';

const inputClass =
  'w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green';

export function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const text = await res.text();
      let data: { url?: string; error?: string } | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // Non-JSON response (platform error page, timeout, etc.) — fall through
        // to the generic message below instead of surfacing a parse error.
      }
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed. Please try again.');
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste an image URL, or upload a file below"
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded border border-brand-line px-3 py-1.5 text-xs font-medium text-brand-ink-2 hover:bg-brand-paper-3 disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
        />
        {error && (
          <span role="alert" className="text-xs text-brand-red">
            {error}
          </span>
        )}
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageUrl(value)}
          alt=""
          className="h-24 w-40 rounded border border-brand-line object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </div>
  );
}
