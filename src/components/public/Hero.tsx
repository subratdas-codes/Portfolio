import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Mail, Github, Linkedin, Twitter, MapPin, Circle } from 'lucide-react';
import { useSingleton, useCollection } from '../../hooks/useStore';
import { ParticleField } from '../ui/ParticleField';
import { trackEvent } from '../../lib/store';

const ICONS: Record<string, typeof Github> = { Github, Linkedin, Twitter, Mail };

function useTypingEffect(words: string[], speed = 90, pause = 1600) {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    if (words.length === 0) return;
    const word = words[i % words.length];
    let t: number;
    if (!del && text === word) {
      t = window.setTimeout(() => setDel(true), pause);
    } else if (del && text === '') {
      setDel(false); setI((i + 1) % words.length);
    } else {
      t = window.setTimeout(() => {
        setText((prev) => del ? word.slice(0, prev.length - 1) : word.slice(0, prev.length + 1));
      }, del ? speed / 2 : speed);
    }
    return () => clearTimeout(t);
  }, [text, del, i, words, speed, pause]);
  return text;
}

export function Hero() {
  const profile = useSingleton('profile');
  const hero = useSingleton('hero');
  const about = useSingleton('about');
  const socials = useCollection('social_links');
  const typed = useTypingEffect(profile.typing_roles);

  // Floating stat cards pull dynamically from the About highlights (editable
  // in Admin → About Me). Falls back to years_experience + project count.
  const highlights = about.highlights ?? [];
  const findHighlight = (label: string) =>
    highlights.find((h) => h.label.toLowerCase().includes(label.toLowerCase()));

  const yearsStat = findHighlight('experience') ?? findHighlight('year');
  const projectsStat = findHighlight('project');

  const stat1Value = yearsStat?.value ?? `${profile.years_experience}+`;
  const stat1Label = yearsStat?.label ?? 'Years Experience';
  const stat2Value = projectsStat?.value ?? '20+';
  const stat2Label = projectsStat?.label ?? 'Projects Built';

  const onDownload = () => {
    trackEvent('resume_download');
    document.querySelector('#resume')?.scrollIntoView({ behavior: 'smooth' });
  };

  const statusColor = {
    available: 'bg-emerald-400', open: 'bg-cyan-400', busy: 'bg-amber-400', unavailable: 'bg-rose-400',
  }[profile.availability];

  return (
    <section id="hero" className="relative flex min-h-screen items-center overflow-hidden pt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 opacity-70"><ParticleField color="#6366f1" /></div>
      <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">
            <Circle size={10} className={`fill-current ${statusColor} ${statusColor}`} />
            {profile.availability_note}
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            {hero.heading}
          </h1>
          <div className="mt-3 flex items-center gap-2 text-xl font-medium text-slate-300 sm:text-2xl">
            <span className="text-indigo-400">{typed}</span>
            <span className="animate-pulse text-indigo-400">|</span>
          </div>
          <p className="mt-5 max-w-xl text-lg text-slate-400">{hero.subheading}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onDownload}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 hover:shadow-indigo-500/50">
              <Download size={18} /> {hero.primary_cta_label}
            </button>
            <button onClick={() => document.querySelector(hero.secondary_cta_href)?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:scale-105 hover:bg-white/10">
              <Mail size={18} /> {hero.secondary_cta_label}
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3">
            {socials.map((s) => {
              const Icon = ICONS[s.icon] ?? Github;
              return (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                  className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:scale-110 hover:border-indigo-400/50 hover:text-indigo-300">
                  <Icon size={20} />
                </a>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={15} /> {profile.location}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-indigo-500/30 to-cyan-400/30 blur-2xl" />
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
            <img src={profile.photo_url} alt={profile.name} loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
          </div>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute -bottom-4 -left-4 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-3 backdrop-blur">
            <div className="text-2xl font-bold text-white">{stat1Value}</div>
            <div className="text-xs text-slate-400">{stat1Label}</div>
          </motion.div>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute -right-4 top-8 rounded-2xl border border-white/10 bg-slate-900/90 px-5 py-3 backdrop-blur">
            <div className="text-2xl font-bold text-white">{stat2Value}</div>
            <div className="text-xs text-slate-400">{stat2Label}</div>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-500">
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-xs">Scroll ↓</motion.div>
      </div>
    </section>
  );
}
