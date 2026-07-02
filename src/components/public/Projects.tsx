import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, ExternalLink, Eye, Star, Play, ArrowRight } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Modal } from '../ui/Modal';
import { trackEvent } from '../../lib/store';
import type { Project } from '../../lib/types';

export function Projects() {
  const projects = useCollection('projects');
  const [selected, setSelected] = useState<Project | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');
  const list = filter === 'featured' ? projects.filter((p) => p.featured) : projects;

  const open = (p: Project) => {
    setSelected(p);
    trackEvent('project_view', p.id);
  };

  return (
    <section id="projects" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Projects" title="Things I've built" subtitle="A selection of products and experiments across the stack." />
        <Reveal className="mb-8 flex justify-center gap-2">
          {(['all', 'featured'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                filter === f ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}>{f}</button>
          ))}
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <motion.article layout
                className="group h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-xl hover:shadow-indigo-500/10">
                <div className="relative aspect-video overflow-hidden">
                  <img src={p.image_url} alt={p.title} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  {p.featured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-semibold text-white"><Star size={11} /> Featured</span>}
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white"><Eye size={11} /> {p.views}</div>
                  <button onClick={() => open(p)} className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-white/30">
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{p.short_description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">{t}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => open(p)} className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/10">Details</button>
                    {p.github_url && (
                      <a href={p.github_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"><Github size={16} /></a>
                    )}
                    {p.live_url && (
                      <a href={p.live_url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"><ExternalLink size={16} /></a>
                    )}
                  </div>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} maxWidth="max-w-3xl">
        {selected && (
          <div className="space-y-5">
            <img src={selected.image_url} alt={selected.title} className="aspect-video w-full rounded-xl object-cover" />
            <p className="text-slate-300">{selected.detailed_description}</p>
            {selected.features.length > 0 && (
              <div><h4 className="mb-2 font-semibold text-white">Key Features</h4><ul className="grid gap-1.5 sm:grid-cols-2">{selected.features.map((f, i) => <li key={i} className="flex gap-2 text-sm text-slate-400"><span className="text-indigo-400">▸</span>{f}</li>)}</ul></div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {selected.challenges.length > 0 && (
                <div className="rounded-xl bg-white/5 p-4"><h4 className="mb-2 font-semibold text-amber-300">Challenges</h4><ul className="space-y-1">{selected.challenges.map((c, i) => <li key={i} className="text-sm text-slate-400">• {c}</li>)}</ul></div>
              )}
              {selected.learnings.length > 0 && (
                <div className="rounded-xl bg-white/5 p-4"><h4 className="mb-2 font-semibold text-emerald-300">Learnings</h4><ul className="space-y-1">{selected.learnings.map((l, i) => <li key={i} className="text-sm text-slate-400">• {l}</li>)}</ul></div>
              )}
            </div>
            {selected.screenshots.length > 0 && (
              <div><h4 className="mb-2 font-semibold text-white">Screenshots</h4><div className="grid gap-2 sm:grid-cols-2">{selected.screenshots.map((s, i) => <img key={i} src={s} alt="screenshot" className="rounded-lg object-cover" loading="lazy" />)}</div></div>
            )}
            {selected.architecture_diagram_url && (
              <div><h4 className="mb-2 font-semibold text-white">Architecture</h4><img src={selected.architecture_diagram_url} alt="architecture" className="w-full rounded-lg" loading="lazy" /></div>
            )}
            <div className="flex flex-wrap gap-2">
              {selected.technologies.map((t) => <span key={t} className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">{t}</span>)}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
              {selected.github_url && <a href={selected.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"><Github size={16} /> Code</a>}
              {selected.live_url && <a href={selected.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-medium text-white"><ExternalLink size={16} /> Live Demo</a>}
              {selected.demo_video_url && <a href={selected.demo_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"><Play size={16} /> Demo Video</a>}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
