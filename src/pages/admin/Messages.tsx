import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Star, Trash2, Reply, Download, Check, CheckCheck, Search, Send, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { update, remove } from '../../lib/store';
import { Modal } from '../../components/ui/Modal';

export function Messages() {
  const messages = useCollection('contact_messages');
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Open a specific message when arriving from the dashboard's "Recent Messages".
  const openedFromNav = useRef(false);
  useEffect(() => {
    if (openedFromNav.current) return;
    const id = (location.state as { openMessage?: string } | null)?.openMessage;
    if (id && messages.some((x) => x.id === id)) {
      openedFromNav.current = true;
      open(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, location.state]);

  const filtered = messages.filter((m) => {
    if (filter === 'unread' && m.read) return false;
    if (filter === 'starred' && !m.starred) return false;
    if (query && !`${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const activeMsg = messages.find((m) => m.id === active);

  const open = (id: string) => {
    setActive(id);
    setReplyStatus('idle');
    const m = messages.find((x) => x.id === id);
    if (m && !m.read) update('contact_messages', id, { read: true });
    setReply(m?.reply ?? '');
  };

  const closeModal = () => {
    setActive(null);
    setReplyStatus('idle');
  };

  // Send reply email directly to the person who contacted Subrat.
  // Uses Formsubmit.co (hidden iframe) to send from subratdas219@gmail.com,
  // AND opens a mailto link so the admin's email client is ready to send.
  const sendReply = async () => {
    if (!active || !activeMsg || !reply.trim()) return;
    setReplyStatus('sending');

    // 1. Save the reply in the DB (cloud-synced)
    update('contact_messages', active, { reply });

    // 2. Send email to the sender via Formsubmit.co
    //    The reply goes FROM subratdas219@gmail.com TO the sender's email.
    try {
      const iframeName = 'reply-iframe-' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.action = 'https://formsubmit.co/' + activeMsg.email;
      form.method = 'POST';
      form.target = iframeName;
      form.style.display = 'none';

      const fields: Record<string, string> = {
        name: 'Subrat Das',
        email: 'subratdas219@gmail.com',
        _subject: 'Re: ' + (activeMsg.subject || 'Your message to Subrat Das'),
        message: reply,
        _template: 'table',
        _captcha: 'false',
      };

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
      setTimeout(() => { form.remove(); setTimeout(() => iframe.remove(), 5000); }, 2000);
    } catch (e) {
      console.warn('[reply] Formsubmit failed:', e);
    }

    // 3. Also open the admin's email client with a pre-filled reply
    const mailtoLink = `mailto:${activeMsg.email}?subject=${encodeURIComponent('Re: ' + (activeMsg.subject || 'Your message to Subrat Das'))}&body=${encodeURIComponent(reply + '\n\n---\nBest regards,\nSubrat Das\nsubratdas219@gmail.com')}`;
    window.open(mailtoLink, '_blank');

    // Brief delay for UX
    await new Promise((r) => setTimeout(r, 800));
    setReplyStatus('sent');
    setTimeout(() => { closeModal(); }, 2000);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Subject', 'Message', 'Read', 'Starred', 'Date'];
    const rows = messages.map((m) => [m.name, m.email, m.subject, m.message, m.read, m.starred, m.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'messages.csv'; a.click();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
          <p className="text-sm text-slate-400">{messages.filter((m) => !m.read).length} unread of {messages.length} total</p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"><Download size={15} /> Export CSV</button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages..." className="rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-400" />
        </div>
        {(['all', 'unread', 'starred'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-2 text-sm capitalize transition ${filter === f ? 'bg-indigo-500 text-white' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{f}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition hover:bg-white/10 ${m.read ? 'border-white/5 bg-white/[0.02]' : 'border-indigo-400/30 bg-indigo-500/5'}`} onClick={() => open(m.id)}>
            <button onClick={(e) => { e.stopPropagation(); update('contact_messages', m.id, { starred: !m.starred }); }} className={m.starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}><Star size={16} className={m.starred ? 'fill-amber-400' : ''} /></button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`truncate ${m.read ? 'font-medium text-slate-300' : 'font-bold text-white'}`}>{m.name}</span>
                {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />}
                {m.reply && <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">replied</span>}
              </div>
              <p className="truncate text-sm text-slate-400">{m.subject || m.message}</p>
            </div>
            <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{new Date(m.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-500">No messages found.</div>}
      </div>

      <Modal open={!!active} onClose={closeModal} title="Message Details" maxWidth="max-w-xl">
        {activeMsg && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{activeMsg.name}</div>
                <a href={`mailto:${activeMsg.email}`} className="text-sm text-indigo-300 hover:underline">{activeMsg.email}</a>
              </div>
              <div className="flex gap-1">
                <button onClick={() => update('contact_messages', activeMsg.id, { read: !activeMsg.read })} title="Toggle read" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">{activeMsg.read ? <CheckCheck size={16} /> : <Check size={16} />}</button>
                <button onClick={() => { update('contact_messages', activeMsg.id, { starred: !activeMsg.starred }); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><Star size={16} className={activeMsg.starred ? 'fill-amber-400 text-amber-400' : ''} /></button>
                <button onClick={() => { remove('contact_messages', activeMsg.id); closeModal(); }} className="rounded-lg p-2 text-rose-400 hover:bg-white/10"><Trash2 size={16} /></button>
              </div>
            </div>
            {activeMsg.subject && <div className="text-sm font-medium text-slate-300">Subject: {activeMsg.subject}</div>}
            <div className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">{activeMsg.message}</div>

            {/* Show previous reply if exists */}
            {activeMsg.reply && replyStatus === 'idle' && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                <div className="mb-1 text-xs font-semibold text-emerald-400">Previous Reply</div>
                <p className="text-sm text-slate-300">{activeMsg.reply}</p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                {activeMsg.reply ? 'New Reply' : 'Reply'}
              </label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply to send to this person's email..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
              <p className="mt-1 text-xs text-slate-500">
                <Mail size={11} className="inline" /> Reply will be sent to <span className="text-indigo-300">{activeMsg.email}</span> and your email client will open.
              </p>
            </div>

            {replyStatus === 'sent' && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 size={18} />
                <span>Reply sent! Your email client has opened with the reply to {activeMsg.email}.</span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">Close</button>
              <a href={`mailto:${activeMsg.email}?subject=${encodeURIComponent('Re: ' + (activeMsg.subject || ''))}`} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
                <ExternalLink size={14} /> Open in Email
              </a>
              <button onClick={sendReply} disabled={!reply.trim() || replyStatus === 'sending'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {replyStatus === 'sending' ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : replyStatus === 'sent' ? <><CheckCircle2 size={14} /> Sent!</>
                  : <><Send size={14} /> Send Reply</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
