import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, CheckCircle2, Github, Linkedin, Twitter, Loader2 } from 'lucide-react';
import { useSingleton, useCollection } from '../../hooks/useStore';
import { emailHref } from '../../lib/store';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { insertLocal, trackEvent, cryptoId } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const ICONS: Record<string, typeof Github> = { Github, Linkedin, Twitter, Mail };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function Contact() {
  const profile = useSingleton('profile');
  const socials = useCollection('social_links');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.message.trim()) e.message = 'Message is required';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting.current) return; // prevent duplicate submissions while in-flight
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    submitting.current = true;
    setStatus('sending');

    const row = {
      id: cryptoId(),
      name: form.name.trim().slice(0, 120),
      email: form.email.trim().slice(0, 254),
      subject: form.subject.trim().slice(0, 300),
      message: form.message.trim().slice(0, 10000),
      read: false,
      starred: false,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Save the message to Supabase FIRST (the actual write we wait on).
      if (supabase && isSupabaseConfigured) {
        const { error: insertErr } = await supabase.from('contact_messages').insert(row);
        if (insertErr) throw insertErr;
      }

      // 2. Mirror into the local store so the Admin dashboard shows it instantly.
      insertLocal('contact_messages', row);
      trackEvent('contact', 'new message from ' + row.name);

      // 3. Email delivery happens in the BACKGROUND — never blocks showing "Sent!".
      const threadSubject = row.subject ? row.subject : 'Contact from your portfolio';
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.email || 'subratdas219@gmail.com',
          subject: threadSubject,
          threadId: row.id,
          fromName: `${row.name} <${row.email}>`,
          html:
            '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">'
            + `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;white-space:pre-wrap;color:#0f172a">${escapeHtml(row.message)}</div>`
            + `<p style="color:#64748b;font-size:12px;margin:16px 0 0">Replies to this email are delivered to <b>${escapeHtml(row.name)}</b> (${escapeHtml(row.email)}) and saved to the conversation in your admin dashboard.</p>`
            + '</div>',
          replyTo: `"${row.name}" <${row.email}>`,
        }),
      }).catch((err) => {
        // Email is best-effort; the message is safely stored in the dashboard.
        console.warn('[contact] Email notification failed (message still saved):', err);
      });
    } catch (err) {
      console.warn('[contact] Save failed:', err);
      setStatus('idle');
      setErrors({ message: 'Could not save your message. Please try again.' });
      submitting.current = false;
      return;
    }

    setStatus('sent');
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setStatus('idle'), 6000);
    submitting.current = false;
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
