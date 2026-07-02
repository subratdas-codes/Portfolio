import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Eye, EyeOff, Save, Upload, RotateCcw, Plus, Trash2, ExternalLink, Layers } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { saveDraft, loadDraft, publishDraft } from '../../lib/store';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/admin/fields';
import type { SectionConfig } from '../../lib/types';

export function PageBuilder() {
  const sections = useCollection('sections');
  const [draft, setDraft] = useState<SectionConfig[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newKey, setNewKey] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    setDraft(d ? d.sections : [...sections].sort((a, b) => a.order - b.order));
    setDirty(!!d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = [...draft].sort((a, b) => a.order - b.order);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((s, idx) => (s.order = idx));
    setDraft(next); setDirty(true);
  };

  const toggle = (id: string) => {
    setDraft(draft.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))); setDirty(true);
  };

  const removeSection = (id: string) => {
    if (!confirm('Remove this section from the page?')) return;
    setDraft(draft.filter((s) => s.id !== id)); setDirty(true);
  };

  const addSection = () => {
    if (!newTitle.trim() || !newKey.trim()) return;
    const s: SectionConfig = {
      id: 'sec_' + Math.random().toString(36).slice(2, 8),
      key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
      title: newTitle.trim(),
      enabled: true,
      order: draft.length,
      built_in: false,
    };
    setDraft([...draft, s]); setDirty(true); setShowAdd(false); setNewTitle(''); setNewKey('');
  };

  const save = () => { saveDraft(draft); setDirty(false); };
  const publish = () => { publishDraft(draft); setDirty(false); };
  const discard = () => {
    const fresh = [...sections].sort((a, b) => a.order - b.order);
    setDraft(fresh); setDirty(false);
    try { localStorage.removeItem('subrat_portfolio_draft_v1'); } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Layers size={24} className="text-indigo-400" /> Page Builder</h1>
          <p className="text-sm text-slate-400">Drag to reorder, toggle visibility, add custom sections.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreview(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"><ExternalLink size={15} /> Preview</button>
          <button onClick={discard} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"><RotateCcw size={15} /> Discard</button>
          <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-40"><Save size={15} /> Save Draft</button>
          <button onClick={publish} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2 text-sm font-semibold text-white hover:scale-105"><Upload size={15} /> Publish</button>
        </div>
      </div>

      {dirty && <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">You have unsaved draft changes. Save draft or publish to apply.</div>}

      <div className="space-y-2">
        {sorted.map((s, i) => (
          <motion.div key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`flex items-center gap-3 rounded-xl border p-4 transition ${s.enabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60'}`}>
            <div className="flex flex-col items-center">
              <button onClick={() => move(i, -1)} className="text-slate-500 hover:text-white">▲</button>
              <GripVertical size={16} className="text-slate-600" />
              <button onClick={() => move(i, 1)} className="text-slate-500 hover:text-white">▼</button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{s.title}</span>
                {s.built_in
                  ? <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-300">built-in</span>
                  : <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">custom</span>}
              </div>
              <code className="text-xs text-slate-500">#{s.key}</code>
            </div>
            <button onClick={() => toggle(s.id)} className={`rounded-lg p-2 transition ${s.enabled ? 'text-emerald-400 hover:bg-white/10' : 'text-slate-500 hover:bg-white/10'}`}>
              {s.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            {!s.built_in && <button onClick={() => removeSection(s.id)} className="rounded-lg p-2 text-rose-400 hover:bg-white/10"><Trash2 size={15} /></button>}
          </motion.div>
        ))}
      </div>

      <button onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-indigo-400/40 hover:text-white"><Plus size={16} /> Add Custom Section</button>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Custom Section">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Add sections like Publications, Patents, Talks, Workshops, or Research Papers. (Custom sections render as placeholder cards until wired to content.)</p>
          <div><label className="mb-1 block text-sm text-slate-300">Section Title</label><TextField value={newTitle} onChange={setNewTitle} placeholder="e.g. Publications" /></div>
          <div><label className="mb-1 block text-sm text-slate-300">Section Key (auto from title)</label><TextField value={newKey} onChange={setNewKey} placeholder="publications" /></div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button onClick={addSection} className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white">Add Section</button>
          </div>
        </div>
      </Modal>

      <Modal open={preview} onClose={() => setPreview(false)} title="Live Preview" maxWidth="max-w-4xl">
        <div className="space-y-2">
          {sorted.filter((s) => s.enabled).map((s) => (
            <div key={s.id} className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 text-center">
              <div className="text-xs uppercase tracking-widest text-indigo-300">{s.key}</div>
              <div className="mt-2 text-lg font-bold text-white">{s.title}</div>
              <div className="mt-1 text-sm text-slate-500">Section preview placeholder</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
