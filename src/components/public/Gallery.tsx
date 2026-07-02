import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import type { GalleryCategory } from '../../lib/types';

const CATS: (GalleryCategory | 'All')[] = ['All', 'Certificates', 'Events', 'College', 'Projects', 'Personal'];

export function Gallery() {
  const items = useCollection('gallery');
  const [cat, setCat] = useState<GalleryCategory | 'All'>('All');
  const [idx, setIdx] = useState<number | null>(null);
  const list = cat === 'All' ? items : items.filter((g) => g.category === cat);

  const close = () => setIdx(null);
  const next = () => setIdx((i) => (i === null ? i : (i + 1) % list.length));
  const prev = () => setIdx((i) => (i === null ? i : (i - 1 + list.length) % list.length));

  return (
    <section id="gallery" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Gallery" title="Moments & memories" subtitle="A visual journey through events, campus, and milestones." />
        <Reveal className="mb-8 flex flex-wrap justify-center gap-2">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${cat === c ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{c}</button>
          ))}
        </Reveal>
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
          {list.map((g, i) => (
            <Reveal key={g.id} delay={i * 0.04}>
              <button onClick={() => setIdx(i)} className="group relative block w-full overflow-hidden rounded-xl border border-white/10">
                <img src={g.image_url} alt={g.title} loading="lazy" className="w-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/80 via-transparent p-3 opacity-0 transition group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium text-white">{g.title}</span>
                    <ZoomIn size={16} className="text-white" />
                  </div>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {idx !== null && list[idx] && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={close} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X /></button>
            <button onClick={prev} className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft /></button>
            <motion.img key={list[idx].id} src={list[idx].image_url} alt={list[idx].title} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" />
            <button onClick={next} className="absolute right-4 bottom-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight /></button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">{list[idx].title}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
