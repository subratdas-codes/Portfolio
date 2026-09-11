import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, X, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { insert, update, remove, getPersistError, forceCloudSync } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { TextField, TextArea, ArrayField, ObjectListField, ImageField, FileField } from './fields';
import type { FieldDef } from './fields';
import type { CollectionTable, Schema } from '../../lib/types';

interface CollectionEditorProps<K extends CollectionTable> {
  table: K;
  fields: FieldDef[];
  title: string;
  subtitle?: string;
  searchKeys?: string[];
  objectListFields?: { name: string; label: string; fields: { name: string; label: string }[] }[];
}

type Row = Record<string, any>;

export function CollectionEditor<K extends CollectionTable>({ table, fields, title, subtitle, searchKeys, objectListFields }: CollectionEditorProps<K>) {
  const rows = useCollection(table);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [flashId, setFlashId] = useState<string | null>(null);

  const filtered = (query && searchKeys
    ? rows.filter((r) => searchKeys.some((k) => String((r as unknown as Record<string, unknown>)[k] ?? '').toLowerCase().includes(query.toLowerCase())))
    : rows
  ).sort((a, b) => ((a as Row).sort_order ?? 0) - ((b as Row).sort_order ?? 0));

  const startNew = () => {
    const blank: Row = { created_at: new Date().toISOString() };
    fields.forEach((f) => { if (f.type === 'array') blank[f.name] = []; if (f.type === 'checkbox') blank[f.name] = false; if (f.type === 'number') blank[f.name] = 0; });
    objectListFields?.forEach((o) => { blank[o.name] = []; });
    setEditing(blank); setIsNew(true);
  };

  const startEdit = (row: Row) => { setEditing({ ...row }); setIsNew(false); };

  const save = async () => {
    if (!editing) return;
    if (isNew) {
      const { id, ...rest } = editing;
      insert(table, rest as any);
    } else {
      const { id, ...rest } = editing;
      update(table, id, rest as any);
    }
    const err = getPersistError();
    if (err) {
      setSaveError('Save failed: ' + err + '. The image may be too large. Try a smaller image or use a URL instead.');
      return;
    }
    setSaveError('');
    setEditing(null);
    // Push to cloud immediately so other devices get the update
    await forceCloudSync();
  };

  const del = async (id: string) => {
    if (confirm('Delete this item? This cannot be undone.')) {
      remove(table, id);
      await forceCloudSync();
    }
  };

  const moveRow = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...rows].sort((a, b) => ((a as Row).sort_order ?? 0) - ((b as Row).sort_order ?? 0));
    const idx = sorted.findIndex((r) => (r as Row).id === id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const a = sorted[idx] as Row;
    const b = sorted[targetIdx] as Row;
    const aOrder = a.sort_order ?? idx;
    const bOrder = b.sort_order ?? targetIdx;
    update(table, a.id, { sort_order: bOrder } as any);
    update(table, b.id, { sort_order: aOrder } as any);
    setFlashId(id);
    setTimeout(() => setFlashId(null), 900);
    await forceCloudSync();
  };

  const setVal = (name: string, value: any) => setEditing((prev) => (prev ? { ...prev, [name]: value } : prev));

  const displayValue = (row: Row, f: FieldDef) => {
    const v = (row as unknown as Record<string, unknown>)[f.name];
    if (f.type === 'array') return Array.isArray(v) ? v.join(', ') : '';
    if (f.type === 'checkbox') return v ? '✓' : '';
    if (f.type === 'objectlist') return Array.isArray(v) ? `${v.length} items` : '';
    return String(v ?? '');
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {searchKeys && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-400" />
            </div>
          )}
          <button onClick={startNew} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105"><Plus size={16} /> Add New</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-400">
              <tr>
                {fields.slice(0, 5).map((f) => <th key={f.name} className="px-4 py-3 font-medium">{f.label}</th>)}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((row) => (
                <tr key={(row as Row).id} className={`transition hover:bg-white/5 ${flashId === (row as Row).id ? 'bg-emerald-500/20' : ''}`}>
                  {fields.slice(0, 5).map((f) => (
                    <td key={f.name} className="max-w-[200px] truncate px-4 py-3 text-slate-300">{displayValue(row as Row, f)}</td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => moveRow((row as Row).id, 'up')} title="Move up" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><ChevronUp size={15} /></button>
                      <button onClick={() => moveRow((row as Row).id, 'down')} title="Move down" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><ChevronDown size={15} /></button>
                      <button onClick={() => startEdit(row as Row)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-indigo-300"><Pencil size={15} /></button>
                      <button onClick={() => del((row as Row).id)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-rose-400"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No items yet. Click "Add New" to create one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => { setEditing(null); setSaveError(''); }} title={isNew ? `Add ${title}` : `Edit ${title}`} maxWidth="max-w-2xl">
        {editing && (
          <div className="space-y-4">
            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.name} className={f.full || f.type === 'textarea' || f.type === 'array' || f.type === 'image' || f.type === 'file' || f.type === 'objectlist' ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-sm font-medium text-slate-300">{f.label}</label>
                  {f.type === 'text' && <TextField value={editing[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} placeholder={f.placeholder} readOnly={f.readOnly} />}
                  {f.type === 'textarea' && <TextArea value={editing[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} />}
                  {f.type === 'number' && <TextField value={String(editing[f.name] ?? 0)} onChange={(v) => setVal(f.name, Number(v))} />}
                  {f.type === 'color' && <input type="color" value={editing[f.name] ?? '#6366f1'} onChange={(e) => setVal(f.name, e.target.value)} className="h-10 w-full rounded-lg bg-white/5" />}
                  {f.type === 'select' && (
                    <select value={editing[f.name] ?? ''} onChange={(e) => setVal(f.name, e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400">
                      <option value="">Select...</option>
                      {f.options?.map((o) => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
                    </select>
                  )}
                  {f.type === 'checkbox' && <button type="button" onClick={() => setVal(f.name, !editing[f.name])} className={`rounded-lg px-4 py-2 text-sm font-medium ${editing[f.name] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'}`}>{editing[f.name] ? 'Enabled' : 'Disabled'}</button>}
                  {f.type === 'array' && <ArrayField value={editing[f.name] ?? []} onChange={(v) => setVal(f.name, v)} placeholder={f.placeholder} />}
                  {f.type === 'image' && <ImageField value={editing[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} />}
                  {f.type === 'file' && <FileField value={editing[f.name] ?? ''} onChange={(v) => setVal(f.name, v)} fileName={editing['file_name']} onFileNameChange={(v) => setVal('file_name', v)} />}
                  {f.type === 'objectlist' && (() => { const ol = objectListFields?.find((o) => o.name === f.name); return ol ? <ObjectListField value={editing[f.name] ?? []} onChange={(v) => setVal(f.name, v)} fields={ol.fields} /> : null; })()}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
              <button onClick={() => setEditing(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Cancel</button>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white hover:scale-105">Save & Sync</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
