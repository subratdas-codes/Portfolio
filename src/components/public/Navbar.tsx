import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useSingleton, useCollection } from '../../hooks/useStore';

const NAV = [
  { key: 'about', label: 'About' },
  { key: 'skills', label: 'Skills' },
  { key: 'projects', label: 'Projects' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'certificates', label: 'Certs' },
  { key: 'achievements', label: 'Awards' },
  { key: 'contact', label: 'Contact' },
];

export function Navbar() {
  const profile = useSingleton('profile');
  const sections = useCollection('sections');
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enabledKeys = new Set(sections.filter((s) => s.enabled).map((s) => s.key));
  const links = NAV.filter((n) => enabledKeys.has(n.key));

  // Robust scroll: retries until the lazy-loaded section is in the DOM.
  // On mobile, sections are code-split and may not be rendered yet when
  // the user taps a nav item before scrolling.
  const go = (hash: string) => {
    setOpen(false);
    if (loc.pathname !== '/') {
      window.location.href = '/' + hash;
      return;
    }
    let retries = 0;
    const tryScroll = () => {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (retries < 20) {
        retries++;
        setTimeout(tryScroll, 150);
      }
    };
    // Small delay so the menu close animation doesn't interfere
    setTimeout(tryScroll, 200);
  };

  return (
    <motion.header
      initial={{ y: -80 }} animate={{ y: 0 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-slate-950/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <button onClick={() => go('#hero')} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-bold text-white">SD</span>
          <span className="hidden font-semibold text-white sm:block">{profile.name}</span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button key={l.key} onClick={() => go('#' + l.key)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white md:hidden" aria-label="Toggle menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-slate-950/95 md:hidden">
            <div className="flex flex-col p-4">
              {links.map((l) => (
                <button key={l.key} onClick={() => go('#' + l.key)}
                  className="rounded-lg px-4 py-3 text-left text-slate-200 hover:bg-white/10">{l.label}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
