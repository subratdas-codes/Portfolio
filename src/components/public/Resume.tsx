import { useSingleton } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Download, Eye, FileText, TrendingUp } from 'lucide-react';
import { trackEvent } from '../../lib/store';

export function Resume() {
  const resume = useSingleton('resume');

  const isPdf =
    resume.file_url.toLowerCase().endsWith('.pdf') ||
    resume.file_name.toLowerCase().endsWith('.pdf') ||
    resume.file_url.includes('application/pdf');

  const onDownload = () => {
    trackEvent('resume_download');
    const a = document.createElement('a');
    a.href = resume.file_url;
    a.download = resume.file_name || 'resume';
    a.click();
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
                <button onClick={onDownload} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105"><Download size={18} /> Download</button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
