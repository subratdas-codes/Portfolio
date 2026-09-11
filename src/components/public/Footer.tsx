import { Link } from 'react-router-dom';
import { Github, Linkedin, Twitter, Mail, Heart } from 'lucide-react';
import { useSingleton, useCollection } from '../../hooks/useStore';
import { emailHref } from '../../lib/store';

const ICONS: Record<string, typeof Github> = { Github, Linkedin, Twitter, Mail };

export function Footer() {
  const profile = useSingleton('profile');
  const socials = useCollection('social_links');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-950 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-bold text-white">SD</span>
              <span className="font-bold text-white">{profile.name}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{profile.role}</p>
          </div>
          <div className="flex gap-3">
            {socials.map((s) => { const Icon = ICONS[s.icon] ?? Github; return (
              <a key={s.id} href={emailHref(s.url)} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:scale-110 hover:text-indigo-300"><Icon size={18} /></a>
            ); })}
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-sm text-slate-500 sm:flex-row">
          <p className="flex items-center gap-1">© {year} {profile.name}. Built with <Heart size={13} className="text-rose-500" /> & React.</p>
        </div>
      </div>
    </footer>
  );
}
