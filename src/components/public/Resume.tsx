import { useSingleton } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Download, Eye, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { trackEvent } from '../../lib/store';

export function Resume() {
  const resume = useSingleton('resume');
  const [downloading, setDownloading] = useState(false);

  const isPdf =
    resume.file_url.toLowerCase().endsWith('.pdf') ||
    resume.file_name.toLowerCase().endsWith('.pdf') ||
    resume.file_url.includes('application/pdf');

  // Cross-origin files (Supabase storage) ignore the `download` attribute and
  // open in place of the site. Fetch as a blob + object URL so the browser
  // always downloads instead of navigating away.
  const onDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      trackEvent('resume_download');
      const resp = await fetch(resume.file_url);
      if (!resp.ok) throw new Error('Failed to fetch resume');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.file_name || 'resume';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.warn('[resume] Download failed:', e);
      // Fallback: open in a new tab so the site is never lost.
      window.open(resume.file_url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  // "View" opens the file inline in a new tab — NO download.
  // For PDFs we use Google Docs Viewer so it renders in the browser.
  // For images we open the URL directly.
  const onView = () => {
    trackEvent('resume_view');
    if (isPdf) {
      window.open(
        `https://docs.google.com/viewer?url=${encodeURIComponent(resume.file_url)}&embedded=true`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      window.open(resume.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section id="resume" className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Resume" title="My resume" subtitle="Download a copy or view it inline." />
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-cyan-400/10 p-8">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
              <div className="grid h-20 w-16 place-items-center rounded-xl bg-white/10">
                <FileText size={36} className="text-indigo-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{resume.file_name}</h3>
                <p className="mt-1 text-sm text-slate-400">{resume.file_size} · Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-emerald-400"><TrendingUp size={14} /> {resume.downloads} downloads</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onView} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"><Eye size={18} /> View</button>
                <button onClick={onDownload} disabled={downloading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 disabled:opacity-70"><Download size={18} /> {downloading ? 'Preparing…' : 'Download'}</button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
