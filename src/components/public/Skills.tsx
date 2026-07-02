import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import type { SkillCategory } from '../../lib/types';

const CATEGORIES: SkillCategory[] = ['Backend', 'Frontend', 'Database', 'Cloud', 'DevOps', 'Tools', 'Languages'];

export function Skills() {
  const skills = useCollection('skills');
  const [active, setActive] = useState<SkillCategory>('Backend');
  const list = skills.filter((s) => s.category === active);

  return (
    <section id="skills" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Skills" title="Technologies I work with" subtitle="A curated toolkit honed across projects, internships, and coursework." />

        <Reveal className="mb-8 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setActive(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active === c ? 'bg-gradient-to-r from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/30' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}>{c}</button>
          ))}
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((s, i) => (
              <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04 }}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-indigo-400/40 hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="font-semibold text-white">{s.name}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.level}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }}
                    initial={{ width: 0 }} animate={{ width: `${s.level}%` }} transition={{ duration: 1, delay: i * 0.04 }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
