import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { answerQuestion, speak, stopSpeaking, createRecognizer, isSpeechRecognitionSupported } from '../../lib/assistant';
import { trackEvent } from '../../lib/store';

interface Msg { role: 'user' | 'bot'; text: string }

const SUGGESTIONS = [
  'Tell me about Subrat',
  'Show projects',
  'Show achievements',
  'Show certificates',
  'Show education',
  'Contact Subrat',
];

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', text: "Hi! I'm Subrat AI — your smart portfolio guide. Ask me anything about Subrat's work, skills, projects, or achievements!" },
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [typing, setTyping] = useState(false);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const runAction = (action: NonNullable<ReturnType<typeof answerQuestion>['action']>) => {
    if (action.type === 'navigate') {
      document.querySelector(action.target)?.scrollIntoView({ behavior: 'smooth' });
    } else if (action.type === 'download') {
      document.querySelector('#resume')?.scrollIntoView({ behavior: 'smooth' });
    } else if (action.type === 'open_url') {
      window.open(action.target, '_blank');
    }
  };

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setTyping(true);
    trackEvent('assistant', q.slice(0, 40));
    setTimeout(() => {
      // answerQuestion reads live from getDB() — always uses latest data
      const reply = answerQuestion(q);
      setTyping(false);
      setMessages((m) => [...m, { role: 'bot', text: reply.text }]);
      if (reply.action) setTimeout(() => runAction(reply.action!), 600);
      if (voiceOn) speak(reply.text);
    }, 700);
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    if (!next) stopSpeaking();
  };

  const startListening = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice recognition is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = createRecognizer(
      (text) => { setInput(text); ask(text); },
      () => setListening(false),
    );
    if (rec) {
      recRef.current = rec;
      rec.start();
      setListening(true);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-xl shadow-indigo-500/40"
        aria-label="Open Subrat AI assistant"
      >
        <AnimatePresence mode="wait">
          {open ? <X key="x" size={24} /> : <Bot key="bot" size={24} />}
        </AnimatePresence>
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/40" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-24 right-3 left-3 z-50 flex h-[70vh] max-h-[32rem] w-auto max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl mx-auto sm:left-auto sm:right-6 sm:w-[calc(100vw-3rem)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-500/20 to-cyan-400/20 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400"><Sparkles size={18} className="text-white" /></span>
                <div>
                  <div className="font-semibold text-white">Subrat AI</div>
                  <div className="flex items-center gap-1 text-xs text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online · Ask me anything</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={toggleVoice} title="Toggle voice" className="rounded-lg p-2 text-slate-300 hover:bg-white/10">
                  {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-cyan-400 text-white' : 'bg-white/10 text-slate-200'
                  }`}>{m.text}</div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-slate-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10">{s}</button>
                ))}
              </div>
            )}

            {/* Input bar — fixed layout for mobile */}
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2">
                <button onClick={startListening} title="Voice input"
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask(input); } }}
                  placeholder="Ask me anything..."
                  className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  onClick={() => ask(input)}
                  disabled={!input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                  title="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
