import { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, RotateCcw, AlertTriangle, Cloud } from 'lucide-react';
import { useSingleton } from '../../hooks/useStore';
import { upsertSingleton, getPersistError, forceCloudSync } from '../../lib/store';
import { TextField, TextArea, ArrayField, ObjectListField, ImageField, FileField } from './fields';
import type { FieldDef } from './fields';
import type { SingletonTable, Schema } from '../../lib/types';

interface SingletonEditorProps<K extends SingletonTable> {
  table: K;
  fields: FieldDef[];
  title: string;
  subtitle?: string;
  objectListFields?: { name: string; label: string; fields: { name: string; label: string }[] }[];
}

export function SingletonEditor<K extends SingletonTable>({ table, fields, title, subtitle, objectListFields }: SingletonEditorProps<K>) {
  const data = useSingleton(table);
  const [form, setForm] = useState<any>(data);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Track the serialized DB data so we only reset the form when the actual
  // content changes (after a save), NOT on every render.  useSingleton returns
  // a fresh clone each render which would otherwise reset edits immediately.
  const dataKey = JSON.stringify(data);
  const lastDataKey = useRef(dataKey);

  useEffect(() => {
    if (lastDataKey.current !== dataKey) {
      lastDataKey.current = dataKey;
      setForm(data);
      setDirty(false);
    }
  }, [dataKey, data]);

  const setVal = (name: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const [saveError, setSaveError] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const save = async () => {
    upsertSingleton(table, form);
    const err = getPersistError();
    if (err) {
      setSaveError('Save failed: ' + err + '. The image may be too large. Try a smaller image or use a URL instead.');
      setSaved(false);
      return;
    }
    setSaved(true);
    setDirty(false);
    setSaveError('');
    // Push to cloud immediately so other devices get the update
    setCloudSyncing(true);
    await forceCloudSync();
    setCloudSyncing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    setForm(data);
    setDirty(false);
  };

  if (!form) return null;

  return (
    <div>
      {saveError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          {dirty && <span className="mt-1 inline-block text-xs text-amber-400">● Unsaved changes</span>}
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10">
              <RotateCcw size={16} /> Reset
            </button>
          )}
          <button onClick={save} disabled={cloudSyncing} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105 disabled:opacity-70">
            {cloudSyncing ? <><Cloud size={16} className="animate-pulse" /> Syncing to Cloud…</> : saved ? <><CheckCircle2 size={16} /> Saved & Synced!</> : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </div>
      <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.full || f.type === 'textarea' || f.type === 'array' || f.type === 'image' || f.type === 'file' || f.type === 'objectlist' ? 'sm:col-span-2' : ''}>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">{f.label}</label>
              {f.type === 'text' && <TextField value={form[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} placeholder={f.placeholder} readOnly={f.readOnly} />}
              {f.type === 'textarea' && <TextArea value={form[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} rows={f.name === 'content' ? 8 : 4} />}
              {f.type === 'number' && <TextField value={String(form[f.name] ?? 0)} onChange={(v) => setVal(f.name, Number(v))} />}
              {f.type === 'color' && <input type="color" value={form[f.name] ?? '#6366f1'} onChange={(e) => setVal(f.name, e.target.value)} className="h-10 w-full rounded-lg bg-white/5" />}
              {f.type === 'select' && (
                <select value={form[f.name] ?? ''} onChange={(e) => setVal(f.name, e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                  {f.options?.map((o) => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                </select>
              )}
              {f.type === 'checkbox' && <button type="button" onClick={() => setVal(f.name, !form[f.name])} className={`rounded-lg px-4 py-2 text-sm font-medium ${form[f.name] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'}`}>{form[f.name] ? 'Enabled' : 'Disabled'}</button>}
              {f.type === 'array' && <ArrayField value={form[f.name] ?? []} onChange={(v) => setVal(f.name, v)} placeholder={f.placeholder} />}
              {f.type === 'image' && <ImageField value={form[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} />}
              {f.type === 'file' && <FileField value={form[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} fileName={form['file_name']} onFileNameChange={(v) => setVal('file_name', v)} onFileSizeChange={(v) => setVal('file_size', v)} />}
              {f.type === 'objectlist' && (() => { const ol = objectListFields?.find((o) => o.name === f.name); return ol ? <ObjectListField value={form[f.name] ?? []} onChange={(v) => setVal(f.name, v)} fields={ol.fields} /> : null; })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
