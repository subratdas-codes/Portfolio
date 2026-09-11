import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Star, Trash2, Reply, Download, Check, CheckCheck, Search, Send, Loader2, CheckCircle2, ExternalLink, RefreshCw, User, AlertTriangle } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';
import { update, remove, insertLocal, cryptoId, syncFromCloud } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import type { ContactMessage, ContactReply } from '../../lib/types';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

async function getAdminToken(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    let { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Expired / missing session — try one refresh before giving up.
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) data = { session: refreshed.session };
    }
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function Messages() {
  const messages = useCollection('contact_messages');
  const replies = useCollection('contact_replies');
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  const syncedOnce = useRef(false);

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

  // Pull email replies in from Gmail on first open (then Realtime keeps it live).
  useEffect(() => {
    if (syncedOnce.current) return;
    syncedOnce.current = true;
    syncEmailReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = messages.filter((m) => {
    if (filter === 'unread' && m.read) return false;
    if (filter === 'starred' && !m.starred) return false;
    if (query && !`${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const activeMsg = messages.find((m) => m.id === active);
  const thread = (replies as ContactReply[])
    .filter((r) => r.message_id === active)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const open = (id: string) => {
    setActive(id);
    setReplyStatus('idle');
    setReplying(false);
    const m = messages.find((x) => x.id === id);
    if (m && !m.read) update('contact_messages', id, { read: true });
    setReply('');
  };

  const closeModal = () => {
    setActive(null);
    setReplyStatus('idle');
  };

  const sendReply = async () => {
    if (!active || !activeMsg || !reply.trim() || replying) return;
    const m = activeMsg as ContactMessage;
    setReplying(true);
    setReplyStatus('sending');

    const replyBody = reply.trim().slice(0, 10000);
    const replyRow = {
      id: cryptoId(),
      message_id: active,
      sender: 'admin' as const,
      body: replyBody,
      created_at: new Date().toISOString(),
    };

    // 1. Persist locally always; to Supabase (Realtime) best-effort. A failed
    //    insert (e.g. expired session) must NOT block the actual email send.
    try {
      if (supabase && isSupabaseConfigured) {
        const { error } = await supabase.from('contact_replies').insert(replyRow);
        if (error) console.warn('[reply] Supabase insert failed (email will still send):', error);
      }
    } catch (e) {
      console.warn('[reply] Supabase insert failed (email will still send):', e);
    }
    insertLocal('contact_replies', replyRow);
    setReplyStatus('sent');
    setReply('');

    // 2. Email it directly to the visitor — background, never blocks the UI.
    const subject = `Re: [Portfolio #${active}] ${m.subject || 'Your message to Subrat Das'}`;
    const bodyHtml =
      '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">'
      + `<p style="margin:0 0 16px">Hi <b>${escapeHtml(m.name)}</b>,</p>`
      + `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;white-space:pre-wrap;color:#0f172a">${escapeHtml(replyBody)}</div>`
      + '<p style="margin:24px 0 0">Best regards,</p>'
      + '<p style="margin:4px 0 0"><b>Subrat Das</b></p>'
      + '<p style="color:#64748b;font-size:12px;margin:16px 0 0">You received this in reply to your message sent through subratdas.vercel.app.</p>'
      + '</div>';
    const token = await getAdminToken();
    try {
      const resp = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: m.email,
          subject,
          html: bodyHtml,
          fromName: 'Subrat Das',
          replyTo: 'subratdas219@gmail.com',
          threadId: active,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.error || `Email failed (${resp.status})`);
    } catch (err) {
      console.warn('[reply] Email send failed (reply saved in dashboard):', err);
      setReplyError(err instanceof Error ? err.message : 'Email send failed');
      const mailto = `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(replyBody + '\n\n---\nBest regards,\nSubrat Das')}`;
      const gmail = `https://mail.google.com/mail/?view=cm&fs=1&${new URLSearchParams({ to: m.email, su: subject, body: replyBody + '\n\n---\nBest regards,\nSubrat Das' }).toString()}`;
      window.open(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? mailto : gmail, '_blank');
    }
    setReplying(false);

    // Keep modal open so the user can keep chatting on the same thread.
  };

  const syncEmailReplies = async () => {
    const token = await getAdminToken();
    if (!token) {
      setSyncState('error');
      return;
    }
    setSyncState('syncing');
    try {
      const res = await fetch('/api/sync-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'sync failed');
      syncFromCloud();
      setSyncState('done');
    } catch (e) {
      console.warn('[sync-email] Failed:', e);
      setSyncState('error');
    }
    setTimeout(() => setSyncState((s) => (s === 'done' ? 'idle' : s)), 3000);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Subject', 'Message', 'Read', 'Starred', 'Date'];
    const rows = messages.map((m) => [m.name, m.email, m.subject, m.message, m.read, m.starred, m.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'messages.csv'; a.click();
  };

  const focusReplyBox = () => {
    setReplying(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
          <p className="text-sm text-slate-400">{messages.filter((m) => !m.read).length} unread of {messages.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncEmailReplies} disabled={syncState === 'syncing'} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60">
            {syncState === 'syncing' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {syncState === 'done' ? 'Synced!' : 'Sync email replies'}
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"><Download size={15} /> Export CSV</button>
        </div>
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
        {filtered.map((m) => {
          const replyCount = (replies as ContactReply[]).filter((r) => r.message_id === m.id).length;
          return (
            <div key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition hover:bg-white/10 ${m.read ? 'border-white/5 bg-white/[0.02]' : 'border-indigo-400/30 bg-indigo-500/5'}`} onClick={() => open(m.id)}>
              <button onClick={(e) => { e.stopPropagation(); update('contact_messages', m.id, { starred: !m.starred }); }} className={m.starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}><Star size={16} className={m.starred ? 'fill-amber-400' : ''} /></button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`truncate ${m.read ? 'font-medium text-slate-300' : 'font-bold text-white'}`}>{m.name}</span>
                  {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />}
                  {(m.reply || replyCount > 0) && <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">replied ({replyCount || 1})</span>}
                </div>
                <p className="truncate text-sm text-slate-400">{m.subject || m.message}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-slate-500">No messages found.</div>}
      </div>

      {activeMsg && (
        <Modal open={!!active} onClose={closeModal} title="Message Details" maxWidth="max-w-2xl">
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

            {/* Conversation thread — chronological: visitor msg, replies, etc. */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/30 text-indigo-300"><User size={14} /></div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-indigo-300">{activeMsg.name} <span className="font-normal text-slate-500">(visitor)</span></span>
                    <span className="text-slate-500">{new Date(activeMsg.created_at).toLocaleString()}</span>
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-white/5 p-3 text-sm text-slate-200">{activeMsg.message}</div>
                </div>
              </div>

              {thread.map((r) => (
                <div key={r.id} className="flex gap-3">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${r.sender === 'admin' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-indigo-500/30 text-indigo-300'}`}>
                    {r.sender === 'admin' ? <Mail size={14} /> : <User size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className={`font-semibold ${r.sender === 'admin' ? 'text-emerald-300' : 'text-indigo-300'}`}>
                        {r.sender === 'admin' ? 'Subrat (admin)' : 'Visitor'} <span className="font-normal text-slate-500">· email</span>
                      </span>
                      <span className="text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className={`whitespace-pre-wrap rounded-xl ${r.sender === 'admin' ? 'rounded-tl-sm bg-emerald-500/10 p-3 text-sm text-emerald-100' : 'rounded-tl-sm bg-white/5 p-3 text-sm text-slate-200'}`}>{r.body}</div>
                  </div>
                </div>
              ))}

              {/* Legacy single-reply column (pre-thread data) shown if no thread rows */}
              {thread.length === 0 && activeMsg.reply && (
                <div className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/30 text-emerald-300"><Mail size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-semibold text-emerald-300">Subrat (admin) · previous reply</div>
                    <div className="whitespace-pre-wrap rounded-xl rounded-tl-sm bg-emerald-500/10 p-3 text-sm text-emerald-100">{activeMsg.reply}</div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">Reply</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} onFocus={focusReplyBox} rows={4} placeholder="Type your reply to send to this person's email..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400" />
              <p className="mt-1 text-xs text-slate-500">
                <Mail size={11} className="inline" /> Reply is emailed directly to <span className="text-indigo-300">{activeMsg.email}</span> and saved in this conversation.
              </p>
            </div>

            {replyStatus === 'sent' && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 size={18} />
                <span>Reply saved in conversation.</span>
              </div>
            )}

            {replyError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Reply saved, but the email to <b>{activeMsg.email}</b> failed{replyError ? `: ${replyError}` : ''}. A Gmail compose window has opened so you can send it manually.
                </span>
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
        </Modal>
      )}
    </div>
  );
}