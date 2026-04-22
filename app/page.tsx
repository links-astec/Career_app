'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Page = 'home' | 'ats' | 'jobs' | 'interview' | 'study' | 'search' | 'cv';
type Lang = 'en' | 'fr';
type Theme = 'dark' | 'light';
type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
type IVMode = 'technical' | 'behavioral' | 'mixed' | 'ml_deep';
type SearchMode = 'general' | 'jobs' | 'company' | 'salary' | 'skills' | 'news';

interface Job { id: number; role: string; company: string; status: JobStatus; ats: number | null; deadline: string; notes: string; url: string; }
interface Topic { id: number; name: string; desc: string; progress: number; category: string; }
interface CustomQ { id: number; question: string; answer: string; tags: string[]; }
interface ATSResult {
  score: number; keywords_score: number; skills_score: number; experience_score: number; format_score: number; education_match: number;
  verdict: string; keywords_found: string[]; keywords_partial: string[]; keywords_missing: string[];
  strengths: string[]; weaknesses: string[]; suggestions: string[]; recommendations: string; salary_estimate: string;
}
interface IVMessage { role: 'system' | 'user' | 'assistant'; content: string; meta?: Record<string, unknown>; }

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const SEED_JOBS: Job[] = [
  { id: 1, role: 'ML Engineer Intern', company: 'Thales', status: 'applied', ats: 82, deadline: '2026-05-01', notes: '', url: '' },
  { id: 2, role: 'AI Research Intern', company: 'Inria', status: 'interview', ats: 76, deadline: '2026-05-10', notes: 'Interview scheduled May 5', url: '' },
  { id: 3, role: 'Data Scientist Intern', company: 'Orange', status: 'saved', ats: null, deadline: '2026-04-25', notes: '', url: '' },
];

const SEED_TOPICS: Topic[] = [
  { id: 1, name: 'Transformers & Attention', desc: 'Self-attention, multi-head, BERT, GPT', progress: 70, category: 'Deep Learning' },
  { id: 2, name: 'Reinforcement Learning', desc: 'MDP, Q-learning, PPO, actor-critic', progress: 40, category: 'ML' },
  { id: 3, name: 'Convolutional Networks', desc: 'CNN, ResNet, VGG, transfer learning', progress: 85, category: 'Deep Learning' },
  { id: 4, name: 'NLP & Language Models', desc: 'Tokenization, embeddings, seq2seq, LLM fine-tuning', progress: 60, category: 'NLP' },
  { id: 5, name: 'MLOps & Deployment', desc: 'Docker, CI/CD, model serving, MLflow', progress: 20, category: 'Engineering' },
  { id: 6, name: 'Probabilistic ML', desc: 'Bayesian inference, Gaussian processes, VAEs', progress: 30, category: 'ML' },
];

const QBANK = {
  technical: [
    { q: 'Explain the bias-variance tradeoff.', a: 'High bias = underfitting (model too simple), high variance = overfitting (model too complex). Minimize total error by balancing complexity. Use regularization, cross-validation, and ensembles.', tags: ['ML Fundamentals'] },
    { q: 'What is gradient descent and its variants?', a: 'Iterative optimization moving in steepest-descent direction. Batch GD: all data. SGD: single sample. Mini-batch: small batches. Adam/RMSProp/Momentum add adaptive learning rates and momentum.', tags: ['Optimization'] },
    { q: 'How does backpropagation work?', a: 'Computes loss gradients via chain rule backwards from output to input. Each layer gets its local gradient. Parameters updated via those gradients with a learning rate.', tags: ['Neural Networks'] },
    { q: 'Explain CNN vs RNN architectures.', a: 'CNNs use convolutional filters for spatial hierarchy — ideal for images. RNNs maintain hidden state across sequences — ideal for time series/text. LSTMs/GRUs solve vanishing gradients in deep RNNs.', tags: ['Architecture'] },
  ],
  behavioral: [
    { q: 'Tell me about a challenging project.', a: 'Use STAR: Situation, Task, Action, Result. Focus on your specific contribution, technical obstacles overcome, and measurable outcomes. Keep it under 2 minutes.', tags: ['STAR'] },
    { q: 'How do you handle ambiguous requirements?', a: 'Decompose into well-defined sub-problems, ask clarifying questions early, prototype quickly to validate assumptions, iterate based on feedback.', tags: ['Problem Solving'] },
    { q: 'Describe a time you learned something quickly.', a: 'Reference a course project or internship where you mastered a new framework/domain. Emphasize your learning process and the concrete result.', tags: ['Adaptability'] },
    { q: 'Why do you want to work in AI/ML?', a: 'Connect personal passion to concrete examples: projects built, problems solved, academic trajectory at JUNIA. Link to the specific company\'s AI work.', tags: ['Motivation'] },
  ],
  ml: [
    { q: 'Explain attention mechanism in Transformers.', a: 'Computes weighted sum of values via scaled dot-product of queries and keys. Multi-head attention runs parallel subspaces. Enables capturing long-range dependencies without recurrence.', tags: ['Transformers', 'NLP'] },
    { q: 'What regularization techniques exist in deep learning?', a: 'L1 (sparsity), L2 (weight decay), Dropout (random neuron zeroing), BatchNorm (normalize activations), Early stopping. Each targets different overfitting causes.', tags: ['Regularization'] },
    { q: 'When should you use transfer learning?', a: 'Data-scarce, compute-limited, or related domains. Fine-tuning adjusts all weights on new data. Feature extraction freezes the base. Choice depends on data size and domain similarity.', tags: ['Transfer Learning'] },
    { q: 'How do you handle class imbalance?', a: 'Resampling: SMOTE (oversample minority), undersample majority. Algorithm-level: class weights, focal loss. Evaluation: F1, AUC-ROC not accuracy. Always diagnose imbalance first.', tags: ['Data', 'Classification'] },
  ],
};

// ─── I18N ────────────────────────────────────────────────────────────────────
const T: Record<Lang, Record<string, string>> = {
  en: {
    'home.sub': 'Your career at a glance',
    'nav.home': 'Home', 'nav.ats': 'ATS', 'nav.jobs': 'Jobs',
    'nav.iv': 'Prep', 'nav.study': 'Study', 'nav.search': 'Search',
    'status.saved': 'Saved', 'status.applied': 'Applied',
    'status.interview': 'Interview', 'status.offer': 'Offer ✓', 'status.rejected': 'Rejected',
    'iv.mixed': 'Mixed', 'iv.technical': 'Technical', 'iv.behavioral': 'Behavioral', 'iv.ml_deep': 'Deep ML',
    'iv.start': 'Start Mock Interview', 'iv.submit': 'Submit Answer',
    'iv.new': '↺ New Interview', 'iv.end': 'End',
    'iv.practice': '🎤 AI Interview', 'iv.bank': '📚 Question Bank',
    'search.general': '🔍 General', 'search.jobs': '💼 Jobs', 'search.company': '🏢 Company',
    'search.salary': '💰 Salary', 'search.skills': '⚡ Skills', 'search.news': '📰 News',
  },
  fr: {
    'home.sub': 'Votre carrière en un coup d\'œil',
    'nav.home': 'Accueil', 'nav.ats': 'ATS', 'nav.jobs': 'Offres',
    'nav.iv': 'Entretiens', 'nav.study': 'Études', 'nav.search': 'Recherche',
    'status.saved': 'Sauvegardé', 'status.applied': 'Candidaté',
    'status.interview': 'Entretien', 'status.offer': 'Offre ✓', 'status.rejected': 'Refusé',
    'iv.mixed': 'Mixte', 'iv.technical': 'Technique', 'iv.behavioral': 'Comportemental', 'iv.ml_deep': 'ML Avancé',
    'iv.start': 'Démarrer l\'entretien', 'iv.submit': 'Soumettre',
    'iv.new': '↺ Nouvel entretien', 'iv.end': 'Terminer',
    'iv.practice': '🎤 Entretien IA', 'iv.bank': '📚 Banque',
    'search.general': '🔍 Général', 'search.jobs': '💼 Offres', 'search.company': '🏢 Entreprise',
    'search.salary': '💰 Salaire', 'search.skills': '⚡ Compétences', 'search.news': '📰 Actualités',
  },
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const scoreCol = (s: number) => s >= 75 ? 'var(--g)' : s >= 55 ? 'var(--y)' : 'var(--r)';
const TOPIC_COLS = ['var(--g)', 'var(--b)', 'var(--o)', 'var(--p)', '#ff6b9d', '#00d4ff'];

function md(text: string) {
  if (!text) return '';
  return text
    .replace(/```([\w]*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

function useLS<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === 'undefined') return init;
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [key]);
  return [val, set];
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

const C = {
  card: (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--rad)', padding: 16, ...extra,
  }),
  label: (): React.CSSProperties => ({
    fontFamily: 'var(--mono)', fontSize: '0.58rem', letterSpacing: '0.12em',
    textTransform: 'uppercase' as const, color: 'var(--tx3)', marginBottom: 10,
  }),
  inp: (): React.CSSProperties => ({
    background: 'var(--bg3)', border: '1px solid var(--bdr2)', borderRadius: 'var(--rads)',
    color: 'var(--tx)', fontFamily: 'var(--sans)', fontSize: '0.88rem',
    padding: '12px 14px', width: '100%', outline: 'none', minHeight: 48, WebkitAppearance: 'none' as const,
  }),
};

function Toast({ msg, show }: { msg: string; show: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--nh) + var(--sb) + 10px)',
      left: '50%', transform: `translateX(-50%) translateY(${show ? 0 : 20}px)`,
      background: 'var(--sf2)', border: '1px solid var(--g)', borderRadius: 12,
      padding: '11px 22px', fontSize: '0.8rem', color: 'var(--g)', zIndex: 800,
      fontWeight: 500, opacity: show ? 1 : 0, transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: 'none', whiteSpace: 'nowrap' as const, maxWidth: '90vw',
    }}>{msg}</div>
  );
}

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '6px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g)', animation: `dotpulse 1.2s ease ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function Btn({ children, onClick, v = 'ghost', full, sm, disabled, style = {} }: {
  children: React.ReactNode; onClick?: () => void;
  v?: 'g' | 'b' | 'ghost' | 'danger' | 'p'; full?: boolean; sm?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  const map: Record<string, [string, string, string]> = {
    g: ['var(--g)', '#000', 'none'],
    b: ['var(--b)', '#fff', 'none'],
    ghost: ['var(--sf2)', 'var(--tx2)', '1px solid var(--bdr2)'],
    danger: ['rgba(255,77,109,.12)', 'var(--r)', '1px solid rgba(255,77,109,.25)'],
    p: ['var(--p)', '#fff', 'none'],
  };
  const [bg, col, border] = map[v];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: sm ? '8px 14px' : '12px 20px', borderRadius: sm ? 9 : 12, border,
      fontFamily: 'var(--sans)', fontSize: sm ? '0.74rem' : '0.82rem', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
      minHeight: sm ? 36 : 46, touchAction: 'manipulation', userSelect: 'none',
      background: disabled ? 'var(--sf2)' : bg, color: disabled ? 'var(--tx3)' : col,
      opacity: disabled ? 0.6 : 1, width: full ? '100%' : 'auto', ...style,
    }}>{children}</button>
  );
}

function FInp({ val, set, ph, type = 'text', style = {} }: { val: string; set: (v: string) => void; ph?: string; type?: string; style?: React.CSSProperties }) {
  return (
    <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
      style={{ ...C.inp(), ...style }}
      onFocus={e => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,170,.1)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--bdr2)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function FTA({ val, set, ph, rows = 4, style = {} }: { val: string; set: (v: string) => void; ph?: string; rows?: number; style?: React.CSSProperties }) {
  return (
    <textarea value={val} onChange={e => set(e.target.value)} placeholder={ph} rows={rows}
      style={{ ...C.inp(), resize: 'vertical', minHeight: rows * 26, lineHeight: 1.5, ...style }}
      onFocus={e => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,255,170,.1)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--bdr2)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

function FSel({ val, set, opts, style = {} }: { val: string; set: (v: string) => void; opts: { value: string; label: string }[]; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <select value={val} onChange={e => set(e.target.value)}
        style={{ ...C.inp(), paddingRight: 36, WebkitAppearance: 'none', cursor: 'pointer' }}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none', fontSize: '0.7rem' }}>▾</span>
    </div>
  );
}

function PBar({ val, color, style = {} }: { val: number; color: string; style?: React.CSSProperties }) {
  return (
    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 10, overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', borderRadius: 10, background: color, width: `${Math.max(0, Math.min(100, val))}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function Chip({ label, variant }: { label: string; variant: 'g' | 'y' | 'r' }) {
  const map = { g: ['rgba(0,255,170,.08)', 'rgba(0,255,170,.3)', 'var(--g)'], y: ['rgba(255,214,10,.08)', 'rgba(255,214,10,.3)', 'var(--y)'], r: ['rgba(255,77,109,.08)', 'rgba(255,77,109,.3)', 'var(--r)'] };
  const [bg, border, col] = map[variant];
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: '0.62rem', border: `1px solid ${border}`, background: bg, color: col, fontWeight: 700 }}>{label}</span>;
}

function Badge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, [string, string]> = {
    saved: ['rgba(77,159,255,.12)', 'var(--b)'], applied: ['rgba(168,85,247,.12)', 'var(--p)'],
    interview: ['rgba(0,255,170,.12)', 'var(--g)'], offer: ['rgba(0,255,170,.2)', 'var(--g)'], rejected: ['rgba(255,77,109,.1)', 'var(--r)'],
  };
  const labels: Record<JobStatus, string> = { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer ✓', rejected: 'Rejected' };
  const [bg, col] = map[status];
  return <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--mono)', background: bg, color: col }}>{labels[status]}</span>;
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <style>{`@keyframes sup{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--bdr2)', borderRadius: '24px 24px 0 0', padding: `20px 20px calc(20px + var(--sb))`, width: '100%', maxHeight: '92vh', overflowY: 'auto', animation: 'sup .3s cubic-bezier(.34,1.56,.64,1)' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--bdr2)', margin: '0 auto 18px' }} />
          <div style={{ fontFamily: 'var(--sans)', fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>{title}</div>
          {children}
        </div>
      </div>
    </>
  );
}

function QCard({ q, a, tags, onDelete }: { q: string; a: string; tags: string[]; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)}
      style={{ background: 'var(--sf)', border: `1px solid ${open ? 'var(--b)' : 'var(--bdr)'}`, borderRadius: 'var(--rad)', padding: '14px 16px', marginBottom: 10, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ float: 'right', fontSize: '0.7rem', color: 'var(--tx3)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--b)', letterSpacing: '.1em', marginBottom: 6 }}>{tags[0] || 'Custom'}</div>
      <div style={{ fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.4 }}>{q}</div>
      {open && (
        <div style={{ fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: 1.65, paddingTop: 12, marginTop: 10, borderTop: '1px solid var(--bdr)' }}>
          {a}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            {tags.map(tag => <span key={tag} style={{ fontSize: '.58rem', padding: '2px 8px', borderRadius: 5, background: 'var(--sf2)', color: 'var(--tx3)', fontFamily: 'var(--mono)' }}>{tag}</span>)}
          </div>
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ marginTop: 8, padding: '4px 10px', background: 'rgba(255,77,109,.1)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 6, color: 'var(--r)', fontSize: '0.66rem', cursor: 'pointer', fontFamily: 'var(--mono)' }}>
              ✕ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function GCareers() {
  const [page, setPage] = useState<Page>('home');
  const [lang, setLang] = useLS<Lang>('gc_lang', 'en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [jobs, setJobs] = useLS<Job[]>('gc_jobs5', SEED_JOBS);
  const [topics, setTopics] = useLS<Topic[]>('gc_topics5', SEED_TOPICS);
  const [customQ, setCustomQ] = useLS<CustomQ[]>('gc_cq5', []);
  const [bestATS, setBestATS] = useLS<number>('gc_ats5', 0);
  const [masterCV, setMasterCV] = useLS<string>('gc_cv5', '');

  const [toast, setToast] = useState({ msg: '', show: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const ivChatRef = useRef<HTMLDivElement>(null);

  const tr = useCallback((k: string) => T[lang][k] || T.en[k] || k, [lang]);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  const goPage = (p: Page) => { setPage(p); scrollRef.current?.scrollTo(0, 0); };

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gc_theme');
      const nextTheme: Theme = saved === '"light"' || saved === 'light'
        ? 'light'
        : saved === '"dark"' || saved === 'dark'
          ? 'dark'
          : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      setTheme(nextTheme);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('gc_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  // ── ATS ──────────────────────────────────────────────────────────────
  const [cvText, setCvText] = useState('');
  const [jTitle, setJTitle] = useState('');
  const [jCo, setJCo] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jLang, setJLang] = useState('en');
  const [atsRes, setAtsRes] = useState<ATSResult | null>(null);
  const [atsMkt, setAtsMkt] = useState<{answer?: string; sources?: {title:string;url:string}[]} | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsView, setAtsView] = useState<'input' | 'result'>('input');

  const runATS = async () => {
    if (!cvText.trim() || !jDesc.trim()) { showToast('⚠ Add CV and job description'); return; }
    setAtsLoading(true);
    try {
      const r = await fetch('/api/ats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText, jobTitle: jTitle, company: jCo, jobDescription: jDesc, jobLang: jLang, responseLang: lang }),
      });
      const d = await r.json();
      if (d.result) {
        setAtsRes(d.result); setAtsMkt(d.marketContext || null);
        setAtsView('result');
        if (d.result.score > bestATS) setBestATS(d.result.score);
      } else showToast('⚠ Analysis failed — check your API keys');
    } catch { showToast('⚠ Network error'); }
    setAtsLoading(false);
  };

  // ── SEARCH ────────────────────────────────────────────────────────────
  const [sQuery, setSQuery] = useState('');
  const [sMode, setSMode] = useState<SearchMode>('general');
  const [sResult, setSResult] = useState<{summary?: string; results?: {title:string;url:string;snippet:string;date?:string}[]} | null>(null);
  const [sLoading, setSLoading] = useState(false);

  const runSearch = async () => {
    if (!sQuery.trim()) { showToast('⚠ Enter a search query'); return; }
    setSLoading(true);
    try {
      const r = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sQuery, mode: sMode, lang }),
      });
      setSResult(await r.json());
    } catch { showToast('⚠ Search failed'); }
    setSLoading(false);
  };

  // ── INTERVIEW ─────────────────────────────────────────────────────────
  const [ivRole, setIvRole] = useState('');
  const [ivCo, setIvCo] = useState('');
  const [ivMode, setIvMode] = useState<IVMode>('mixed');
  const [ivPhase, setIvPhase] = useState<'setup' | 'active' | 'complete'>('setup');
  const [ivHistory, setIvHistory] = useState<IVMessage[]>([]);
  const [ivAnswer, setIvAnswer] = useState('');
  const [ivLoading, setIvLoading] = useState(false);
  const [ivQNum, setIvQNum] = useState(0);
  const ivTotal = 6;
  const [ivFinal, setIvFinal] = useState<Record<string, unknown> | null>(null);
  const [ivTab, setIvTab] = useState<'practice' | 'bank'>('practice');
  const [ivBankTab, setIvBankTab] = useState<keyof typeof QBANK>('technical');

  const scrollIVChat = () => setTimeout(() => ivChatRef.current?.scrollTo(0, ivChatRef.current.scrollHeight), 120);

  const startIV = async () => {
    if (!ivRole.trim()) { showToast('⚠ Enter a target role'); return; }
    setIvLoading(true);
    setIvHistory([]); setIvQNum(0); setIvFinal(null);
    try {
      const r = await fetch('/api/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', role: ivRole, company: ivCo, mode: ivMode, totalQuestions: ivTotal, lang, cvSnippet: masterCV.slice(0, 400) }),
      });
      const d = await r.json();
      if (d.success) {
        const msg: IVMessage = { role: 'assistant', content: d.data.message || '', meta: d.data };
        setIvHistory([msg]);
        setIvQNum(1);
        setIvPhase('active');
        scrollIVChat();
      } else showToast('⚠ Failed to start — check API key');
    } catch { showToast('⚠ Network error'); }
    setIvLoading(false);
  };

  const submitIVAnswer = async () => {
    if (!ivAnswer.trim()) { showToast('⚠ Type your answer first'); return; }
    const userMsg: IVMessage = { role: 'user', content: ivAnswer };
    const newHistory = [...ivHistory, userMsg];
    setIvHistory(newHistory);
    setIvAnswer('');
    setIvLoading(true);
    scrollIVChat();
    try {
      const apiHist = newHistory.map(m => ({ role: m.role, content: m.content }));
      const r = await fetch('/api/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'answer', role: ivRole, company: ivCo, mode: ivMode, history: apiHist, userAnswer: ivAnswer, questionNumber: ivQNum, totalQuestions: ivTotal, lang }),
      });
      const d = await r.json();
      if (d.success) {
        const isLast = d.data.type === 'final_feedback';
        const content = isLast ? (d.data.feedback?.model_answer_hint ? `Great, that completes our interview! Here's some final feedback on your last answer: ${d.data.feedback.model_answer_hint}` : 'That concludes the interview!') : (d.data.next_question?.message || '');
        const aMsg: IVMessage = { role: 'assistant', content, meta: d.data };
        const finalHistory = [...newHistory, aMsg];
        setIvHistory(finalHistory);
        if (isLast) {
          setIvPhase('complete');
          // Get full eval
          const evalR = await fetch('/api/interview', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'final', history: finalHistory.map(m => ({ role: m.role, content: m.content })), role: ivRole, company: ivCo, mode: ivMode, lang }),
          });
          const evalD = await evalR.json();
          if (evalD.success) setIvFinal(evalD.data);
        } else {
          setIvQNum(n => n + 1);
        }
        scrollIVChat();
      }
    } catch { showToast('⚠ Error processing answer'); }
    setIvLoading(false);
  };

  // ── STUDY ─────────────────────────────────────────────────────────────
  const [stQuery, setStQuery] = useState('');
  const [stLang, setStLang] = useState(lang);
  const [stResult, setStResult] = useState<{explanation?: string; sources?: {title:string;url:string}[]} | null>(null);
  const [stLoading, setStLoading] = useState(false);
  const [quizData, setQuizData] = useState<{topic?: string; questions?: {question:string;options:string[];correct:string;explanation:string}[]} | null>(null);
  const [quizAns, setQuizAns] = useState<Record<number, string>>({});
  const [quizDone, setQuizDone] = useState(false);

  const explainTopic = async (override?: string) => {
    const q = override || stQuery;
    if (!q.trim()) { showToast('⚠ Enter a topic'); return; }
    if (override) setStQuery(override);
    setStLoading(true); setQuizData(null); setQuizDone(false);
    try {
      const r = await fetch('/api/study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: q, lang: stLang, mode: 'explain' }),
      });
      setStResult(await r.json());
    } catch { showToast('⚠ Failed'); }
    setStLoading(false);
  };

  const genQuiz = async () => {
    if (!stQuery.trim()) { showToast('⚠ Enter a topic first'); return; }
    setStLoading(true);
    try {
      const r = await fetch('/api/study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: stQuery, lang: stLang, mode: 'quiz' }),
      });
      const d = await r.json();
      setQuizData(d.quiz); setQuizAns({}); setQuizDone(false); setStResult(null);
    } catch { showToast('⚠ Failed'); }
    setStLoading(false);
  };

  // ── CV IMPROVE ────────────────────────────────────────────────────────
  const [cvSection, setCvSection] = useState('');
  const [cvTarget, setCvTarget] = useState('');
  const [cvImproved, setCvImproved] = useState('');
  const [cvLoading, setCvLoading] = useState(false);

  const improveCV = async () => {
    if (!cvSection.trim()) { showToast('⚠ Paste a section first'); return; }
    setCvLoading(true);
    try {
      const r = await fetch('/api/cv-improve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: cvSection, targetRole: cvTarget, lang }),
      });
      const d = await r.json();
      setCvImproved(d.improved || '');
    } catch { showToast('⚠ Failed'); }
    setCvLoading(false);
  };

  // ── JOB CRUD ──────────────────────────────────────────────────────────
  const [jobSheet, setJobSheet] = useState(false);
  const [jfRole, setJfRole] = useState(''); const [jfCo, setJfCo] = useState('');
  const [jfSt, setJfSt] = useState<JobStatus>('saved'); const [jfDl, setJfDl] = useState('');
  const [jfAts, setJfAts] = useState(''); const [jfUrl, setJfUrl] = useState(''); const [jfNotes, setJfNotes] = useState('');

  const saveJob = () => {
    if (!jfRole.trim() || !jfCo.trim()) { showToast('⚠ Role and company required'); return; }
    setJobs(prev => [...prev, { id: Date.now(), role: jfRole, company: jfCo, status: jfSt, ats: jfAts ? parseInt(jfAts) : null, deadline: jfDl, notes: jfNotes, url: jfUrl }]);
    setJobSheet(false);
    [setJfRole, setJfCo, setJfDl, setJfAts, setJfUrl, setJfNotes].forEach(f => f(''));
    setJfSt('saved');
    showToast(lang === 'fr' ? '✓ Candidature ajoutée' : '✓ Application saved');
  };

  const cycleStatus = (id: number) => {
    const cyc: JobStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected'];
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: cyc[(cyc.indexOf(j.status) + 1) % cyc.length] } : j));
  };

  // ── TOPIC CRUD ────────────────────────────────────────────────────────
  const [topicSheet, setTopicSheet] = useState(false);
  const [tfName, setTfName] = useState(''); const [tfDesc, setTfDesc] = useState('');
  const [tfProg, setTfProg] = useState('0'); const [tfCat, setTfCat] = useState('ML');

  const saveTopic = () => {
    if (!tfName.trim()) { showToast('⚠ Name required'); return; }
    setTopics(prev => [...prev, { id: Date.now(), name: tfName, desc: tfDesc || 'No description', progress: Math.min(100, Math.max(0, parseInt(tfProg) || 0)), category: tfCat }]);
    setTopicSheet(false);
    [setTfName, setTfDesc].forEach(f => f('')); setTfProg('0');
    showToast(lang === 'fr' ? '✓ Sujet ajouté' : '✓ Topic added');
  };

  // ── CUSTOM Q ──────────────────────────────────────────────────────────
  const [cqQ, setCqQ] = useState(''); const [cqA, setCqA] = useState('');
  const saveCustomQ = () => {
    if (!cqQ.trim()) { showToast('⚠ Enter a question'); return; }
    setCustomQ(prev => [...prev, { id: Date.now(), question: cqQ, answer: cqA || '—', tags: ['Custom'] }]);
    setCqQ(''); setCqA('');
    showToast(lang === 'fr' ? '✓ Sauvegardé' : '✓ Saved');
  };

  // ── STATS ─────────────────────────────────────────────────────────────
  const jStats = jobs.reduce((a, j) => ({ ...a, [j.status]: (a[j.status as keyof typeof a] || 0) + 1 }), {} as Record<string, number>);

  // ─────────────────────────── RENDER ──────────────────────────────────

  const NAV = [
    { id: 'home' as Page, icon: '⌂', key: 'nav.home' },
    { id: 'ats' as Page, icon: '◈', key: 'nav.ats' },
    { id: 'jobs' as Page, icon: '◎', key: 'nav.jobs' },
    { id: 'interview' as Page, icon: '◇', key: 'nav.iv' },
    { id: 'study' as Page, icon: '◆', key: 'nav.study' },
    { id: 'search' as Page, icon: '⌕', key: 'nav.search' },
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', maxWidth: 480, margin: '0 auto', paddingTop: 'var(--st)', overflow: 'hidden', position: 'fixed', left: '50%', transform: 'translateX(-50%)' }}>

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{ height: 'var(--hh)', background: 'var(--bg2)', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0, zIndex: 10 }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--g)', letterSpacing: '-.04em', flex: 1 }}>
            G<span style={{ color: 'var(--tx3)', fontWeight: 400 }}>_</span>CAREERS
          </div>
          <div style={{ display: 'flex', background: 'var(--sf)', borderRadius: 20, padding: 3, gap: 2, border: '1px solid var(--bdr)' }}>
            {(['en', 'fr'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 10px', borderRadius: 16, fontFamily: 'var(--mono)', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: lang === l ? 'var(--g)' : 'transparent', color: lang === l ? '#000' : 'var(--tx3)', transition: 'all .2s' }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 6px',
              borderRadius: 20,
              border: '1px solid var(--bdr)',
              background: 'var(--sf)',
              color: 'var(--tx2)',
              cursor: 'pointer',
              minWidth: 72,
              transition: 'all .2s',
            }}
          >
            <span style={{ fontFamily: 'var(--mono)', fontSize: '.58rem', letterSpacing: '.08em' }}>
              {theme === 'dark' ? 'DARK' : 'LIGHT'}
            </span>
            <span style={{
              marginLeft: 'auto',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: theme === 'dark' ? 'var(--g)' : 'var(--b)',
              color: theme === 'dark' ? '#00150f' : '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '.7rem',
              fontWeight: 800,
              boxShadow: theme === 'dark' ? '0 0 18px rgba(0,255,170,.22)' : '0 0 18px rgba(47,124,246,.18)',
            }}>
              {theme === 'dark' ? 'D' : 'L'}
            </span>
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,122,61,.1)', border: '1px solid rgba(255,122,61,.3)', borderRadius: 20, padding: '3px 9px', fontFamily: 'var(--mono)', fontSize: '.58rem', color: 'var(--o)' }}>⚡ GROQ</div>
        </div>

        {/* ── SCROLL ─────────────────────────────────────────────── */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as never, paddingBottom: 'calc(var(--nh) + var(--sb) + 16px)' }}>

          {/* ═══ HOME ═══════════════════════════════════════════════ */}
          {page === 'home' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.03em' }}>Mission <span style={{ color: 'var(--g)' }}>Control</span></div>
                  <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{tr('home.sub')}</div>
                </div>
                <Btn v="g" sm onClick={() => goPage('ats')}>+ ATS</Btn>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { val: bestATS > 0 ? `${bestATS}%` : '—', label: lang === 'fr' ? 'Meilleur ATS' : 'Best ATS Score', hint: lang === 'fr' ? 'dernière analyse' : 'last check', col: 'var(--g)' },
                  { val: jobs.length, label: lang === 'fr' ? 'Candidatures' : 'Applications', hint: `${jStats['interview'] || 0} ${lang === 'fr' ? 'entretiens' : 'interviews'}`, col: 'var(--b)' },
                  { val: Object.values(QBANK).flat().length + customQ.length, label: lang === 'fr' ? 'Questions' : 'Q Bank', hint: lang === 'fr' ? 'disponibles' : 'available', col: 'var(--o)' },
                  { val: topics.length, label: lang === 'fr' ? 'Sujets Études' : 'Study Topics', hint: `${topics.filter(t => t.progress >= 100).length} done`, col: 'var(--p)' },
                ].map(({ val, label, hint, col }) => (
                  <div key={label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--rads)', padding: '14px 12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: col }} />
                    <div style={{ fontFamily: 'var(--sans)', fontSize: '2rem', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: col }}>{val}</div>
                    <div style={{ fontSize: '.66rem', color: 'var(--tx3)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: '.6rem', color: 'var(--tx3)', marginTop: 2, opacity: .7 }}>{hint}</div>
                  </div>
                ))}
              </div>

              <div style={C.card({ marginBottom: 12 })}>
                <div style={C.label()}>{lang === 'fr' ? '// Activité Récente' : '// Recent Activity'}</div>
                {[
                  { icon: '◈', bg: 'rgba(0,255,170,.1)', text: lang === 'fr' ? 'Vérif ATS — Ingénieur ML @ Thales · 82%' : 'ATS check — ML Engineer @ Thales · 82%', time: '2h ago' },
                  { icon: '◎', bg: 'rgba(77,159,255,.1)', text: lang === 'fr' ? 'Candidature Stagiaire Rech. IA @ Inria' : 'Applied — AI Research Intern @ Inria', time: lang === 'fr' ? 'Hier' : 'Yesterday' },
                  { icon: '◇', bg: 'rgba(168,85,247,.1)', text: lang === 'fr' ? 'Pratiqué 4 questions entretien ML' : 'Practiced 4 ML interview questions', time: lang === 'fr' ? 'Il y a 2 jours' : '2 days ago' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--bdr)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{a.icon}</div>
                    <div>
                      <div style={{ fontSize: '.78rem', color: 'var(--tx2)', lineHeight: 1.4 }}>{a.text}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--tx3)', marginTop: 3, fontFamily: 'var(--mono)' }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={C.card()}>
                <div style={C.label()}>{lang === 'fr' ? '// Échéances à Venir' : '// Upcoming Deadlines'}</div>
                {jobs.filter(j => j.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 4).map((j, i) => (
                  <div key={j.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, position: 'relative' }}>
                    {i < 3 && <div style={{ position: 'absolute', left: 5, top: 14, bottom: 0, width: 1, background: 'var(--bdr)' }} />}
                    <div style={{ width: 11, height: 11, borderRadius: '50%', background: TOPIC_COLS[i], flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '.62rem', color: 'var(--tx3)' }}>{j.deadline}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--tx2)', marginTop: 2 }}>{j.role} — {j.company}</div>
                    </div>
                  </div>
                ))}
                {!jobs.some(j => j.deadline) && (
                  <div style={{ fontSize: '.76rem', color: 'var(--tx3)', textAlign: 'center', padding: '12px 0' }}>
                    {lang === 'fr' ? 'Aucune échéance. Ajoutez des candidatures.' : 'No deadlines yet. Add job applications.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ ATS ════════════════════════════════════════════════ */}
          {page === 'ats' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>ATS <span style={{ color: 'var(--g)' }}>Check</span></div>
                  <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Analyse IA de votre CV' : 'AI-powered CV analysis'}</div>
                </div>
                {atsView === 'result' && <Btn v="ghost" sm onClick={() => setAtsView('input')}>← Back</Btn>}
              </div>

              {atsView === 'input' ? (
                <>
                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Votre CV' : '// Your CV'}</div>
                    <div onClick={() => document.getElementById('cv-upload')?.click()}
                      style={{ border: '2px dashed var(--bdr2)', borderRadius: 'var(--rad)', padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg3)', marginBottom: 12 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 6 }}>📄</div>
                      <div style={{ fontSize: '.82rem', color: 'var(--tx2)', fontWeight: 500 }}>{lang === 'fr' ? 'Appuyer pour télécharger' : 'Tap to upload CV'}</div>
                      <div style={{ fontSize: '.66rem', color: 'var(--tx3)', marginTop: 3 }}>PDF · DOCX · TXT</div>
                    </div>
                    <input id="cv-upload" type="file" accept=".txt,.pdf,.docx" style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const r = new FileReader();
                        r.onload = ev => { const t = (ev.target?.result as string) || ''; setCvText(t.slice(0, 5000)); setMasterCV(t.slice(0, 5000)); showToast('✓ ' + f.name); };
                        r.readAsText(f);
                      }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', color: 'var(--tx3)', fontSize: '.65rem' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--bdr)' }} />
                      {lang === 'fr' ? 'ou coller le texte' : 'or paste text'}
                      <div style={{ flex: 1, height: 1, background: 'var(--bdr)' }} />
                    </div>
                    <FTA val={cvText} set={setCvText} ph={lang === 'fr' ? 'Collez votre CV ici...' : 'Paste your CV here...'} rows={5} />
                  </div>

                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Description du Poste' : '// Job Description'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <FInp val={jTitle} set={setJTitle} ph={lang === 'fr' ? 'Intitulé du poste...' : 'Job title...'} />
                      <FInp val={jCo} set={setJCo} ph={lang === 'fr' ? 'Entreprise...' : 'Company...'} />
                      <FSel val={jLang} set={setJLang} opts={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }]} />
                      <FTA val={jDesc} set={setJDesc} ph={lang === 'fr' ? 'Collez la description complète ici...' : 'Paste the full job description here...'} rows={6} />
                    </div>
                  </div>

                  <Btn v="g" full onClick={runATS} disabled={atsLoading}>
                    {atsLoading ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>◈</span>&nbsp;{lang === 'fr' ? 'Analyse en cours...' : 'Analyzing...'}</> : `◈ ${lang === 'fr' ? 'Analyser le CV' : 'Analyze CV'}`}
                  </Btn>
                </>
              ) : atsRes && (
                <>
                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Score ATS Global' : '// Overall ATS Score'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <svg width="110" height="110" viewBox="0 0 110 110">
                        <circle cx="55" cy="55" r="46" fill="none" stroke="var(--sf2)" strokeWidth="7" />
                        <circle cx="55" cy="55" r="46" fill="none" stroke={scoreCol(atsRes.score)} strokeWidth="7"
                          strokeDasharray="289" strokeDashoffset={289 - (atsRes.score / 100) * 289}
                          strokeLinecap="round" transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                        <text x="55" y="50" textAnchor="middle" style={{ fontFamily: 'var(--sans)', fontSize: '1.8rem', fontWeight: 800, fill: scoreCol(atsRes.score) }}>{atsRes.score}%</text>
                        <text x="55" y="67" textAnchor="middle" style={{ fontSize: '.62rem', fill: 'var(--tx3)' }}>{atsRes.verdict}</text>
                      </svg>
                      <div style={{ flex: 1, minWidth: 130 }}>
                        {[
                          { label: lang === 'fr' ? 'Mots-clés' : 'Keywords', val: atsRes.keywords_score, col: 'var(--g)' },
                          { label: lang === 'fr' ? 'Compétences' : 'Skills', val: atsRes.skills_score, col: 'var(--b)' },
                          { label: lang === 'fr' ? 'Expérience' : 'Experience', val: atsRes.experience_score, col: 'var(--o)' },
                          { label: 'Format', val: atsRes.format_score, col: 'var(--p)' },
                          { label: lang === 'fr' ? 'Formation' : 'Education', val: atsRes.education_match, col: 'var(--y)' },
                        ].map(({ label, val, col }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '.7rem', color: 'var(--tx2)', width: 80, flexShrink: 0 }}>{label}</span>
                            <PBar val={val} color={col} />
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '.62rem', color: 'var(--tx2)', width: 28, textAlign: 'right' }}>{val}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {atsRes.salary_estimate && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,255,170,.05)', borderRadius: 8, border: '1px solid rgba(0,255,170,.15)', fontSize: '.74rem', color: 'var(--g)', fontFamily: 'var(--mono)' }}>
                        💰 {atsRes.salary_estimate}
                      </div>
                    )}
                  </div>

                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Forces & Faiblesses' : '// Strengths & Weaknesses'}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.64rem', color: 'var(--g)', fontFamily: 'var(--mono)', marginBottom: 6 }}>✓ {lang === 'fr' ? 'Forces' : 'Strengths'}</div>
                        {(atsRes.strengths || []).map((s, i) => <div key={i} style={{ fontSize: '.74rem', color: 'var(--tx2)', marginBottom: 5, paddingLeft: 8, borderLeft: '2px solid var(--g)' }}>{s}</div>)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.64rem', color: 'var(--r)', fontFamily: 'var(--mono)', marginBottom: 6 }}>✗ {lang === 'fr' ? 'Faiblesses' : 'Weaknesses'}</div>
                        {(atsRes.weaknesses || []).map((s, i) => <div key={i} style={{ fontSize: '.74rem', color: 'var(--tx2)', marginBottom: 5, paddingLeft: 8, borderLeft: '2px solid var(--r)' }}>{s}</div>)}
                      </div>
                    </div>
                  </div>

                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Analyse des Mots-clés' : '// Keyword Analysis'}</div>
                    {[
                      { label: lang === 'fr' ? '✓ Trouvé' : '✓ Found', items: atsRes.keywords_found, v: 'g' as const },
                      { label: lang === 'fr' ? '⚡ Partiel' : '⚡ Partial', items: atsRes.keywords_partial, v: 'y' as const },
                      { label: lang === 'fr' ? '✗ Manquants' : '✗ Missing', items: atsRes.keywords_missing, v: 'r' as const },
                    ].map(({ label, items, v }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '.64rem', color: v === 'g' ? 'var(--g)' : v === 'y' ? 'var(--y)' : 'var(--r)', fontFamily: 'var(--mono)', marginBottom: 6 }}>{label}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(items || []).map(k => <Chip key={k} label={k} variant={v} />)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={C.card({ marginBottom: 12 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Recommandations IA' : '// AI Recommendations'}</div>
                    {(atsRes.suggestions || []).map((s, i) => (
                      <div key={i} style={{ fontSize: '.78rem', color: 'var(--tx2)', marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid var(--b)' }}>▸ {s}</div>
                    ))}
                    {atsRes.recommendations && (
                      <div style={{ fontSize: '.76rem', color: 'var(--tx2)', lineHeight: 1.75, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bdr)' }}>
                        {atsRes.recommendations}
                      </div>
                    )}
                  </div>

                  {atsMkt && (
                    <div style={C.card({ marginBottom: 12 })}>
                      <div style={C.label()}>⌕ {lang === 'fr' ? 'Contexte Marché' : 'Market Context'}</div>
                      {atsMkt.answer && <div style={{ fontSize: '.76rem', color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 8 }}>{atsMkt.answer}</div>}
                      {(atsMkt.sources || []).map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '.7rem', color: 'var(--b)', marginBottom: 4 }}>↗ {s.title}</a>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn v="ghost" style={{ flex: 1 }} onClick={() => { if (jTitle && jCo) { setJobs(prev => [...prev, { id: Date.now(), role: jTitle, company: jCo, status: 'saved', ats: atsRes?.score || null, deadline: '', notes: '', url: '' }]); showToast(lang === 'fr' ? '✓ Sauvegardé' : '✓ Saved to tracker'); } else showToast('⚠ Set title & company first'); }}>
                      {lang === 'fr' ? 'Sauvegarder' : 'Save to Tracker'}
                    </Btn>
                    <Btn v="ghost" style={{ flex: 1 }} onClick={() => { setAtsView('input'); setAtsRes(null); }}>
                      {lang === 'fr' ? 'Nouvelle analyse' : 'New Check'}
                    </Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ JOBS ═══════════════════════════════════════════════ */}
          {page === 'jobs' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>Job <span style={{ color: 'var(--g)' }}>Tracker</span></div>
                  <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Votre pipeline de candidatures' : 'Your application pipeline'}</div>
                </div>
                <Btn v="g" sm onClick={() => setJobSheet(true)}>{lang === 'fr' ? '+ Ajouter' : '+ Add'}</Btn>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { val: jStats['saved'] || 0, label: tr('status.saved'), col: 'var(--b)' },
                  { val: jStats['applied'] || 0, label: tr('status.applied'), col: 'var(--p)' },
                  { val: jStats['interview'] || 0, label: tr('status.interview'), col: 'var(--g)' },
                  { val: jStats['offer'] || 0, label: tr('status.offer'), col: 'var(--o)' },
                ].map(({ val, label, col }) => (
                  <div key={label} style={{ background: 'var(--sf)', border: '1px solid var(--bdr)', borderRadius: 'var(--rads)', padding: '14px 12px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: col }} />
                    <div style={{ fontFamily: 'var(--sans)', fontSize: '2rem', fontWeight: 800, color: col, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: '.66rem', color: 'var(--tx3)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tx3)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>◎</div>
                  <div style={{ fontSize: '.82rem' }}>{lang === 'fr' ? 'Aucune candidature. Ajoutez-en une!' : 'No applications yet. Add one!'}</div>
                </div>
              ) : jobs.map(j => (
                <div key={j.id} style={C.card({ marginBottom: 10 })}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: '.92rem', fontWeight: 700 }}>{j.role}</div>
                      <div style={{ fontSize: '.74rem', color: 'var(--tx2)', marginTop: 2 }}>{j.company}</div>
                    </div>
                    <Badge status={j.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: j.notes ? 8 : 10 }}>
                    {j.ats && <span style={{ fontFamily: 'var(--mono)', fontSize: '.68rem', fontWeight: 700, color: scoreCol(j.ats) }}>{j.ats}% ATS</span>}
                    {j.deadline && <span style={{ fontSize: '.66rem', color: 'var(--tx3)' }}>📅 {j.deadline}</span>}
                    {j.url && <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.66rem', color: 'var(--b)' }}>↗ Link</a>}
                  </div>
                  {j.notes && <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginBottom: 10, padding: '6px 8px', background: 'var(--bg3)', borderRadius: 6 }}>{j.notes}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn v="ghost" sm style={{ flex: 1 }} onClick={() => cycleStatus(j.id)}>⟳ {tr(`status.${j.status}`)}</Btn>
                    <Btn v="danger" sm onClick={() => { setJobs(prev => prev.filter(x => x.id !== j.id)); showToast('Deleted'); }}>✕</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ INTERVIEW ══════════════════════════════════════════ */}
          {page === 'interview' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>Interview <span style={{ color: 'var(--g)' }}>Prep</span></div>
                  <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Entretiens simulés & banque de questions' : 'AI mock interviews & question bank'}</div>
                </div>
                <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,122,61,.1)', border: '1px solid rgba(255,122,61,.3)', borderRadius: 20, padding: '3px 9px', fontFamily: 'var(--mono)', fontSize: '.58rem', color: 'var(--o)' }}>⚡ GROQ</div>
              </div>

              {/* Practice / Bank toggle */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {([['practice', tr('iv.practice')], ['bank', tr('iv.bank')]] as [typeof ivTab, string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setIvTab(id)} style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: '.74rem', fontWeight: 600, cursor: 'pointer',
                    border: '1px solid var(--bdr)', background: ivTab === id ? 'var(--g)' : 'transparent',
                    color: ivTab === id ? '#000' : 'var(--tx3)', fontFamily: 'var(--sans)', transition: 'all .18s',
                  }}>{label}</button>
                ))}
              </div>

              {/* ── PRACTICE TAB ── */}
              {ivTab === 'practice' && (
                <>
                  {ivPhase === 'setup' && (
                    <div style={C.card()}>
                      <div style={C.label()}>{lang === 'fr' ? '// Configurer l\'entretien' : '// Configure Interview'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <FInp val={ivRole} set={setIvRole} ph={lang === 'fr' ? 'Poste cible (ex: Ingénieur ML)' : 'Target role (e.g. ML Engineer)'} />
                        <FInp val={ivCo} set={setIvCo} ph={lang === 'fr' ? 'Entreprise (optionnel)' : 'Company (optional)'} />
                        <FSel val={ivMode} set={v => setIvMode(v as IVMode)} opts={[
                          { value: 'mixed', label: tr('iv.mixed') + ' — ' + (lang === 'fr' ? 'Technique + Comportemental' : 'Technical + Behavioral') },
                          { value: 'technical', label: tr('iv.technical') + ' — ' + (lang === 'fr' ? 'Questions techniques' : 'Technical depth') },
                          { value: 'behavioral', label: tr('iv.behavioral') + ' — ' + (lang === 'fr' ? 'Questions STAR' : 'STAR format') },
                          { value: 'ml_deep', label: tr('iv.ml_deep') + ' — ML/AI Theory' },
                        ]} />
                        <div style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 8, fontSize: '.72rem', color: 'var(--tx3)' }}>
                          {lang === 'fr' ? `📋 ${ivTotal} questions · ~${ivTotal * 3} min · Feedback détaillé + Note 1-10 par réponse` : `📋 ${ivTotal} questions · ~${ivTotal * 3} min · Detailed feedback + Score 1-10 per answer`}
                        </div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <Btn v="g" full onClick={startIV} disabled={ivLoading}>
                          {ivLoading ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>◈</span>&nbsp;{lang === 'fr' ? 'Démarrage...' : 'Starting...'}</> : `🎤 ${tr('iv.start')}`}
                        </Btn>
                      </div>
                    </div>
                  )}

                  {ivPhase === 'active' && (
                    <>
                      {/* Progress */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--tx3)', marginBottom: 5, fontFamily: 'var(--mono)' }}>
                          <span>{ivRole}{ivCo ? ` @ ${ivCo}` : ''}</span>
                          <span>Q {ivQNum}/{ivTotal}</span>
                        </div>
                        <PBar val={(ivQNum / ivTotal) * 100} color="var(--g)" />
                      </div>

                      {/* Chat log */}
                      <div ref={ivChatRef} style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, padding: '4px 0' }}>
                        {ivHistory.map((msg, i) => {
                          const isUser = msg.role === 'user';
                          const meta = msg.meta as Record<string, unknown> | undefined;
                          const feedback = meta?.feedback as Record<string, unknown> | undefined;
                          const nextQuestion = meta?.next_question as Record<string, unknown> | undefined;
                          const score = typeof feedback?.score === 'number' ? feedback.score : 0;
                          const scoreLabel = typeof feedback?.scoreLabel === 'string' ? feedback.scoreLabel : '';
                          const whatWentWell = Array.isArray(feedback?.what_went_well) ? feedback.what_went_well.filter((s): s is string => typeof s === 'string') : [];
                          const improvements = Array.isArray(feedback?.improvements) ? feedback.improvements.filter((s): s is string => typeof s === 'string') : [];
                          const modelAnswerHint = typeof feedback?.model_answer_hint === 'string' ? feedback.model_answer_hint : '';
                          const nextCategory = typeof nextQuestion?.category === 'string' ? nextQuestion.category : '';
                          const nextDifficulty = typeof nextQuestion?.difficulty === 'string' ? nextQuestion.difficulty : '';
                          return (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '90%', padding: '12px 14px', lineHeight: 1.6, fontSize: '.8rem',
                                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: isUser ? 'var(--b)' : 'var(--sf)', border: isUser ? 'none' : '1px solid var(--bdr)',
                                color: isUser ? '#fff' : 'var(--tx2)',
                              }}>{msg.content}</div>

                              {/* Feedback block */}
                              {!isUser && feedback && (() => {
                                const fb = feedback as Record<string, any>;
                                return (
                                  <div style={{ maxWidth: '96%', marginTop: 8, background: 'var(--bg3)', border: '1px solid var(--bdr2)', borderRadius: 12, padding: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                      <div style={{ fontFamily: 'var(--mono)', fontSize: '.65rem', color: scoreCol(score) }}>
                                        {lang === 'fr' ? 'Note' : 'Score'}: {String(fb.score)}/10 — {String(fb.scoreLabel || '')}
                                      </div>
                                    </div>
                                    {(fb.what_went_well as string[] || []).map((s, j) => <div key={j} style={{ fontSize: '.72rem', color: 'var(--g)', marginBottom: 3 }}>✓ {s}</div>)}
                                    {(fb.improvements as string[] || []).map((s, j) => <div key={j} style={{ fontSize: '.72rem', color: 'var(--y)', marginBottom: 3 }}>▲ {s}</div>)}
                                    {fb.model_answer_hint && <div style={{ fontSize: '.7rem', color: 'var(--tx3)', marginTop: 8, padding: '6px 8px', background: 'var(--sf2)', borderRadius: 6, borderLeft: '2px solid var(--b)' }}>💡 {String(fb.model_answer_hint)}</div>}
                                  </div>
                                );
                              })()}

                              {/* Next Q metadata */}
                              {!isUser && meta?.next_question && (() => {
                                const nq = meta.next_question as Record<string, unknown>;
                                return (
                                  <div style={{ maxWidth: '90%', marginTop: 5, display: 'flex', gap: 5 }}>
                                    <span style={{ padding: '2px 8px', background: 'rgba(77,159,255,.12)', borderRadius: 6, fontSize: '.6rem', color: 'var(--b)', fontFamily: 'var(--mono)' }}>{String(nq.category || '')}</span>
                                    <span style={{ padding: '2px 8px', background: 'rgba(168,85,247,.12)', borderRadius: 6, fontSize: '.6rem', color: 'var(--p)', fontFamily: 'var(--mono)' }}>{String(nq.difficulty || '')}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                        {ivLoading && <div style={{ paddingLeft: 4 }}><Dots /></div>}
                      </div>

                      {/* Answer input */}
                      {!ivLoading && (
                        <>
                          <FTA val={ivAnswer} set={setIvAnswer} ph={lang === 'fr' ? 'Tapez votre réponse ici...' : 'Type your answer here...'} rows={4} style={{ marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Btn v="g" style={{ flex: 1 }} onClick={submitIVAnswer} disabled={!ivAnswer.trim()}>{tr('iv.submit')} →</Btn>
                            <Btn v="danger" sm onClick={() => { setIvPhase('setup'); setIvHistory([]); setIvQNum(0); }}>{tr('iv.end')}</Btn>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {ivPhase === 'complete' && (
                    <div style={C.card()}>
                      <div style={C.label()}>🏁 {lang === 'fr' ? 'Session Terminée' : 'Session Complete'}</div>
                      {!ivFinal ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <Dots />
                          <div style={{ fontSize: '.76rem', color: 'var(--tx3)', marginTop: 8 }}>{lang === 'fr' ? 'Génération du rapport final...' : 'Generating your final report...'}</div>
                        </div>
                      ) : (
                        <>
                          <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--sans)', color: scoreCol((ivFinal.overall_score as number) || 0) }}>{String(ivFinal.grade || 'B')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>{String(ivFinal.overall_score || 0)}%</div>
                            <div style={{ fontSize: '.78rem', color: 'var(--tx3)', marginTop: 4 }}>{String(ivFinal.verdict || '')}</div>
                          </div>

                          {ivFinal.category_scores && (
                            <div style={{ marginBottom: 14 }}>
                              {Object.entries(ivFinal.category_scores as Record<string, number>).map(([k, v]) => (
                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <span style={{ fontSize: '.7rem', color: 'var(--tx2)', width: 120, flexShrink: 0, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                                  <PBar val={v} color={scoreCol(v)} />
                                  <span style={{ fontFamily: 'var(--mono)', fontSize: '.62rem', color: 'var(--tx2)', width: 28, textAlign: 'right' }}>{v}%</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '.62rem', color: 'var(--g)', fontFamily: 'var(--mono)', marginBottom: 6 }}>✓ {lang === 'fr' ? 'Forces' : 'Strengths'}</div>
                              {(ivFinal.top_strengths as string[] || []).map((s, i) => <div key={i} style={{ fontSize: '.74rem', color: 'var(--tx2)', marginBottom: 4 }}>• {s}</div>)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '.62rem', color: 'var(--o)', fontFamily: 'var(--mono)', marginBottom: 6 }}>▲ {lang === 'fr' ? 'À améliorer' : 'Improve'}</div>
                              {(ivFinal.priority_improvements as string[] || []).map((s, i) => <div key={i} style={{ fontSize: '.74rem', color: 'var(--tx2)', marginBottom: 4 }}>• {s}</div>)}
                            </div>
                          </div>

                          {ivFinal.coaching_summary && (
                            <div style={{ fontSize: '.76rem', color: 'var(--tx2)', lineHeight: 1.75, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, borderLeft: '2px solid var(--b)', marginBottom: 12 }}>
                              {String(ivFinal.coaching_summary)}
                            </div>
                          )}

                          {(ivFinal.study_topics as string[] || []).length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: '.62rem', color: 'var(--p)', fontFamily: 'var(--mono)', marginBottom: 6 }}>📚 {lang === 'fr' ? 'Sujets à réviser' : 'Study These Topics'}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {(ivFinal.study_topics as string[]).map((s, i) => (
                                  <button key={i} onClick={() => { setStQuery(s); goPage('study'); }}
                                    style={{ padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: '.62rem', background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)', color: 'var(--p)', cursor: 'pointer' }}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {ivFinal.hiring_recommendation && (
                            <div style={{ padding: '8px 12px', background: 'rgba(0,255,170,.05)', border: '1px solid rgba(0,255,170,.2)', borderRadius: 8, fontSize: '.74rem', color: 'var(--g)', marginBottom: 14 }}>
                              🎯 {String(ivFinal.hiring_recommendation)}
                            </div>
                          )}

                          <Btn v="g" full onClick={() => { setIvPhase('setup'); setIvFinal(null); setIvHistory([]); setIvQNum(0); }}>
                            {tr('iv.new')}
                          </Btn>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── BANK TAB ── */}
              {ivTab === 'bank' && (
                <>
                  <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 14, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as never }}>
                    {(['technical', 'behavioral', 'ml'] as const).map(tab => (
                      <button key={tab} onClick={() => setIvBankTab(tab)} style={{
                        padding: '7px 16px', borderRadius: 20, fontSize: '.74rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                        border: '1px solid var(--bdr)', background: ivBankTab === tab ? 'var(--b)' : 'transparent',
                        color: ivBankTab === tab ? '#fff' : 'var(--tx3)', fontFamily: 'var(--sans)', transition: 'all .18s',
                      }}>
                        {tab === 'technical' ? tr('iv.technical') : tab === 'behavioral' ? tr('iv.behavioral') : 'ML / AI'}
                      </button>
                    ))}
                  </div>
                  {QBANK[ivBankTab].map((q, i) => <QCard key={i} q={q.q} a={q.a} tags={q.tags} />)}
                  {customQ.length > 0 && <>
                    <div style={{ ...C.label(), marginTop: 16 }}>// {lang === 'fr' ? 'Questions Personnalisées' : 'Custom Questions'}</div>
                    {customQ.map((q, i) => <QCard key={q.id} q={q.question} a={q.answer} tags={q.tags} onDelete={() => { setCustomQ(prev => prev.filter((_, j) => j !== i)); showToast('Deleted'); }} />)}
                  </>}
                  <div style={C.card({ marginTop: 14 })}>
                    <div style={C.label()}>{lang === 'fr' ? '// Ajouter une Question' : '// Add Custom Question'}</div>
                    <FTA val={cqQ} set={setCqQ} ph={lang === 'fr' ? 'Votre question...' : 'Your question...'} rows={2} style={{ minHeight: 56, marginBottom: 8 }} />
                    <FTA val={cqA} set={setCqA} ph={lang === 'fr' ? 'Votre réponse / notes...' : 'Answer / notes...'} rows={3} style={{ minHeight: 72, marginBottom: 10 }} />
                    <Btn v="g" sm onClick={saveCustomQ}>{lang === 'fr' ? 'Sauvegarder' : 'Save Question'}</Btn>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ STUDY ══════════════════════════════════════════════ */}
          {page === 'study' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>Study <span style={{ color: 'var(--g)' }}>Hub</span></div>
                  <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Apprentissage assisté par IA' : 'AI-powered learning'}</div>
                </div>
                <Btn v="g" sm onClick={() => setTopicSheet(true)}>{lang === 'fr' ? '+ Sujet' : '+ Topic'}</Btn>
              </div>

              <div style={C.card({ marginBottom: 14 })}>
                <div style={C.label()}>⚡ {lang === 'fr' ? 'Explication IA + Quiz' : 'AI Explainer + Quiz'}</div>
                <FInp val={stQuery} set={setStQuery} ph={lang === 'fr' ? 'Transformer, Rétropropagation, RL...' : 'Transformer, Backprop, RL, BERT...'} style={{ marginBottom: 8 }} />
                <FSel val={stLang} set={setStLang} opts={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }]} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn v="b" style={{ flex: 1 }} onClick={() => explainTopic()} disabled={stLoading}>
                    {stLoading ? <Dots /> : `📖 ${lang === 'fr' ? 'Expliquer' : 'Explain'}`}
                  </Btn>
                  <Btn v="p" sm onClick={genQuiz} disabled={stLoading || !stQuery.trim()}>❓ Quiz</Btn>
                </div>

                {stResult && !quizData && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 'var(--rads)' }}>
                    <div className="md" style={{ fontSize: '.78rem', color: 'var(--tx2)', lineHeight: 1.85 }}
                      dangerouslySetInnerHTML={{ __html: md(stResult.explanation || '') }} />
                    {(stResult.sources || []).length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--bdr)' }}>
                        <div style={{ ...C.label(), marginBottom: 6 }}>// Sources</div>
                        {stResult.sources!.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '.7rem', color: 'var(--b)', marginBottom: 4 }}>↗ {s.title}</a>)}
                      </div>
                    )}
                  </div>
                )}

                {quizData && quizData.questions && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ ...C.label(), color: 'var(--p)', marginBottom: 10 }}>❓ Quiz: {quizData.topic}</div>
                    {quizData.questions.map((q, i) => (
                      <div key={i} style={{ marginBottom: 14, padding: 12, background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--bdr)' }}>
                        <div style={{ fontSize: '.84rem', fontWeight: 600, marginBottom: 10 }}>{i + 1}. {q.question}</div>
                        {q.options.map(opt => {
                          const letter = opt[0];
                          const selected = quizAns[i] === letter;
                          const correct = letter === q.correct;
                          return (
                            <button key={opt} onClick={() => !quizDone && setQuizAns(prev => ({ ...prev, [i]: letter }))}
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8, marginBottom: 4,
                                cursor: quizDone ? 'default' : 'pointer', fontSize: '.78rem', fontFamily: 'var(--sans)',
                                border: `1px solid ${quizDone ? (correct ? 'var(--g)' : selected ? 'var(--r)' : 'var(--bdr)') : selected ? 'var(--b)' : 'var(--bdr)'}`,
                                background: quizDone ? (correct ? 'rgba(0,255,170,.08)' : selected ? 'rgba(255,77,109,.08)' : 'transparent') : selected ? 'rgba(77,159,255,.1)' : 'transparent',
                                color: quizDone ? (correct ? 'var(--g)' : selected ? 'var(--r)' : 'var(--tx3)') : selected ? 'var(--b)' : 'var(--tx2)',
                              }}>{opt}</button>
                          );
                        })}
                        {quizDone && <div style={{ marginTop: 6, fontSize: '.72rem', color: 'var(--tx3)', padding: '6px 8px', background: 'var(--sf2)', borderRadius: 6 }}>💡 {q.explanation}</div>}
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!quizDone ? (
                        <Btn v="g" full onClick={() => setQuizDone(true)}>{lang === 'fr' ? 'Vérifier les réponses' : 'Check Answers'}</Btn>
                      ) : (
                        <>
                          <div style={{ flex: 1, padding: '10px 12px', background: 'var(--sf2)', borderRadius: 10, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '.8rem', color: 'var(--g)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {Object.entries(quizAns).filter(([i, a]) => a === quizData.questions![parseInt(i)].correct).length}/{quizData.questions.length} ✓
                          </div>
                          <Btn v="ghost" onClick={() => { setQuizData(null); setQuizAns({}); setQuizDone(false); }}>Retry</Btn>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {topics.map((tp, i) => (
                <div key={tp.id} style={C.card({ marginBottom: 10 })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: '.92rem', fontWeight: 700 }}>{tp.name}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--tx3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{tp.category}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '.74rem', fontWeight: 700, color: TOPIC_COLS[i % TOPIC_COLS.length] }}>{tp.progress}%</div>
                  </div>
                  <div style={{ fontSize: '.74rem', color: 'var(--tx3)', lineHeight: 1.5, marginBottom: 10 }}>{tp.desc}</div>
                  <PBar val={tp.progress} color={TOPIC_COLS[i % TOPIC_COLS.length]} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Btn v="ghost" sm style={{ flex: 1 }} onClick={() => { explainTopic(tp.name); scrollRef.current?.scrollTo(0, 0); }}>📖 {lang === 'fr' ? 'Expliquer' : 'Explain'}</Btn>
                    <Btn v="ghost" sm onClick={() => setTopics(prev => prev.map(t => t.id === tp.id ? { ...t, progress: Math.min(100, t.progress + 10) } : t))}>+10%</Btn>
                    <Btn v="danger" sm onClick={() => setTopics(prev => prev.filter(t => t.id !== tp.id))}>✕</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ SEARCH ══════════════════════════════════════════════ */}
          {page === 'search' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>Market <span style={{ color: 'var(--g)' }}>Research</span></div>
                <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Intelligence marché en direct · Tavily' : 'Live job market intelligence · Tavily'}</div>
              </div>

              <div style={C.card({ marginBottom: 12 })}>
                <div style={C.label()}>⌕ {lang === 'fr' ? 'Recherche Intelligente' : 'Intelligent Search'}</div>
                <FInp val={sQuery} set={setSQuery} ph={lang === 'fr' ? 'Entreprise, salaire, compétences...' : 'Company, salary, required skills...'} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 10, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as never }}>
                  {(['general', 'jobs', 'company', 'salary', 'skills', 'news'] as SearchMode[]).map(m => (
                    <button key={m} onClick={() => setSMode(m)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      border: '1px solid var(--bdr)', background: sMode === m ? 'var(--g)' : 'transparent',
                      color: sMode === m ? '#000' : 'var(--tx3)', fontFamily: 'var(--sans)', transition: 'all .18s',
                    }}>{tr(`search.${m}`)}</button>
                  ))}
                </div>
                <Btn v="g" full onClick={runSearch} disabled={sLoading}>
                  {sLoading ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>⌕</span>&nbsp;{lang === 'fr' ? 'Recherche...' : 'Searching...'}</> : `⌕ ${lang === 'fr' ? 'Rechercher' : 'Search'}`}
                </Btn>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ ...C.label(), marginBottom: 8 }}>// {lang === 'fr' ? 'Recherches rapides' : 'Quick Searches'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    lang === 'fr' ? 'Salaire ML engineer France 2025' : 'ML engineer salary France 2025',
                    lang === 'fr' ? 'Offres stage IA Paris 2025' : 'AI internship Paris 2025',
                    'Thales AI division culture',
                    lang === 'fr' ? 'Compétences requises ingénieur IA' : 'Required skills AI engineer France',
                    'Inria PhD internship',
                    'MLOps France jobs 2025',
                    'Capgemini AI engineer',
                  ].map(q => (
                    <button key={q} onClick={() => setSQuery(q)}
                      style={{ padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--mono)', fontSize: '.62rem', background: 'var(--sf)', border: '1px solid var(--bdr)', color: 'var(--tx2)', cursor: 'pointer' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {sResult && (
                <>
                  {sResult.summary && (
                    <div style={C.card({ marginBottom: 12 })}>
                      <div style={C.label()}>⚡ {lang === 'fr' ? 'Résumé IA' : 'AI Summary'}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--tx2)', lineHeight: 1.8 }}>{sResult.summary}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(sResult.results || []).map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <div style={C.card()}>
                          <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--b)', marginBottom: 5 }}>{r.title}</div>
                          <div style={{ fontSize: '.72rem', color: 'var(--tx3)', lineHeight: 1.5 }}>{r.snippet}</div>
                          {r.date && <div style={{ fontSize: '.6rem', color: 'var(--tx3)', marginTop: 6, fontFamily: 'var(--mono)' }}>{r.date}</div>}
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ CV ══════════════════════════════════════════════════ */}
          {page === 'cv' && (
            <div style={{ padding: 16, animation: 'fadeUp .22s ease' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '1.4rem', fontWeight: 800 }}>My <span style={{ color: 'var(--g)' }}>CV</span></div>
                <div style={{ fontSize: '.72rem', color: 'var(--tx3)', marginTop: 2 }}>{lang === 'fr' ? 'Téléchargez & améliorez votre CV' : 'Upload & AI-improve your CV'}</div>
              </div>

              <div style={C.card({ marginBottom: 12 })}>
                <div style={C.label()}>{lang === 'fr' ? '// Améliorer une Section' : '// AI Section Improver'}</div>
                <FInp val={cvTarget} set={setCvTarget} ph={lang === 'fr' ? 'Poste cible (ex: Ingénieur ML)' : 'Target role (e.g. ML Engineer)'} style={{ marginBottom: 8 }} />
                <FTA val={cvSection} set={setCvSection} ph={lang === 'fr' ? 'Collez une section de votre CV à améliorer (expériences, projets, compétences)...' : 'Paste a CV section to improve (experience, projects, skills)...'} rows={5} style={{ marginBottom: 10 }} />
                <Btn v="b" full onClick={improveCV} disabled={cvLoading}>
                  {cvLoading ? <><span style={{ animation: 'spin .8s linear infinite', display: 'inline-block' }}>◈</span>&nbsp;{lang === 'fr' ? 'Amélioration...' : 'Improving...'}</> : `✨ ${lang === 'fr' ? 'Améliorer avec l\'IA' : 'Improve with AI'}`}
                </Btn>
                {cvImproved && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--bg3)', border: '1px solid var(--bdr)', borderRadius: 'var(--rads)' }}>
                    <div className="md" style={{ fontSize: '.78rem', color: 'var(--tx2)', lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: md(cvImproved) }} />
                  </div>
                )}
              </div>

              <div style={C.card()}>
                <div style={C.label()}>// ATS {lang === 'fr' ? 'Conseils Clés' : 'Best Practices'}</div>
                {[
                  lang === 'fr' ? '✓ Utilisez des titres standards : Formation, Expérience, Compétences' : '✓ Use standard headings: Education, Experience, Skills',
                  lang === 'fr' ? '✓ Évitez tableaux, colonnes, zones de texte' : '✓ Avoid tables, columns, text boxes, graphics',
                  lang === 'fr' ? '✓ Intégrez naturellement les mots-clés de l\'offre' : '✓ Naturally integrate job description keywords',
                  lang === 'fr' ? '✓ Quantifiez chaque point : %, ms, €, utilisateurs' : '✓ Quantify every bullet: %, ms, €, users',
                  lang === 'fr' ? '✓ 1-2 pages pour les stages/premières expériences' : '✓ 1-2 pages for student/intern roles',
                  lang === 'fr' ? '✓ Format .docx ou PDF sans image pour l\'ATS' : '✓ Submit .docx or clean PDF without images for ATS',
                ].map((tip, i, arr) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--bdr)' : 'none' }}>
                    <span style={{ fontSize: '.76rem', color: 'var(--tx2)' }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* /scroll */}

        {/* ── BOTTOM NAV ─────────────────────────────────────────── */}
        <nav style={{ height: 'calc(var(--nh) + var(--sb))', background: 'var(--bg2)', borderTop: '1px solid var(--bdr)', display: 'flex', alignItems: 'flex-start', paddingTop: 8, flexShrink: 0, zIndex: 100 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => goPage(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              cursor: 'pointer', padding: '5px 2px', border: 'none', background: 'transparent', transition: 'all .18s',
              WebkitTapHighlightColor: 'transparent', userSelect: 'none', position: 'relative',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', background: page === item.id ? 'rgba(0,255,170,.12)' : 'transparent', transition: 'all .2s' }}>
                {item.icon}
              </div>
              <div style={{ fontSize: '.56rem', fontWeight: 600, color: page === item.id ? 'var(--g)' : 'var(--tx3)', transition: 'all .2s' }}>
                {tr(item.key)}
              </div>
              {item.id === 'jobs' && jobs.length > 0 && (
                <div style={{ position: 'absolute', top: 3, right: 'calc(50% - 22px)', background: 'var(--o)', color: '#fff', fontSize: '.5rem', fontWeight: 800, padding: '1px 4px', borderRadius: 8, minWidth: 14, textAlign: 'center', fontFamily: 'var(--mono)' }}>
                  {jobs.length}
                </div>
              )}
            </button>
          ))}
        </nav>

        <Toast msg={toast.msg} show={toast.show} />

        {/* ── JOB SHEET ──────────────────────────────────────────── */}
        <Sheet open={jobSheet} onClose={() => setJobSheet(false)} title={lang === 'fr' ? 'Ajouter une candidature' : 'Add Application'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FInp val={jfRole} set={setJfRole} ph={lang === 'fr' ? 'Poste...' : 'Role...'} />
            <FInp val={jfCo} set={setJfCo} ph={lang === 'fr' ? 'Entreprise...' : 'Company...'} />
            <FSel val={jfSt} set={v => setJfSt(v as JobStatus)} opts={[
              { value: 'saved', label: lang === 'fr' ? 'Sauvegardé' : 'Saved' },
              { value: 'applied', label: lang === 'fr' ? 'Candidaté' : 'Applied' },
              { value: 'interview', label: lang === 'fr' ? 'Entretien' : 'Interview' },
              { value: 'offer', label: lang === 'fr' ? 'Offre' : 'Offer' },
              { value: 'rejected', label: lang === 'fr' ? 'Refusé' : 'Rejected' },
            ]} />
            <FInp val={jfDl} set={setJfDl} type="date" />
            <FInp val={jfAts} set={setJfAts} ph={lang === 'fr' ? 'Score ATS (optionnel)' : 'ATS score (optional)'} type="number" />
            <FInp val={jfUrl} set={setJfUrl} ph="Job URL (optional)" type="url" />
            <FTA val={jfNotes} set={setJfNotes} ph={lang === 'fr' ? 'Notes...' : 'Notes...'} rows={2} style={{ minHeight: 56 }} />
            <Btn v="g" full onClick={saveJob}>{lang === 'fr' ? 'Sauvegarder' : 'Save Application'}</Btn>
          </div>
        </Sheet>

        {/* ── TOPIC SHEET ────────────────────────────────────────── */}
        <Sheet open={topicSheet} onClose={() => setTopicSheet(false)} title={lang === 'fr' ? 'Ajouter un sujet d\'étude' : 'Add Study Topic'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <FInp val={tfName} set={setTfName} ph={lang === 'fr' ? 'Nom du sujet...' : 'Topic name...'} />
            <FTA val={tfDesc} set={setTfDesc} ph={lang === 'fr' ? 'Description...' : 'Description...'} rows={2} style={{ minHeight: 56 }} />
            <FSel val={tfCat} set={setTfCat} opts={[
              { value: 'ML', label: 'Machine Learning' }, { value: 'Deep Learning', label: 'Deep Learning' },
              { value: 'NLP', label: 'NLP' }, { value: 'Computer Vision', label: 'Computer Vision' },
              { value: 'Engineering', label: 'Engineering / MLOps' }, { value: 'Math', label: 'Mathematics' }, { value: 'Other', label: 'Other' },
            ]} />
            <FInp val={tfProg} set={setTfProg} ph="0" type="number" />
            <Btn v="g" full onClick={saveTopic}>{lang === 'fr' ? 'Sauvegarder' : 'Save Topic'}</Btn>
          </div>
        </Sheet>

      </div>
    </>
  );
}
