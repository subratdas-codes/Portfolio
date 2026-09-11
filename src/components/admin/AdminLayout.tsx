import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, User, Home, Info, Code2, GraduationCap, Briefcase, FolderGit2,
  Award, FileText, Image, MessageSquare, Settings, BarChart3, FileCode2, Trophy,
  Mail, Layers, ScrollText, LogOut, Menu, X, ExternalLink, ShieldCheck, Cloud, CloudOff,
} from 'lucide-react';
import { useSession, useDB } from '../../hooks/useStore';
import { signOut, syncFromCloud, getSyncStatus } from '../../lib/store';

const NAV = [
  { section: 'Overview', items: [{ to: '', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    section: 'Content',
    items: [
      { to: 'profile', label: 'Profile', icon: User },
      { to: 'hero', label: 'Hero Section', icon: Home },
      { to: 'about', label: 'About Me', icon: Info },
      { to: 'skills', label: 'Skills', icon: Code2 },
      { to: 'education', label: 'Education', icon: GraduationCap },
      { to: 'experience', label: 'Experience', icon: Briefcase },
      { to: 'projects', label: 'Projects', icon: FolderGit2 },
      { to: 'certificates', label: 'Certificates', icon: Award },
      { to: 'achievements', label: 'Achievements', icon: Trophy },
      { to: 'coding-profiles', label: 'Coding Profiles', icon: FileCode2 },
      { to: 'gallery', label: 'Gallery', icon: Image },
      { to: 'testimonials', label: 'Testimonials', icon: MessageSquare },
      { to: 'blogs', label: 'Blogs', icon: FileText },
      { to: 'social-links', label: 'Social Links', icon: Mail },
      { to: 'resume', label: 'Resume', icon: FileText },
    ],
  },
  {
    section: 'System',
    items: [
      { to: 'page-builder', label: 'Page Builder', icon: Layers },
      { to: 'messages', label: 'Messages', icon: Mail },
      { to: 'analytics', label: 'Analytics', icon: BarChart3 },
      { to: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const session = useSession();
  useDB(); // re-render on cloud sync updates
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const syncStatus = getSyncStatus();
  const cloudOk = !syncStatus.cloudError;

  // Sync from cloud on mount — picks up changes from other devices
  useEffect(() => {
    syncFromCloud();
  }, []);

  if (!session) return <Navigate to="/admin/login" replace />;

  const logout = () => { signOut(); navigate('/admin/login'); };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 p-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-bold text-white">SD</span>
        <div>
          <div className="font-bold text-white">Admin CMS</div>
          <div className="text-xs text-slate-400">Subrat Das</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{group.section}</div>
            {group.items.map((item) => (
              <NavLink key={item.to} to={'/admin/' + item.to} end={(item as any).end} onClick={() => setOpen(false)}
                className={({ isActive }) => isActive ? 'flex items-center gap-3 rounded-lg bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-300' : 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white'}
              >
                <item.icon size={17} /> {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <a href="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><ExternalLink size={17} /> View Site</a>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10"><LogOut size={17} /> Logout</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur lg:block">{SidebarContent}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-slate-900 lg:hidden" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: 'spring', damping: 25 }}>{SidebarContent}</motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-300 lg:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400" /> Secure Admin Session
            <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${cloudOk ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
              {cloudOk ? <><Cloud size={11} /> Cloud Ready</> : <><CloudOff size={11} /> Local Mode</>}
            </span>
          </div>
          <div className="text-xs text-slate-500">{session.email}</div>
        </header>
        <main className="p-4 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
