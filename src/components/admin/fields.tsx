import { useState, useMemo } from 'react';
import { Plus, X, ChevronUp, ChevronDown, Smile } from 'lucide-react';
import { uploadImage, compressImage } from '../../lib/imageHost';
import { EMOJI_CATEGORIES } from '../../lib/emojis';

// ---------------------------------------------------------------- Field types
export type FieldType = 'text' | 'textarea' | 'number' | 'array' | 'select' | 'checkbox' | 'image' | 'color' | 'objectlist' | 'file' | 'emoji';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  full?: boolean;
  readOnly?: boolean;
}

// ---------------------------------------------------------------- Text
export function TextField({ value, onChange, placeholder, readOnly }: { value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`} />;
}

export function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />;
}

// ---------------------------------------------------------------- Emoji picker
// A browsable/searchable emoji palette. The chosen emoji is stored as plain
// text, so existing rows keep working without any migration.
export function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState(0);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q) {
      return EMOJI_CATEGORIES.map((c) => ({ name: c.name, emojis: c.emojis.filter(([e, k]) => e === q || k.includes(q) || e.includes(q)) })).filter((c) => c.emojis.length);
    }
    return [EMOJI_CATEGORIES[cat]];
  }, [q, cat]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-xl">{value || '—'}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Chosen emoji appears here"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${open ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
        >
          <Smile size={16} /> {open ? 'Hide emojis' : 'Choose emoji'}
        </button>
      </div>

      {open && (
        <div className="rounded-xl border border-indigo-400/20 bg-slate-900/95 p-3">
          <p className="mb-2 text-xs font-medium text-indigo-300">Choose an emoji — click one to select it</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search emoji... (e.g. fire, code, rocket)"
            className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          />
          {!q && (
            <div className="mb-2 flex flex-wrap gap-1">
              {EMOJI_CATEGORIES.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCat(i)}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${i === cat ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto pr-1">
            {visible.map((c) => (
              <div key={c.name} className="mb-2 last:mb-0">
                {q && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.name}</p>}
                <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                  {c.emojis.map(([e, k], i) => (
                    <button
                      key={`${e}-${i}`}
                      type="button"
                      title={k || e}
                      onClick={() => { onChange(e); setOpen(false); setQuery(''); }}
                      className={`grid h-9 place-items-center rounded-lg text-xl transition hover:bg-white/15 ${value === e ? 'bg-indigo-500/40 ring-1 ring-indigo-400' : 'bg-white/5'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {visible.every((c) => c.emojis.length === 0) && <p className="py-4 text-center text-sm text-slate-500">No emoji found. Try another keyword.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArrayField({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder ?? 'Add item...'} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) { onChange([...value, draft.trim()]); setDraft(''); } } }} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
        <button type="button" onClick={() => { if (draft.trim()) { onChange([...value, draft.trim()]); setDraft(''); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 text-white"><Plus size={16} /></button>
      </div>
      <div className="space-y-1">
        {value.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
            <span className="flex-1 text-sm text-slate-200">{item}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-rose-400 hover:text-rose-300"><X size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ObjectListField({ value, onChange, fields }: { value: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void; fields: { name: string; label: string }[] }) {
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/5 p-2">
          {fields.map((f) => (
            <input key={f.name} value={row[f.name] ?? ''} placeholder={f.label} onChange={(e) => { const next = [...value]; next[i] = { ...row, [f.name]: e.target.value }; onChange(next); }} className="min-w-[100px] flex-1 rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-400" />
          ))}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-rose-400"><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, Object.fromEntries(fields.map((f) => [f.name, '']))])} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"><Plus size={13} /> Add row</button>
    </div>
  );
}

// ---------------------------------------------------------------- Image upload
// Uploads to Supabase Storage and stores only the permanent public URL.
export function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onFile = async (file: File) => {
    setError('');
    setSuccess(false);
    setUploading(true);
    try {
      // 1. Compress client-side (max 800px, JPEG 0.8)
      const compressed = await compressImage(file);
      // 2. Upload to Supabase Storage and get a permanent URL
      const result = await uploadImage(compressed);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        onChange(result.url);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={value.startsWith('data:') ? '(uploaded image)' : value} onChange={(e) => { onChange(e.target.value); setError(''); setSuccess(false); }} placeholder="Image URL or upload" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
        <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20">
          {uploading ? 'Uploading…' : 'Upload'}
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" className="hidden" disabled={uploading} onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>
      {error && <p className="text-xs text-rose-400">⚠ {error}</p>}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <span>✓ Image uploaded successfully! Click "Save Changes" to persist.</span>
        </div>
      )}
      {value && <img src={value} alt="preview" className="h-24 w-full rounded-lg object-cover" onError={(ev) => (ev.currentTarget.style.display = 'none')} />}
    </div>
  );
}

// ---------------------------------------------------------------- File upload (PDF, images, any file)
// Also uploads to Supabase Storage so only permanent URLs are stored.
export function FileField({
  value,
  onChange,
  fileName,
  onFileNameChange,
  onFileSizeChange,
}: {
  value: string;
  onChange: (v: string) => void;
  fileName?: string;
  onFileNameChange?: (v: string) => void;
  onFileSizeChange?: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const onFile = async (file: File) => {
    setError('');
    setUploading(true);
    setSuccess(false);
    try {
      // For images, compress first; for PDFs, upload as-is
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file, 1200, 0.85);
      }
      // Upload to Supabase Storage
      const result = await uploadImage(fileToUpload, 'files');
      if (result.error) {
        setError(result.error);
        setUploading(false);
        return;
      }
      onChange(result.url);
      if (onFileNameChange) onFileNameChange(file.name);
      if (onFileSizeChange) onFileSizeChange(formatSize(file.size));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isPdf = value.toLowerCase().endsWith('.pdf') || value.includes('application/pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value) || value.startsWith('data:image/');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={value.startsWith('data:') ? fileName || '(uploaded file)' : value}
          onChange={(e) => { onChange(e.target.value); setError(''); setSuccess(false); }}
          placeholder="File URL or upload a file"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
        />
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading…
            </>
          ) : (
            'Upload File'
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          <span>⚠ {error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <span>✓ File uploaded! Click "Save Changes" to persist.</span>
        </div>
      )}

      {value && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {fileName && <span className="flex items-center gap-1">📄 {fileName}</span>}
          </div>
          {isPdf && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(value)}&embedded=true`}
              title="File Preview"
              className="h-56 w-full rounded border border-white/10"
            />
          )}
          {isImage && !isPdf && (
            <img src={value} alt="File preview" className="max-h-56 w-full rounded border border-white/10 object-contain" />
          )}
          {!isPdf && !isImage && (
            <a href={value} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:underline">View file →</a>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">Files are stored securely in Supabase Storage. Accepts PDF, JPG, JPEG, PNG, GIF, Excel (XLS/XLSX), CSV, DOC, PPT, TXT.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Reorder list helper
export function ReorderList<T extends { id?: string }>({ items, onChange, render }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, index: number) => React.ReactNode }) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.id ?? i} className="flex items-center gap-2">
          <div className="flex flex-col">
            <button type="button" onClick={() => move(i, -1)} className="text-slate-400 hover:text-white"><ChevronUp size={14} /></button>
            <button type="button" onClick={() => move(i, 1)} className="text-slate-400 hover:text-white"><ChevronDown size={14} /></button>
          </div>
          <div className="flex-1">{render(item, i)}</div>
        </div>
      ))}
    </div>
  );
}
