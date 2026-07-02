import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BadgeCheck, FileText, Award } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Modal } from '../ui/Modal';
import type { Certificate } from '../../lib/types';

// Check if a URL is a Google Drive link (can't be displayed as an <img>)
function isDriveLink(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

export function Certificates() {
  const certs = useCollection('certificates');
  const [zoom, setZoom] = useState<Certificate | null>(null);

  return (
    <section id="certificates" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Certifications" title="Awards & Certifications" subtitle="Verified achievements and professional credentials." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c, i) => {
            const drive = isDriveLink(c.image_url);
            return (
              <Reveal key={c.id} delay={i * 0.08}>
                <motion.div layout className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-cyan-400/40">
                  {/* Image area — for Drive links show a placeholder card */}
                  {drive ? (
                    <button
                      onClick={() => c.verification_url && window.open(c.verification_url, '_blank')}
                      className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-500/10 to-indigo-500/10"
                    >
                      <div className="flex flex-col items-center gap-2 text-cyan-300">
                        <FileText size={40} className="opacity-80" />
                        <span className="text-xs font-medium">View Certificate</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    </button>
                  ) : (
                    <button onClick={() => setZoom(c)} className="relative block aspect-video w-full overflow-hidden">
                      <img src={c.image_url} alt={c.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                    </button>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.organization} className="h-6 w-6 rounded object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <Award size={18} className="text-cyan-400" />
                      )}
                      <span className="text-xs text-slate-400">{c.organization}</span>
                      <BadgeCheck size={16} className="ml-auto text-cyan-400" />
                    </div>
                    <h3 className="mt-2 font-semibold text-white">{c.name}</h3>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Issued {c.issue_date}</span>
                      {c.credential_id && <span className="font-mono">ID: {c.credential_id}</span>}
                    </div>
                    {/* Skills tags */}
                    {c.skills && c.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.skills.map((s) => (
                          <span key={s} className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-300">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      {c.verification_url && (
                        <a href={c.verification_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300 hover:text-cyan-200">
                          {drive ? 'Open Certificate' : 'Verify'} <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title={zoom?.name}>
        {zoom && !isDriveLink(zoom.image_url) && <img src={zoom.image_url} alt={zoom.name} className="w-full rounded-xl" />}
        {zoom && isDriveLink(zoom.image_url) && (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <FileText size={48} className="text-cyan-400" />
            <p className="text-slate-300">This certificate is hosted on Google Drive.</p>
            <a href={zoom.verification_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white">
              Open Certificate <ExternalLink size={15} />
            </a>
          </div>
        )}
      </Modal>
    </section>
  );
}
