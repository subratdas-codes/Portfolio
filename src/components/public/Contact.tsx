import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, CheckCircle2, Github, Linkedin, Twitter, Loader2 } from 'lucide-react';
import { useSingleton, useCollection } from '../../hooks/useStore';
import { emailHref } from '../../lib/store';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { insert, trackEvent } from '../../lib/store';

const ICONS: Record<string, typeof Github> = { Github, Linkedin, Twitter, Mail };

export function Contact() {
  const profile = useSingleton('profile');
  const socials = useCollection('social_links');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.message.trim()) e.message = 'Message is required';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setStatus('sending');

    // 1. Store message in the cloud-synced DB (appears in admin dashboard)
    insert('contact_messages', { ...form, read: false, starred: false, created_at: new Date().toISOString() });
    trackEvent('contact', 'new message from ' + form.name);

    // 2. Email the details straight to the admin inbox via Formsubmit.co.
    //    Free, no API key. Uses the AJAX endpoint so we can read the result.
    //    (First ever submission triggers a one-time "confirm your email"
    //    activation link in the inbox; after that every new contact is
    //    delivered automatically.)
    try {
      const body = new FormData();
      body.append('name', form.name);
      body.append('email', form.email);
      body.append('subject', form.subject || '(no subject)');
      body.append('message', form.message);
      body.append('_template', 'table');
      body.append('_captcha', 'false');
      const res = await fetch('https://formsubmit.co/ajax/subratdas219@gmail.com', {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success === 'false') console.warn('[contact] Formsubmit:', data.message);
      } else {
        console.warn('[contact] Formsubmit responded', res.status);
      }
    } catch (e) {
      // Email is best-effort; the message is safely stored in the dashboard.
      console.warn('[contact] Email notification failed (message still saved):', e);
    }

    // Brief delay for UX
    await new Promise((r) => setTimeout(r, 800));

    setStatus('sent');
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setStatus('idle'), 6000);
  };

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-400 ${errors[key] ? 'border-rose-500' : 'border-white/10'}`} />
      {errors[key] && <p className="mt-1 text-xs text-rose-400">{errors[key]}</p>}
    </div>
  );

  return (
    <section id="contact" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Contact" title="Let's build something" subtitle="Open to internships, full-time roles, and collaborations." />
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-xl font-bold text-white">Get in touch</h3>
              <a href={emailHref(`mailto:${profile.email}`)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-white/5 p-4 transition hover:bg-white/10"><Mail className="text-indigo-400" /> <span className="text-white">{profile.email}</span></a>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4"><Phone className="text-indigo-400" /> <span className="text-white">{profile.phone}</span></div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4"><MapPin className="text-indigo-400" /> <span className="text-white">{profile.location}</span></div>
              <div className="flex gap-3 pt-2">
                {socials.map((s) => { const Icon = ICONS[s.icon] ?? Github; return (
                  <a key={s.id} href={emailHref(s.url)} target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:scale-110 hover:border-indigo-400/50 hover:text-indigo-300"><Icon size={18} /></a>
                ); })}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                {field('name', 'Name')}
                {field('email', 'Email', 'email')}
              </div>
              {field('subject', 'Subject')}
              <div>
                <label className="mb-1 block text-sm text-slate-300">Message</label>
                <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-indigo-400 ${errors.message ? 'border-rose-500' : 'border-white/10'}`} />
                {errors.message && <p className="mt-1 text-xs text-rose-400">{errors.message}</p>}
              </div>

              {status === 'sent' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <CheckCircle2 size={18} />
                  <div>
                    <div className="font-semibold">Message sent successfully!</div>
                    <div className="text-xs text-emerald-400/80">Your message has been delivered. Subrat will get back to you soon.</div>
                  </div>
                </motion.div>
              )}

              <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={status === 'sending'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] disabled:opacity-70">
                {status === 'sending' ? <><Loader2 size={18} className="animate-spin" /> Sending…</>
                  : status === 'sent' ? <><CheckCircle2 size={18} /> Sent! Thank you</>
                  : <><Send size={18} /> Send Message</>}
              </motion.button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
