// The Sami sandbox: a conversational advisor that asks before it answers.
//
// On-device mode (default): understands the brief from plain words, asks for the missing details that
// change the ranking most, then answers with ranked matches, honest gaps and next steps. It can answer
// questions about any listing from its published record, and draft a mission plan.
// Live AI mode: when CONFIG.advisorEndpoint is set (the Buzzar API's POST /api/advisor/match, reachable
// when this site is served from the same origin), questions are sent there and its picks, gaps and
// follow-up questions are shown in the same conversation.

import { h, img, catImg, icon, fmt, toast, lists } from '../ui.js';
import { all, get, detail, understand, matchU, industryLabel, catLabel, TYPE, label, readiness, getMeta } from '../data.js';
import { requestDialog } from '../components.js';
import { CONFIG } from '../config.js';
import { go } from '../main.js';

const SAMI = 'assets/img/sami.webp';
const SHORT_KEY = 'bz:sami-shortlist';

const SLOTS = [
  ['goal', 'What you want to change'],
  ['industry', 'Industry'],
  ['role', 'Your perspective'],
  ['size', 'Organisation size'],
  ['platform', 'Platform'],
  ['region', 'Where you operate'],
  ['timeline', 'Timeline'],
];

const STARTERS = [
  ['📦', 'We keep running out of stock but still throw a lot away'],
  ['🛡️', 'Our bank in Riyadh needs a zero-trust programme'],
  ['☁️', 'Move our ERP and file servers to Azure'],
  ['🤖', 'A GenAI assistant for our call centre agents'],
  ['🏥', 'Recover fast from ransomware at our hospital group'],
  ['📊', 'One trusted dashboard for sales across 6 countries'],
];

const Q = {
  industry: {
    ask: 'Which industry are you in? It changes the ranking more than anything else.',
    opts: ['Retail & e-commerce', 'Financial services', 'Healthcare', 'Manufacturing', 'Public sector', 'Telecommunications', 'Logistics & distribution', 'Energy & utilities', 'Other / cross-industry'],
  },
  size: {
    ask: 'Roughly how big is the organisation?',
    opts: ['Small business', 'Mid-market', 'Enterprise', 'Government body'],
  },
  platform: {
    ask: 'Where does it need to run?',
    opts: ['AWS', 'Azure', 'Google Cloud', 'On-premises', 'Hybrid', 'No preference'],
  },
  region: {
    ask: 'And where do you operate? Data residency rules differ.',
    opts: ['UAE', 'Saudi Arabia', 'Qatar / wider GCC', 'India', 'Africa', 'Elsewhere'],
  },
  timeline: {
    ask: 'Last one: how soon do you need something working?',
    opts: ['Within 3 months', '3–6 months', '6–12 months', 'Just exploring'],
  },
};
const ROLE_WORDS = {
  'Technology leader': ['cio', 'cto', 'it director', 'head of it', 'it team', 'infrastructure'],
  'Business leader': ['ceo', 'founder', 'owner', 'managing director', 'general manager'],
  Operations: ['coo', 'operations', 'supply chain', 'store manager', 'plant manager'],
  'Customer & marketing': ['cmo', 'marketing', 'customer experience', 'cx', 'digital'],
  'Risk & security': ['ciso', 'security team', 'risk', 'compliance officer', 'audit'],
  'Data & analytics': ['cdo', 'data team', 'analytics', 'bi team'],
};
const IND_FROM_LABEL = Object.fromEntries(
  Object.entries({
    'Retail & e-commerce': 'retail',
    'Financial services': 'financial-services',
    Healthcare: 'healthcare',
    Manufacturing: 'manufacturing',
    'Public sector': 'public-sector',
    Telecommunications: 'telecommunications',
    'Logistics & distribution': 'logistics',
    'Energy & utilities': 'utilities',
    'Other / cross-industry': 'cross-industry',
  }),
);
const REGION_FROM_LABEL = { UAE: 'UAE', 'Saudi Arabia': 'KSA', 'Qatar / wider GCC': 'GCC', India: 'India', Africa: 'Africa', Elsewhere: null };

const has = (t, words) => words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(t));

function readSize(t) {
  if (has(t, ['smb', 'small business', 'startup', 'small company', 'sme'])) return 'Small business';
  if (has(t, ['mid-market', 'mid market', 'midsize', 'mid-size', 'medium'])) return 'Mid-market';
  if (has(t, ['enterprise', 'large', 'group', 'multinational'])) return 'Enterprise';
  if (has(t, ['government', 'ministry', 'municipality', 'authority'])) return 'Government body';
  const n = t.match(/(\d[\d,]*)\s*(employees|staff|people|users)/i);
  if (n) {
    const v = parseInt(n[1].replace(/,/g, ''), 10);
    return v < 200 ? 'Small business' : v < 2000 ? 'Mid-market' : 'Enterprise';
  }
  return null;
}
function readTimeline(t) {
  if (has(t, ['asap', 'urgent', 'this quarter', 'next month', 'immediately', 'within 3 months', 'now'])) return 'Within 3 months';
  if (has(t, ['3-6 months', '3–6 months', 'this year', 'six months', '6 months'])) return '3–6 months';
  if (has(t, ['next year', '12 months', '6-12 months', '6–12 months'])) return '6–12 months';
  if (has(t, ['exploring', 'just looking', 'research', 'curious'])) return 'Just exploring';
  return null;
}
function readRole(t) {
  for (const [r, words] of Object.entries(ROLE_WORDS)) if (has(t, words)) return r;
  return null;
}
function scaleNote(t) {
  const m = t.match(/(\d[\d,]*)\s*(stores|branches|sites|hospitals|plants|factories|schools|outlets|warehouses|clinics|countries)/i);
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null;
}

// ---------- persistent shortlist ----------
const short = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(SHORT_KEY)) || [];
    } catch {
      return [];
    }
  },
  set(a) {
    try {
      localStorage.setItem(SHORT_KEY, JSON.stringify(a));
    } catch {}
  },
};

export default function advisor(route) {
  const meta = getMeta();
  const S = {
    brief: { goal: null, industry: null, role: null, size: null, platform: null, region: null, timeline: null, scale: null },
    extra: [],
    asked: new Set(),
    pending: null,
    focus: null,
    lastPicks: [],
    shown: 0,
    answered: false,
    mode: CONFIG.advisorEndpoint ? 'live' : 'local',
    speak: false,
    justFilled: new Set(),
  };

  // ---------- layout ----------
  const thread = h('div', { class: 'thread', 'aria-live': 'polite' });
  const scroller = h('div', { class: 'sb-scroll' }, thread);
  const ta = h('textarea', { rows: 1, placeholder: 'Describe what you want to change…', 'aria-label': 'Message Sami', maxlength: 600 });
  const micBtn = h('button', { class: 'round', type: 'button', title: 'Speak', 'aria-label': 'Speak your message', html: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>' });
  const sendBtn = h('button', { class: 'round send', type: 'submit', 'aria-label': 'Send', html: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' });
  const form = h('form', null, micBtn, ta, sendBtn);
  const speakBtn = h('button', { class: 'round', type: 'button', 'aria-pressed': 'false', title: 'Read replies aloud', 'aria-label': 'Read replies aloud', html: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>' });
  const resetBtn = h('button', { class: 'round', type: 'button', title: 'Start over', 'aria-label': 'Start over', html: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>' });
  const modeEl = h(
    'div',
    { class: 'mode', role: 'group', 'aria-label': 'Answer mode' },
    h('button', { type: 'button', 'aria-pressed': String(S.mode === 'local'), 'data-m': 'local' }, 'On-device'),
    h('button', { type: 'button', 'aria-pressed': String(S.mode === 'live'), 'data-m': 'live', title: CONFIG.advisorEndpoint ? 'Answers from the Buzzar AI advisor' : 'Set advisorEndpoint in assets/js/config.js to enable' }, 'Live AI'),
  );
  modeEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    if (b.dataset.m === 'live' && !CONFIG.advisorEndpoint) return toast('Live AI needs the Buzzar API endpoint. Set advisorEndpoint in config.js.');
    S.mode = b.dataset.m;
    for (const x of modeEl.children) x.setAttribute('aria-pressed', String(x.dataset.m === S.mode));
    toast(S.mode === 'live' ? 'Live AI: answers come from the Buzzar advisor' : 'On-device: nothing leaves your browser');
  });

  const briefEl = h('dl', { style: { margin: 0 } });
  const meterEl = h('div', { class: 'meter' });
  const funnelEl = h('div', null);
  const shortEl = h('div', { class: 'slist' });

  const chatCol = h(
    'section',
    { class: 'sb-col sb-chat', 'aria-label': 'Conversation with Sami' },
    h('div', { class: 'sb-head' }, img(SAMI, '', { width: 40, height: 40 }), h('div', null, h('b', null, 'Sami'), h('small', null, '● Buzzar solution advisor')), h('div', { class: 'tools' }, modeEl, speakBtn, resetBtn)),
    scroller,
    h('div', { class: 'composer' }, form, h('p', { class: 'hint' }, h('span', null, 'Enter to send · Shift+Enter for a new line'), h('span', null, S.mode === 'live' ? 'Live AI' : 'Runs on your device'))),
  );
  const briefCol = h(
    'aside',
    { class: 'sb-col sb-brief', 'aria-label': 'Your brief' },
    h('div', { class: 'sb-head' }, h('h2', null, 'Your brief'), h('span', { class: 'chip green' }, 'Live')),
    h('div', { class: 'sb-scroll' }, meterEl, funnelEl, briefEl),
  );
  const shortCol = h(
    'aside',
    { class: 'sb-col sb-short', 'aria-label': 'Shortlist' },
    h('div', { class: 'sb-head' }, h('h2', null, 'Shortlist'), h('a', { class: 'small link', href: '#/catalogue' }, 'Catalogue')),
    h('div', { class: 'sb-scroll' }, shortEl),
    h(
      'div',
      { class: 'sb-foot' },
      h('button', { class: 'btn primary', type: 'button', onclick: compareShort }, 'Compare shortlist'),
      h('button', { class: 'btn', type: 'button', onclick: () => lastPlanDownload() }, 'Download my brief'),
    ),
  );

  // ---------- rendering helpers ----------
  const scrollDown = () => requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
  const plain = (nodes) => nodes.map((n) => (typeof n === 'string' ? n : n?.textContent || '')).join(' ');

  function say(...content) {
    const bubble = h('div', { class: 'bubble' }, content);
    thread.append(h('div', { class: 'msg' }, img(SAMI, '', { class: 'av', width: 30, height: 30 }), bubble));
    scrollDown();
    if (S.speak && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(plain(content.flat()).replace(/\s+/g, ' ').slice(0, 400));
      u.rate = 1.03;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
    return bubble;
  }
  function me(text) {
    thread.append(h('div', { class: 'msg me' }, h('div', { class: 'bubble' }, text)));
    scrollDown();
  }
  function quick(options, onPick, withSkip) {
    const box = h('div', { class: 'quick' });
    for (const o of options) {
      const b = h('button', { type: 'button' }, o);
      b.addEventListener('click', () => {
        box.remove();
        onPick(o);
      });
      box.append(b);
    }
    if (withSkip) {
      const s = h('button', { type: 'button', class: 'skip' }, withSkip);
      s.addEventListener('click', () => {
        box.remove();
        onPick(null);
      });
      box.append(s);
    }
    thread.append(box);
    scrollDown();
  }
  const clearQuick = () => thread.querySelectorAll('.quick').forEach((q) => q.remove());
  function typing(ms = 800) {
    const t = h('div', { class: 'msg' }, img(SAMI, '', { class: 'av', width: 30, height: 30 }), h('div', { class: 'bubble typing' }, h('i'), h('i'), h('i')));
    thread.append(t);
    scrollDown();
    return new Promise((r) =>
      setTimeout(
        () => {
          t.remove();
          r();
        },
        matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : ms,
      ),
    );
  }

  function paintBrief() {
    const b = S.brief;
    const filled = SLOTS.filter(([k]) => b[k]).length;
    meterEl.replaceChildren(h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round((filled / SLOTS.length) * 100)}%` } })), h('small', null, h('span', null, 'Brief completeness'), h('b', null, `${filled}/${SLOTS.length}`)));
    const { inPlay, inInd } = funnel();
    funnelEl.replaceChildren(
      h('p', { class: 'eyebrow', style: { marginBottom: '6px' } }, 'Still in play'),
      h('div', { class: 'funnel' }, fmt(inPlay)),
      h('p', { class: 'muted small', style: { margin: '2px 0 16px' } }, `of ${fmt(meta.total)} listings${b.industry ? ` · ${fmt(inInd)} fit ${industryLabel(b.industry).toLowerCase()}` : ''}`),
    );
    briefEl.replaceChildren(
      ...SLOTS.map(([k, name]) => {
        let v = b[k];
        if (k === 'industry' && v) v = industryLabel(v);
        if (k === 'region' && v) v = { KSA: 'Saudi Arabia', GCC: 'GCC' }[v] || v;
        if (k === 'goal' && b.scale) v = `${v} (${b.scale})`;
        return h('div', { class: 'slot' + (S.justFilled.has(k) ? ' just' : '') }, h('dt', null, name, S.asked.has(k) && v ? h('span', null, '✓') : null), h('dd', { class: v ? '' : 'unknown' }, v || (k === 'goal' ? 'Tell Sami in your own words' : 'Not yet known')));
      }),
      S.extra.length ? h('div', { class: 'slot' }, h('dt', null, 'Also noted'), h('dd', null, S.extra.join(' · '))) : null,
    );
    S.justFilled.clear();
  }

  function paintShort() {
    const ids = short.get().filter(get);
    if (!ids.length) {
      shortEl.replaceChildren(h('div', { class: 'sb-empty' }, img('assets/img/hero.webp', '', { width: 90 }), h('p', null, 'Listings you pin from the conversation land here.')));
      return;
    }
    shortEl.replaceChildren(
      ...ids.map((id) => {
        const it = get(id);
        const rm = h('button', { type: 'button', 'aria-label': `Remove ${it.t}` }, '×');
        rm.addEventListener('click', () => {
          short.set(short.get().filter((x) => x !== id));
          paintShort();
        });
        return h('div', { class: 'sitem', style: { '--cat': `var(--c-${it.c})` } }, h('span', { class: 'ri' }, img(catImg(it.c), '', { width: 56 })), h('div', null, h('a', { href: `#/listing/${it.slug}` }, it.t), h('small', null, `${catLabel(it.c)} · ${TYPE[it.y].label}`)), rm);
      }),
    );
  }
  function pin(it) {
    const a = short.get();
    if (!a.includes(it.id)) {
      a.push(it.id);
      short.set(a);
      toast(`Pinned: ${it.t}`);
    }
    paintShort();
  }
  function compareShort() {
    const ids = short.get().filter(get).slice(0, 3);
    if (!ids.length) return toast('Pin a listing first.');
    lists.set('compare', ids);
    go('compare');
  }

  // ---------- understanding ----------
  function toU() {
    const b = S.brief;
    const u = understand([b.goal || '', ...S.extra].join(' '));
    if (b.industry && b.industry !== 'cross-industry') u.industries = [b.industry];
    if (b.platform && b.platform !== 'No preference') u.platforms = [b.platform];
    if (b.region) u.regions = [b.region];
    return u;
  }
  function funnel() {
    const b = S.brief;
    const items = all();
    const inInd = b.industry && b.industry !== 'cross-industry' ? items.filter((x) => x.i.includes(b.industry) || x.i.includes('cross-industry')).length : items.length;
    if (!b.goal) return { inPlay: inInd, inInd };
    const r = matchU(toU(), { limit: 1000 });
    return { inPlay: r.total, inInd };
  }

  function absorb(text, slot) {
    const before = { ...S.brief };
    const u = understand(text);
    const b = S.brief;
    if (slot === 'industry') b.industry = IND_FROM_LABEL[text] || u.industries[0] || b.industry || 'cross-industry';
    else if (slot === 'platform') b.platform = text;
    else if (slot === 'region') b.region = text in REGION_FROM_LABEL ? REGION_FROM_LABEL[text] || 'Elsewhere' : u.regions[0] || text;
    else if (slot === 'size') b.size = readSize(text) || text;
    else if (slot === 'timeline') b.timeline = readTimeline(text) || text;
    // anything else the sentence reveals
    if (!b.industry && u.industries[0]) b.industry = u.industries[0];
    if (!b.platform && u.platforms[0]) b.platform = u.platforms[0];
    if (!b.region && u.regions[0]) b.region = u.regions[0];
    b.size ||= readSize(text);
    b.timeline ||= readTimeline(text);
    b.role ||= readRole(text);
    b.scale ||= scaleNote(text);
    for (const k of Object.keys(b)) if (b[k] !== before[k]) S.justFilled.add(k);
  }

  function nextQuestion() {
    if (S.asked.size >= 3) return null;
    const b = S.brief;
    const u = toU();
    const order = ['industry', 'size', 'platform', 'region', 'timeline'];
    for (const k of order) {
      if (b[k] || S.asked.has(k)) continue;
      if (k === 'platform' && u.categories.length && !u.categories.some((c) => ['CLD', 'SEC', 'DNA', 'AI'].includes(c))) continue;
      return k;
    }
    return null;
  }

  // ---------- conversation ----------
  async function onUser(text) {
    if (text == null) return backToMatches();
    text = String(text).trim();
    if (!text) return;
    if (/^back to my matches$/i.test(text)) return backToMatches();
    thread.querySelector('.sb-intro')?.remove();
    clearQuick();
    me(text);
    ta.value = '';
    ta.style.height = '';

    // a question about the listing in focus
    if (S.focus && !S.pending && looksLikeListingQuestion(text)) return answerListing(S.focus, text);

    if (S.pending) {
      absorb(text, S.pending);
      S.pending = null;
    } else if (!S.brief.goal) {
      S.brief.goal = text.length > 90 ? text.slice(0, 88).trim() + '…' : text;
      S.justFilled.add('goal');
      absorb(text);
    } else {
      // new information refines the brief
      S.extra.push(text.length > 60 ? text.slice(0, 58) + '…' : text);
      absorb(text);
    }
    paintBrief();
    await advance();
  }

  async function advance() {
    const k = nextQuestion();
    if (k) {
      await typing(700);
      const ack = acknowledgement();
      S.asked.add(k);
      S.pending = k;
      say(ack ? [ack, ' '] : null, Q[k].ask);
      quick(Q[k].opts, (o) => (o ? onUser(o) : skip(k)), 'Skip, show matches');
      return;
    }
    await answer();
  }
  function skip(k) {
    S.pending = null;
    me('Skip');
    S.asked.add('industry');
    S.asked.add('size');
    S.asked.add('platform');
    S.asked.add('region');
    S.asked.add('timeline');
    answer();
  }
  function acknowledgement() {
    const { inPlay } = funnel();
    const b = S.brief;
    if (!S.asked.size) {
      const seen = [b.industry && b.industry !== 'cross-industry' ? industryLabel(b.industry) : null, b.platform, b.region].filter(Boolean);
      return `Got it${seen.length ? ` — ${seen.join(', ')}` : ''}. ${fmt(inPlay)} listings could help with that.`;
    }
    return `That narrows it to ${fmt(inPlay)}.`;
  }

  async function answer() {
    S.pending = null;
    if (S.mode === 'live' && CONFIG.advisorEndpoint) {
      const ok = await answerLive();
      if (ok) return;
    }
    await typing(1100);
    const b = S.brief;
    const u = toU();
    const r = matchU(u, {
      limit: 9,
      boost: (it) => (b.timeline === 'Within 3 months' && it.y === 'accelerator' ? 4 : 0) + (b.timeline === 'Within 3 months' && it.b ? 1 : 0),
    });
    S.lastPicks = r.picks;
    S.shown = 0;
    S.answered = true;
    if (!r.picks.length) {
      say(h('p', null, 'I could not find a published listing that fits that closely enough.'), h('p', null, 'Try naming the outcome (“reduce fraud losses”) or the capability (“identity and access”), and I will look again.'));
      quick(['Browse the catalogue', 'Start over'], (o) => (o === 'Start over' ? reset() : go('catalogue')));
      return;
    }
    const strong = r.picks.filter((p) => p.fit === 'strong').length;
    const summary = sentence();
    say(
      h('p', null, h('b', null, 'Here is what I heard: '), summary),
      h('p', null, `I checked all ${fmt(meta.total)} listings. ${fmt(r.total)} relate to it; ${strong ? `${strong} ${strong === 1 ? 'is a strong fit' : 'are strong fits'}` : 'none fit perfectly, so these are the closest'}. Best three first:`),
      rcards(r.picks.slice(0, 3)),
      gaps(r, u),
    );
    S.shown = 3;
    followUps();
  }

  function sentence() {
    const b = S.brief;
    const parts = [];
    parts.push(b.role ? `A ${b.role.toLowerCase()}` : 'You');
    if (b.industry && b.industry !== 'cross-industry') parts.push(`in ${industryLabel(b.industry).toLowerCase()}`);
    if (b.size) parts.push(`(${b.size.toLowerCase()}${b.scale ? `, ${b.scale}` : ''})`);
    else if (b.scale) parts.push(`(${b.scale})`);
    parts.push(`want to ${(b.goal || 'improve something').replace(/^(we|i)\s+(want|need|would like)\s+to\s+/i, '').replace(/[.?!…]+$/, '').toLowerCase()}`);
    if (b.platform && b.platform !== 'No preference') parts.push(`on ${b.platform}`);
    if (b.region && b.region !== 'Elsewhere') parts.push(`in ${{ KSA: 'Saudi Arabia' }[b.region] || b.region}`);
    if (b.timeline) parts.push(b.timeline === 'Just exploring' ? '— exploring for now' : `— ${b.timeline.toLowerCase()}`);
    return parts.join(' ') + '.';
  }

  function gaps(r, u) {
    const notes = [];
    const top = r.picks[0];
    if (top && top.fit !== 'strong') notes.push('No single listing covers this closely. A custom proposal from Redington may combine two.');
    if (u.categories.length > 1) notes.push(`You touched ${u.categories.length} practices (${u.categories.map(catLabel).join(', ')}). The best answer may be a pair of listings rather than one.`);
    if (S.brief.region && !r.picks.slice(0, 3).some((p) => p.it.r.length)) notes.push('These listings do not state regional availability yet; confirm residency in the discovery call.');
    return notes.length ? h('div', { class: 'gapnote' }, h('b', null, 'Honest gaps: '), notes.join(' ')) : null;
  }

  function followUps() {
    const opts = [];
    if (S.lastPicks.length > S.shown) opts.push('Show 3 more');
    opts.push('Only accelerators', 'Only marketplace-buyable', 'Compare the top 3', 'Draft a mission plan', 'Start over');
    quick(opts, onFollow);
  }
  async function onFollow(o) {
    me(o);
    if (o === 'Start over') return reset();
    if (o === 'Show 3 more') {
      await typing(500);
      const next = S.lastPicks.slice(S.shown, S.shown + 3);
      S.shown += next.length;
      say(h('p', null, 'A few more worth a look:'), rcards(next, S.shown - next.length));
      return followUps();
    }
    if (o === 'Compare the top 3') {
      lists.set(
        'compare',
        S.lastPicks.slice(0, 3).map((p) => p.it.id),
      );
      return go('compare');
    }
    if (o === 'Draft a mission plan') return plan(S.lastPicks[0].it);
    const filt = o === 'Only accelerators' ? (it) => it.y === 'accelerator' : (it) => it.b;
    await typing(700);
    const r = matchU(toU(), { limit: 6, filter: filt });
    if (!r.picks.length) {
      say(o === 'Only accelerators' ? 'No accelerator fits this brief yet. The services above are the faster route.' : 'None of the close matches are on a cloud marketplace yet; Redington resale is the route.');
    } else {
      S.lastPicks = r.picks;
      S.shown = Math.min(3, r.picks.length);
      say(h('p', null, o === 'Only accelerators' ? 'Accelerators are the fastest way to a pilot. Closest ones:' : 'These you can buy against your cloud marketplace commitment:'), rcards(r.picks.slice(0, 3)));
    }
    followUps();
  }

  function rcards(picks, offset = 0) {
    return h(
      'div',
      { class: 'rcards' },
      picks.map((p, i) => {
        const it = p.it;
        const bars = p.fit === 'strong' ? 3 : p.s > 10 ? 2 : 1;
        const askBtn = h('button', { type: 'button' }, 'Ask about it');
        askBtn.addEventListener('click', () => focusListing(it));
        const planBtn = h('button', { type: 'button' }, 'Mission plan');
        planBtn.addEventListener('click', () => {
          me(`Draft a mission plan for ${it.t}`);
          plan(it);
        });
        const pinBtn = h('button', { type: 'button' }, '＋ Shortlist');
        pinBtn.addEventListener('click', () => pin(it));
        return h(
          'div',
          { class: 'rcard', style: { '--cat': `var(--c-${it.c})`, animationDelay: `${i * 120}ms` } },
          h('span', { class: 'ri' }, img(catImg(it.c), '', { width: 76 })),
          h(
            'div',
            null,
            h('b', null, `${offset + i + 1}. `, h('a', { href: `#/listing/${it.slug}` }, it.t)),
            h('div', { class: 'rmeta' }, `${catLabel(it.c)} · ${TYPE[it.y].label} · ${it.k === 'distributor' ? 'Redington' : it.p}`, h('span', { class: 'fitbar', title: p.fit === 'strong' ? 'Strong fit' : 'Partial fit' }, [0, 1, 2].map((j) => h('i', { class: j < bars ? 'on' : '' })))),
            p.why.length ? h('p', { class: 'rwhy' }, 'Why: ', p.why.slice(0, 3).join(' · ')) : h('p', { class: 'rwhy' }, it.s),
            h('div', { class: 'racts' }, pinBtn, askBtn, planBtn, h('a', { href: `#/listing/${it.slug}` }, 'Open')),
          ),
        );
      }),
    );
  }

  function backToMatches() {
    clearQuick();
    S.focus = null;
    if (!S.lastPicks.length) return say('Tell me what you want to change, and I will find matches.');
    me('Back to my matches');
    say(h('p', null, 'Here are your top matches again:'), rcards(S.lastPicks.slice(0, Math.max(3, S.shown))));
    followUps();
  }

  // ---------- listing Q&A ----------
  const LQ = ['How long does it take?', 'What do I get?', 'Who is it not for?', 'How do I buy it?', 'What do I need in place?', 'How is success measured?'];
  async function focusListing(it) {
    S.focus = it;
    me(`Tell me about ${it.t}`);
    await typing(600);
    const d = await detail(it.id);
    say(h('p', null, h('b', null, it.t), ` — ${d?.outcome || it.s}`), h('p', null, 'What would you like to know? Ask in your own words, or pick one:'));
    quick(LQ, (o) => onUser(o), 'Back to my matches');
  }
  function looksLikeListingQuestion(t) {
    return /\?$|^(how|what|who|when|which|where|is|does|can|do)\b|price|cost|long|duration|platform|include|deliver|buy|purchase|not for|need|prerequisite|measure|kpi|success|risk/i.test(t);
  }
  async function answerListing(it, q) {
    await typing(700);
    const d = await detail(it.id);
    const t = q.toLowerCase();
    const out = [];
    if (!d) out.push(h('p', null, 'The full record for this listing is not in this snapshot. A discovery call will cover it.'));
    else if (/long|duration|time|weeks|months|effort|fast/.test(t)) {
      const dur = (d.scope || '').match(/Duration:\s*([^\n]+)/i)?.[1] || d.effort;
      out.push(h('p', null, dur ? `In their words: ${dur}` : 'They have not published a duration yet.'), stepsList(d, 3));
    } else if (/get|deliver|include|output|walk away/.test(t)) {
      out.push(h('p', null, 'You walk away with:'), h('ul', null, d.deliverables.slice(0, 6).map((x) => h('li', null, x))));
    } else if (/not for|avoid|wrong|bad fit/.test(t)) {
      out.push(h('p', null, 'It is not a fit if:'), h('ul', null, d.notFor.map((n) => h('li', null, n.situation))));
    } else if (/buy|price|cost|purchase|pay|licen|marketplace/.test(t)) {
      const routes = [...new Set(d.skus.flatMap((s) => s.routes))].map(label.route);
      out.push(
        h('p', null, d.skus.length ? `${d.skus.length} tiers: ${d.skus.map((s) => `${s.edition || s.name} (${label.model(s.model).toLowerCase()}, billed ${label.unit(s.unit).toLowerCase()})`).join('; ')}.` : 'Tiers are agreed in a proposal.'),
        h('p', null, routes.length ? `You can buy through ${routes.join(' or ')}. Pricing comes as a private offer.` : 'Pricing comes as a private offer.'),
      );
    } else if (/need|prereq|require|in place|ready|data/.test(t)) {
      const reqs = d.notFor.map((n) => n.situation.replace(/^(Organisations|Organizations|Sites|Teams|Projects)\s+without\s+/i, '').replace(/^an?\s+/i, '')).filter((x) => !/^Projects seeking/i.test(x));
      out.push(h('p', null, 'Have these in place first:'), h('ul', null, reqs.map((x) => h('li', null, x[0].toUpperCase() + x.slice(1)))), d.residency ? h('p', null, `Data residency: ${d.residency}.`) : null);
    } else if (/measure|kpi|success|roi|value|benefit/.test(t)) {
      out.push(h('p', null, d.kpi ? `Primary success measure: ${d.kpi}.` : 'No success measure published yet.'), h('ul', null, d.benefits.map((b) => h('li', null, b.text, h('span', { class: 'muted' }, ` (${b.kind})`)))), h('p', { class: 'small muted' }, 'Benefits are estimates until measured against your baseline.'));
    } else if (/platform|aws|azure|cloud|on.?prem|run/.test(t)) {
      out.push(h('p', null, it.pl.length ? `Runs on ${it.pl.join(', ')}.` : 'Platforms are not stated; ask in the discovery call.'));
    } else if (/who|team|owner|role|deliver/.test(t)) {
      out.push(h('p', null, `Decision owner: ${d.audience.join(', ') || 'not stated'}. Delivery: ${(d.scope || '').match(/Delivery model:\s*([^\n]+)/i)?.[1] || 'Redington or an approved partner'}.`));
    } else {
      out.push(h('p', null, d.overview || d.outcome));
    }
    say(...out);
    const req = h('button', { type: 'button' }, 'Request a discovery call');
    quick([...LQ.filter((x) => x.toLowerCase() !== t), 'Mission plan', 'Request a discovery call'], (o) => {
      if (o === 'Request a discovery call') return requestDialog(it, 'discovery');
      if (o === 'Mission plan') {
        me(`Draft a mission plan for ${it.t}`);
        return plan(it);
      }
      onUser(o);
    }, 'Back to my matches');
  }
  function stepsList(d, n) {
    const steps = (d.scope || '')
      .split(/\n+/)
      .map((l) => l.match(/^\d+[).]\s*(.+)$/)?.[1])
      .filter(Boolean);
    return steps.length ? h('ol', null, steps.slice(0, n).map((s) => h('li', null, s))) : null;
  }

  // ---------- mission plan ----------
  let lastPlan = null;
  async function plan(it) {
    S.focus = it;
    await typing(1300);
    const d = await detail(it.id);
    const b = S.brief;
    const reqs = (d?.notFor || []).map((n) => n.situation.replace(/^(Organisations|Organizations|Sites|Teams)\s+without\s+/i, '').replace(/^an?\s+/i, '')).filter((x) => !/^Projects seeking/i.test(x));
    const steps = (d?.scope || '')
      .split(/\n+/)
      .map((l) => l.match(/^\d+[).]\s*(.+)$/)?.[1])
      .filter(Boolean);
    const rd = readiness(it, d);
    const sections = [
      ['Objective', [sentence().replace(/\.$/, '') + `, using ${it.t}.`]],
      ['Success measure', [d?.kpi ? `${d.kpi[0].toUpperCase() + d.kpi.slice(1)}, measured against your own baseline before any improvement is claimed.` : 'Agree one measurable outcome and its baseline in the discovery call.']],
      ['What you need in place', reqs.length ? reqs.map((x) => x[0].toUpperCase() + x.slice(1)) : ['A named owner and access to the source data.']],
      ['Plan', steps.length ? steps : ['Discovery and baseline', 'Design and approvals', 'Bounded pilot', 'Measure and decide']],
      ['Who does what', [`${(d?.audience || ['Your sponsor'])[0]}: owns the decision and approves each stage.`, 'Redington or an approved partner: discovery, build and handover.', 'Your data and security owners: grant access and sign off controls.']],
      ['Readiness today', [`${rd.pct}% — ${rd.stages.filter((s) => s.ok < 1).map((s) => s.name).join(', ') || 'all stages published'} still to confirm.`]],
    ];
    lastPlan = { it, sections };
    const dl = h('button', { class: 'btn sm', type: 'button' }, 'Download plan (.md)');
    dl.addEventListener('click', () => download(it, sections));
    const call = h('button', { class: 'btn sm primary', type: 'button' }, 'Request a discovery call');
    call.addEventListener('click', () => requestDialog(it, 'discovery'));
    say(
      h('p', null, h('b', null, `Mission plan · ${it.t}`)),
      h(
        'div',
        { class: 'plan' },
        sections.map(([t, rows]) => [h('h4', null, t), rows.length > 1 ? h(t === 'Plan' ? 'ol' : 'ul', null, rows.map((r) => h('li', null, r))) : h('p', { style: { margin: 0, fontSize: '.9rem' } }, rows[0])]),
      ),
      h('div', { class: 'chips', style: { marginTop: '12px' } }, dl, call),
    );
    pin(it);
    quick(LQ.slice(0, 4), (o) => onUser(o), 'Back to my matches');
  }
  function download(it, sections) {
    const md = `# Mission plan: ${it.t}\n\n_Drafted with Sami on Buzzar · ${new Date().toLocaleDateString('en-GB')}_\n\n` + sections.map(([t, rows]) => `## ${t}\n\n${rows.map((r, i) => (t === 'Plan' ? `${i + 1}. ${r}` : `- ${r}`)).join('\n')}\n`).join('\n') + `\nListing: ${location.origin}${location.pathname}#/listing/${it.slug}\n`;
    const a = h('a', { href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), download: `buzzar-plan-${it.slug}.md` });
    document.body.append(a);
    a.click();
    a.remove();
  }
  function lastPlanDownload() {
    if (lastPlan) return download(lastPlan.it, lastPlan.sections);
    const b = S.brief;
    if (!b.goal) return toast('Tell Sami what you need first.');
    const rows = SLOTS.map(([k, n]) => [n, [b[k] ? (k === 'industry' ? industryLabel(b[k]) : b[k]) : 'Not yet known']]);
    rows.push(['Shortlist', short.get().map(get).filter(Boolean).map((x) => x.t)]);
    download({ t: 'My brief', slug: 'brief' }, rows);
  }

  // ---------- live AI ----------
  async function answerLive() {
    const b = S.brief;
    await typing(400);
    const t = h('div', { class: 'msg' }, img(SAMI, '', { class: 'av' }), h('div', { class: 'bubble' }, h('span', { class: 'text-shimmer' }, 'Thinking with the Buzzar advisor…')));
    thread.append(t);
    scrollDown();
    try {
      const res = await fetch(CONFIG.advisorEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ problem: sentence(), industry: b.industry ? industryLabel(b.industry) : undefined, slots: { industry: b.industry ? industryLabel(b.industry) : undefined, need: b.goal } }),
      });
      t.remove();
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const picks = (data.picks || []).map((p) => ({ it: get(p.id), fit: p.fit === 'strong' ? 'strong' : 'partial', why: p.why ? [p.why] : [], s: 10 })).filter((p) => p.it);
      S.lastPicks = picks;
      S.shown = picks.length;
      say(h('p', null, data.summary || 'Here is what the advisor found.'), picks.length ? rcards(picks) : null, (data.gaps || []).length ? h('div', { class: 'gapnote' }, h('b', null, 'Gaps: '), data.gaps.join(' ')) : null);
      if ((data.questions || []).length) {
        say(h('p', null, 'To sharpen this, tell me:'));
        quick(data.questions, (q) => {
          ta.value = '';
          ta.placeholder = q;
          ta.focus();
        });
      } else followUps();
      return true;
    } catch {
      t.remove();
      say('The live advisor did not answer, so I will answer on-device instead.');
      return false;
    }
  }

  // ---------- reset & intro ----------
  function intro() {
    thread.replaceChildren(
      h(
        'div',
        { class: 'sb-intro' },
        h('div', { class: 'orb' }, img(SAMI, 'Sami, the Buzzar advisor', { width: 150, height: 150, loading: 'eager' })),
        h('h1', null, 'Hi, I’m ', h('span', { class: 'serif' }, 'Sami.')),
        h('p', null, 'Tell me what you want to change in your business, in your own words. I’ll ask a couple of questions, then show you what fits, and why.'),
        h(
          'div',
          { class: 'starters' },
          STARTERS.map(([e, t]) => {
            const bt = h('button', { type: 'button' }, h('span', null, e), t);
            bt.addEventListener('click', () => onUser(t));
            return bt;
          }),
        ),
      ),
    );
  }
  function reset() {
    Object.assign(S.brief, { goal: null, industry: null, role: null, size: null, platform: null, region: null, timeline: null, scale: null });
    S.extra = [];
    S.asked.clear();
    S.pending = null;
    S.focus = null;
    S.lastPicks = [];
    S.answered = false;
    lastPlan = null;
    intro();
    paintBrief();
    ta.focus();
  }

  // ---------- input wiring ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onUser(ta.value);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onUser(ta.value);
    }
  });
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(140, ta.scrollHeight) + 'px';
  });
  resetBtn.addEventListener('click', reset);
  speakBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return toast('Your browser cannot read aloud.');
    S.speak = !S.speak;
    speakBtn.setAttribute('aria-pressed', String(S.speak));
    if (!S.speak) speechSynthesis.cancel();
    toast(S.speak ? 'Sami will read replies aloud' : 'Voice off');
  });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) micBtn.title = 'Voice input is not supported in this browser';
  micBtn.addEventListener('click', () => {
    if (!SR) return toast('Voice input works in Chrome, Edge and Safari.');
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    micBtn.classList.add('on');
    rec.onresult = (e) => {
      ta.value = [...e.results].map((r) => r[0].transcript).join(' ');
      if (e.results[e.results.length - 1].isFinal) onUser(ta.value);
    };
    rec.onend = () => micBtn.classList.remove('on');
    rec.onerror = () => {
      micBtn.classList.remove('on');
      toast('I could not hear that. Check microphone permission.');
    };
    rec.start();
  });

  intro();
  paintBrief();
  paintShort();
  const q = route.params.get('q');
  if (q) setTimeout(() => onUser(q), 300);
  else setTimeout(() => ta.focus(), 300);

  return h('div', { class: 'sandbox' }, briefCol, chatCol, shortCol);
}
