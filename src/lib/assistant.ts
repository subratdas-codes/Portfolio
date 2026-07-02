// ============================================================================
// AI Portfolio Assistant — a rule-based conversational assistant that answers
// naturally using LIVE portfolio data. Supports text + voice (Web Speech API):
// speech recognition for input and speech synthesis (TTS) for output.
//
// The AI ALWAYS reads from getDB() at question time, so any admin change
// (profile, education, projects, etc.) is reflected immediately — no restart
// needed.
// ============================================================================

import { getDB } from './store';

export interface AssistantContext {
  onNavigate?: (target: string) => void;
  onDownloadResume?: () => void;
  onOpenUrl?: (url: string) => void;
}

export interface AssistantReply {
  text: string;
  action?: { type: 'navigate' | 'download' | 'open_url'; target: string };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function answerQuestion(query: string, _ctx: AssistantContext = {}): AssistantReply {
  const q = query.toLowerCase();
  const db = getDB();
  const p = db.profile[0];

  // --- About Subrat (uses live profile data, never hardcoded)
  if (/\b(tell me about|who is|about)\b.*subrat|about you|about subrat|introduce/.test(q)) {
    return {
      text: p.name + ' is a ' + p.role + '. ' + p.tagline + ' He has ' + p.years_experience + '+ years of hands-on experience building full-stack applications. ' + p.availability_note + '.',
    };
  }

  // --- Projects (shows ALL projects, not just 4)
  if (/project/.test(q)) {
    const list = db.projects.map((x) => '• ' + x.title + ' — ' + x.short_description).join('\n');
    return {
      text: 'Here are Subrat\'s projects (' + db.projects.length + ' total):\n' + list + '\n\nScroll to the Projects section for full details including live demos and GitHub links.',
      action: { type: 'navigate', target: '#projects' },
    };
  }

  // --- Certificates
  if (/certif/.test(q)) {
    const list = db.certificates.map((c) => '• ' + c.name + ' (' + c.organization + ')').join('\n');
    return { text: 'Subrat holds these certifications:\n' + list, action: { type: 'navigate', target: '#certificates' } };
  }

  // --- Education (uses live data, reflects "Completed" vs "Pursuing")
  if (/educat|college|university|degree|study/.test(q)) {
    const list = db.education.map((e) => '• ' + e.degree + ' at ' + e.institution + ' (' + e.start_date + '–' + e.end_date + '), CGPA ' + e.cgpa).join('\n');
    return { text: 'Subrat\'s education:\n' + list, action: { type: 'navigate', target: '#education' } };
  }

  // --- Skills
  if (/skill|tech|stack/.test(q)) {
    const top = db.skills.slice(0, 8).map((s) => s.name).join(', ');
    return { text: 'Subrat\'s core skills include ' + top + ', among others. Visit the Skills section to see them grouped by category.', action: { type: 'navigate', target: '#skills' } };
  }

  // --- Experience
  if (/experience|work|intern|job/.test(q)) {
    const list = db.experience.map((x) => '• ' + x.role + ' at ' + x.company + ' (' + x.start_date + '–' + x.end_date + ')').join('\n');
    return { text: 'Subrat\'s experience:\n' + list, action: { type: 'navigate', target: '#experience' } };
  }

  // --- Resume download
  if (/resume|cv|download/.test(q)) {
    return { text: 'Sure! Downloading Subrat\'s resume now.', action: { type: 'download', target: 'resume' } };
  }

  // --- GitHub
  if (/github|repo|code/.test(q)) {
    return { text: 'Opening Subrat\'s GitHub profile (' + p.github_username + ')...', action: { type: 'open_url', target: 'https://github.com/' + p.github_username } };
  }

  // --- Contact
  if (/contact|email|reach|hire/.test(q)) {
    return { text: 'You can reach Subrat at ' + p.email + ' or use the contact form below. ' + p.availability_note + '.', action: { type: 'navigate', target: '#contact' } };
  }

  // --- Achievements (shows ALL)
  if (/achiev|award|hackathon|win|volunteer|leadership/.test(q)) {
    const list = db.achievements.map((a) => '• ' + a.title + ' (' + a.type + ', ' + a.date + ')').join('\n');
    return { text: 'Subrat\'s achievements:\n' + list, action: { type: 'navigate', target: '#achievements' } };
  }

  // --- Greeting
  if (/^(hi|hello|hey|namaste|hii)\b/.test(q)) {
    return { text: pick(['Hi there! I\'m Subrat AI. Ask me about Subrat\'s projects, skills, education, achievements, or anything else!', 'Hello! I\'m Subrat AI — how can I help you learn about Subrat today?']) };
  }

  // --- Thanks
  if (/thank|thanks|cheers/.test(q)) {
    return { text: pick(['You\'re welcome! 😊', 'Anytime! Feel free to explore the portfolio.']) };
  }

  // --- Fallback
  return {
    text: 'I can help with: Subrat\'s background, projects, skills, education, experience, certifications, achievements, resume download, GitHub, or contact info. Try asking "Show projects" or "Tell me about Subrat".',
  };
}

// ----------------------------------------------------------- Speech helpers
// Tries to pick the most natural-sounding voice available on the device.
// Priority: Google US English > Samantha > Daniel > any en-US/en-GB voice.
let cachedVoice: SpeechSynthesisVoice | null | undefined = undefined;

function getBestVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  if (!('speechSynthesis' in window)) { cachedVoice = null; return null; }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) { cachedVoice = null; return null; }

  // Priority list — these are the most natural-sounding voices across platforms
  const priority = [
    'Google US English',
    'Google UK English Male',
    'Samantha',           // macOS — very natural
    'Daniel',             // macOS UK — natural
    'Microsoft Aria',     // Windows Edge — natural
    'Microsoft Guy',
    'Microsoft Zira',
    'Alex',               // macOS
    'Karen',              // macOS AU
    'Moira',
  ];

  for (const name of priority) {
    const v = voices.find((v) => v.name === name);
    if (v) { cachedVoice = v; return v; }
  }

  // Fallback: any English voice
  const enVoice = voices.find((v) => v.lang.startsWith('en'));
  cachedVoice = enVoice || voices[0] || null;
  return cachedVoice;
}

// Load voices early (some browsers load them asynchronously)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = undefined; };
}

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[•\n]/g, ' '));
  const voice = getBestVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = 'en-US';
  }
  // Slightly slower rate and natural pitch for a more human feel
  u.rate = 0.95;
  u.pitch = 1.0;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRecognizer(onResult: (text: string) => void, onEnd: () => void): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rec.onresult = (e: any) => {
    const text = e.results[0][0].transcript;
    onResult(text);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  return rec;
}
