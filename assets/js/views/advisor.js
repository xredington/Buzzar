// Talk to Sami — the Buzzar advisor.
//
// Sami listens, fills a discovery board (Your world · The challenge · The dream · Reality check), asks only the
// questions that change the answer, then answers in three lanes (Products, Services, Accelerators) and ends with
// a Solution: the combination that fits, each item with its first way to buy, sendable as one private-offer
// request. Advisory only: generated from published Buzzar listings.
//
// On-device mode (default) runs entirely in the browser. Live AI mode uses the Buzzar advisor API
// (POST /api/advisor/match) when the site is served from the API's own domain (see config.js).

import { h, fmt, toast, lists } from '../ui.js';
import { all, get, detail, understand, matchU, industryLabel, catLabel, label, getMeta } from '../data.js';
import { requestDialog, KIND, kindTag } from '../components.js';
import { buildPlan, renderPlan, downloadPlan, scopeSteps, prerequisites, skuLine } from '../plan.js';
import { createOrb } from '../orb.js';
import { CONFIG } from '../config.js';
import { go } from '../main.js';

const SHORT_KEY = 'bz:sami-shortlist';

// the discovery board, as the handover describes it
const BOARD = [
  ['Your world', [['industry', 'Industry'], ['role', 'Role'], ['region', 'Region'], ['size', 'Size']]],
  ['The challenge', [['goal', 'Need'], ['scale', 'Scale']]],
  ['The dream', [['success', 'Success looks like']]],
  ['Reality check', [['timeline', 'Timeline'], ['platform', 'Platforms'], ['constraints', 'Constraints']]],
];
const SLOT_COUNT = BOARD.reduce((a, [, s]) => a + s.length, 0);

const STARTERS = [
  ['Risk', 'Fewer fraud losses in our card payments'],
  ['AI', 'A first AI use case for our customer service team'],
  ['Retail', 'We run out of stock but still throw fresh food away'],
  ['Cloud', 'Move our ERP and file servers to Azure'],
  ['Security', 'A zero-trust programme for a bank in Riyadh'],
  ['Data', 'One trusted sales dashboard across six countries'],
];

const Q = {
  industry: { ask: 'Which industry are you in? It changes the ranking more than anything else.', opts: ['Retail & e-commerce', 'Financial services', 'Healthcare', 'Manufacturing', 'Public sector', 'Telecommunications', 'Logistics & distribution', 'Energy & utilities', 'Other / cross-industry'] },
  success: { ask: 'What would success look like a year from now?', opts: ['Lower operating cost', 'More revenue', 'Less risk and better compliance', 'Faster delivery', 'Better customer experience'] },
  platform: { ask: 'Where does it need to run?', opts: ['AWS', 'Azure', 'Google Cloud', 'On-premises', 'Hybrid', 'No preference'] },
  region: { ask: 'Where do you operate? Data residency rules differ by country.', opts: ['UAE', 'Saudi Arabia', 'Qatar / wider GCC', 'India', 'Africa', 'Elsewhere'] },
  timeline: { ask: 'How soon do you need something working?', opts: ['Within 3 months', '3–6 months', '6–12 months', 'Just exploring'] },
};
const IND_FROM_LABEL = { 'Retail & e-commerce': 'retail', 'Financial services': 'financial-services', Healthcare: 'healthcare', Manufacturing: 'manufacturing', 'Public sector': 'public-sector', Telecommunications: 'telecommunications', 'Logistics & distribution': 'logistics', 'Energy & utilities': 'utilities', 'Other / cross-industry': 'cross-industry' };
const REGION_FROM_LABEL = { UAE: 'UAE', 'Saudi Arabia': 'KSA', 'Qatar / wider GCC': 'GCC', India: 'India', Africa: 'Africa', Elsewhere: 'Elsewhere' };
const SUCCESS_WORDS = { 'Lower operating cost': 'automation efficiency cost', 'More revenue': 'revenue growth conversion', 'Less risk and better compliance': 'risk compliance governance', 'Faster delivery': 'delivery devops automation', 'Better customer experience': 'customer experience personalisation' };
const ROLE_WORDS = {
  'Technology leader': ['cio', 'cto', 'it director', 'head of it', 'infrastructure'],
  'Business leader': ['ceo', 'founder', 'owner', 'managing director', 'general manager'],
  Operations: ['coo', 'operations', 'supply chain', 'store manager', 'plant manager'],
  'Customer & marketing': ['cmo', 'marketing', 'customer experience', 'cx'],
  'Risk & security': ['ciso', 'security team', 'risk', 'compliance officer', 'audit'],
  'Data & analytics': ['cdo', 'data team', 'analytics', 'bi team'],
};
const has = (t, words) => words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(t));
const readSize = (t) => (has(t, ['smb', 'small business', 'startup', 'sme']) ? 'Small business' : has(t, ['mid-market', 'mid market', 'midsize']) ? 'Mid-market' : has(t, ['enterprise', 'multinational', 'group']) ? 'Enterprise' : has(t, ['government', 'ministry', 'municipality']) ? 'Government body' : null);
const readTimeline = (t) => (has(t, ['asap', 'urgent', 'this quarter', 'within 3 months']) ? 'Within 3 months' : has(t, ['this year', '6 months', '3–6 months']) ? '3–6 months' : has(t, ['next year', '12 months']) ? '6–12 months' : has(t, ['exploring', 'just looking']) ? 'Just exploring' : null);
const readRole = (t) => Object.entries(ROLE_WORDS).find(([, w]) => has(t, w))?.[0] || null;
const readScale = (t) => {
  const m = t.match(/(\d[\d,]*|six|five|four|three|two|ten)\s*(stores|branches|sites|hospitals|plants|factories|schools|outlets|warehouses|clinics|countries)/i);
  return m ? `${m[1]} ${m[2].toLowerCase()}` : null;
};
const readConstraints = (t) => {
  const c = [];
  if (has(t, ['residency', 'in-country', 'sovereign'])) c.push('Data must stay in-country');
  if (has(t, ['budget', 'cheap', 'low cost'])) c.push('Tight budget');
  if (has(t, ['legacy', 'mainframe'])) c.push('Legacy systems');
  if (has(t, ['regulator', 'pdpl', 'sama', 'nesa', 'cbuae'])) c.push('Regulator approval');
  return c;
};

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
  const blank = () => ({ industry: null, role: null, region: null, size: null, goal: null, scale: null, success: null, timeline: null, platform: null, constraints: [] });
  const S = { b: blank(), asked: new Set(), pending: null, focus: null, picks: [], extra: [], speak: false, mode: CONFIG.advisorEndpoint ? 'live' : 'local', just: new Set() };

  // ---------- layout ----------
  const barOrb = h('canvas', { width: 96, height: 96, 'aria-hidden': 'true' });
  const stateEl = h('span', { class: 'sami-state' }, 'Ready');
  const thread = h('div', { class: 'thread', 'aria-live': 'polite' });
  const scroller = h('div', { class: 'sami-scroll' }, thread);
  const ta = h('textarea', { rows: 1, placeholder: 'Describe the change you want to make…', 'aria-label': 'Message Sami', maxlength: 600 });
  const micBtn = h('button', { class: 'round', type: 'button', 'aria-label': 'Speak to Sami', title: 'Speak', html: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>' });
  const sendBtn = h('button', { class: 'round send', type: 'submit', 'aria-label': 'Send', html: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' });
  const form = h('form', null, micBtn, ta, sendBtn);
  const speakBtn = h('button', { class: 'round', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Read replies aloud', title: 'Read replies aloud', html: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>' });
  const resetBtn = h('button', { class: 'round', type: 'button', 'aria-label': 'Start over', title: 'Start over', html: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>' });
  const modeEl = h('div', { class: 'mode', role: 'group', 'aria-label': 'Answer mode' }, h('button', { type: 'button', 'data-m': 'local', 'aria-pressed': String(S.mode === 'local') }, 'On device'), h('button', { type: 'button', 'data-m': 'live', 'aria-pressed': String(S.mode === 'live') }, 'Live AI'));
  modeEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    if (b.dataset.m === 'live' && !CONFIG.advisorEndpoint) return toast('Live AI runs when this site is served from the Buzzar API domain');
    S.mode = b.dataset.m;
    for (const x of modeEl.children) x.setAttribute('aria-pressed', String(x.dataset.m === S.mode));
  });

  const meterEl = h('div', { class: 'meter' });
  const funnelEl = h('div', { class: 'funnel-line' });
  const boardEl = h('div', { class: 'board-scroll' });

  const main = h(
    'section',
    { class: 'sami-main', 'aria-label': 'Conversation with Sami' },
    h('div', { class: 'sami-bar' }, barOrb, h('div', null, h('b', null, 'Sami'), stateEl), h('div', { class: 'tools' }, h('span', { class: 'advisory' }, 'Advisory only · from published Buzzar listings'), modeEl, speakBtn, resetBtn)),
    scroller,
    h('div', { class: 'composer' }, form, h('p', { class: 'hint' }, h('span', null, 'Enter to send · Shift+Enter for a new line'), h('span', null, 'On device answers never leave your browser'))),
  );
  const boardCol = h(
    'aside',
    { class: 'board-col', 'aria-label': 'Discovery board' },
    h('div', { class: 'board-head' }, h('h2', null, 'Discovery board', h('span', null, 'fills as Sami listens')), meterEl, funnelEl),
    boardEl,
    h('div', { class: 'board-foot' }, h('button', { class: 'btn sm', type: 'button', onclick: compareShort }, 'Compare shortlist'), h('button', { class: 'btn sm', type: 'button', onclick: downloadBrief }, 'Download brief')),
  );

  // ---------- orb state ----------
  const orb = createOrb(barOrb, { halo: false });
  let introOrb = null;
  const STATE_TXT = { idle: 'Ready', listening: 'Listening', thinking: 'Thinking', talking: 'Answering' };
  let talkTimer;
  function setState(s) {
    orb.setState(s);
    introOrb?.setState(s);
    stateEl.textContent = STATE_TXT[s];
    clearTimeout(talkTimer);
    if (s === 'talking') talkTimer = setTimeout(() => setState('idle'), 1800);
  }

  // ---------- rendering helpers ----------
  const scrollDown = () => requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' }));
  const textOf = (nodes) => nodes.flat(Infinity).map((n) => (typeof n === 'string' ? n : n?.textContent || '')).join(' ');
  function say(...content) {
    const av = h('canvas', { class: 'av', width: 60, height: 60, 'aria-hidden': 'true' });
    thread.append(h('div', { class: 'msg' }, av, h('div', { class: 'bubble' }, content)));
    createOrb(av, { halo: false, density: 0.6 });
    setState('talking');
    scrollDown();
    if (S.speak && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(textOf(content).replace(/\s+/g, ' ').slice(0, 420));
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }
  }
  function me(text) {
    thread.append(h('div', { class: 'msg me' }, h('div', { class: 'bubble' }, text)));
    scrollDown();
  }
  function quick(options, onPick, skipLabel) {
    const box = h('div', { class: 'quick' });
    for (const o of options) box.append(h('button', { type: 'button', onclick: () => (box.remove(), onPick(o)) }, o));
    if (skipLabel) box.append(h('button', { type: 'button', class: 'skip', onclick: () => (box.remove(), onPick(null)) }, skipLabel));
    thread.append(box);
    scrollDown();
  }
  const clearQuick = () => thread.querySelectorAll('.quick').forEach((q) => q.remove());
  function think(ms = 800) {
    setState('thinking');
    const t = h('div', { class: 'msg' }, h('span', { class: 'av' }), h('div', { class: 'bubble typing' }, h('i'), h('i'), h('i')));
    thread.append(t);
    scrollDown();
    return new Promise((r) => setTimeout(() => (t.remove(), r()), matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : ms));
  }

  // ---------- board ----------
  function value(k) {
    const b = S.b;
    if (k === 'industry' && b.industry) return industryLabel(b.industry);
    if (k === 'region' && b.region) return { KSA: 'Saudi Arabia' }[b.region] || b.region;
    if (k === 'constraints') return b.constraints.length ? b.constraints.join(' · ') : null;
    return b[k];
  }
  function paintBoard() {
    const filled = BOARD.flatMap(([, s]) => s).filter(([k]) => value(k)).length;
    meterEl.replaceChildren(h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round((filled / SLOT_COUNT) * 100)}%` } })));
    const { inPlay } = funnel();
    funnelEl.replaceChildren(h('b', null, fmt(inPlay)), h('span', null, `of ${fmt(meta.total)} listings still in play`));
    const shortIds = short.get().filter(get);
    boardEl.replaceChildren(
      ...BOARD.map(([title, slots]) => {
        const n = slots.filter(([k]) => value(k)).length;
        return h(
          'section',
          { class: 'bgroup' },
          h('h3', null, title, h('span', null, `${n}/${slots.length}`)),
          h(
            'dl',
            { style: { margin: 0 } },
            slots.map(([k, name]) => {
              const v = value(k);
              return h('div', { class: 'bslot' + (S.just.has(k) ? ' just' : '') }, h('dt', null, name), h('dd', { class: v ? '' : 'unknown' }, v || '—'));
            }),
          ),
        );
      }),
      h(
        'section',
        { class: 'bgroup' },
        h('h3', { style: { color: 'var(--f-action)' } }, 'Shortlist', h('span', null, String(shortIds.length))),
        shortIds.length
          ? h(
              'div',
              { class: 'shortlist' },
              shortIds.map((id) => {
                const it = get(id);
                return h('div', { class: `sitem k-${it.y}` }, h('div', null, h('a', { href: `#/listing/${it.slug}` }, it.t), h('small', null, `${KIND[it.y].label} · ${catLabel(it.c)}`)), h('button', { type: 'button', 'aria-label': `Remove ${it.t}`, onclick: () => (short.set(short.get().filter((x) => x !== id)), paintBoard()) }, '×'));
              }),
            )
          : h('p', { class: 'muted small', style: { margin: 0 } }, 'Pin listings from the conversation to keep them here.'),
      ),
    );
    S.just.clear();
  }
  function pin(it) {
    const a = short.get();
    if (!a.includes(it.id)) a.push(it.id);
    short.set(a);
    paintBoard();
    toast(`Pinned: ${it.t}`);
  }
  function compareShort() {
    const ids = short.get().filter(get).slice(0, 3);
    if (!ids.length) return toast('Pin a listing first.');
    lists.set('compare', ids);
    go('compare');
  }
  function downloadBrief() {
    if (!S.b.goal) return toast('Tell Sami what you need first.');
    const rows = BOARD.flatMap(([g, slots]) => slots.map(([k, n]) => [`${g} · ${n}`, [value(k) || 'Not yet known']]));
    rows.push(['Shortlist', short.get().map(get).filter(Boolean).map((x) => x.t)]);
    downloadPlan({ t: 'Discovery brief', slug: 'brief' }, rows);
  }

  // ---------- understanding ----------
  function toU() {
    const b = S.b;
    const u = understand([b.goal || '', SUCCESS_WORDS[b.success] || '', ...S.extra].join(' '));
    if (b.industry && b.industry !== 'cross-industry') u.industries = [b.industry];
    if (b.platform && b.platform !== 'No preference') u.platforms = [b.platform];
    if (b.region && b.region !== 'Elsewhere') u.regions = [b.region];
    return u;
  }
  function funnel() {
    if (!S.b.goal) {
      const ind = S.b.industry && S.b.industry !== 'cross-industry' ? all().filter((x) => x.i.includes(S.b.industry) || x.i.includes('cross-industry')).length : meta.total;
      return { inPlay: ind };
    }
    return { inPlay: matchU(toU(), { limit: 2000 }).total };
  }
  function absorb(text, slot) {
    const before = JSON.stringify(S.b);
    const u = understand(text);
    const b = S.b;
    if (slot === 'industry') b.industry = IND_FROM_LABEL[text] || u.industries[0] || 'cross-industry';
    if (slot === 'platform') b.platform = text;
    if (slot === 'region') b.region = REGION_FROM_LABEL[text] || u.regions[0] || text;
    if (slot === 'timeline') b.timeline = readTimeline(text) || text;
    if (slot === 'success') b.success = text;
    b.industry ||= u.industries[0] || null;
    b.platform ||= u.platforms[0] || null;
    b.region ||= u.regions[0] || null;
    b.size ||= readSize(text);
    b.timeline ||= readTimeline(text);
    b.role ||= readRole(text);
    b.scale ||= readScale(text);
    for (const c of readConstraints(text)) if (!b.constraints.includes(c)) b.constraints.push(c);
    const after = S.b;
    const prev = JSON.parse(before);
    for (const k of Object.keys(after)) if (JSON.stringify(after[k]) !== JSON.stringify(prev[k])) S.just.add(k);
  }
  function nextQuestion() {
    if (S.asked.size >= 3) return null;
    const b = S.b;
    const u = toU();
    for (const k of ['industry', 'success', 'platform', 'region', 'timeline']) {
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
    if (/^back to (my )?(matches|solution)$/i.test(text)) return backToMatches();
    thread.querySelector('.sami-intro')?.remove();
    introOrb = null;
    clearQuick();
    me(text);
    ta.value = '';
    ta.style.height = '';
    if (S.focus && !S.pending && /\?$|^(how|what|who|when|which|is|does|can|do)\b|price|cost|long|include|buy|not for|need|measure|platform/i.test(text)) return answerListing(S.focus, text);
    if (S.pending) {
      absorb(text, S.pending);
      S.pending = null;
    } else if (!S.b.goal) {
      S.b.goal = text.length > 110 ? text.slice(0, 108).trim() + '…' : text;
      S.just.add('goal');
      absorb(text);
    } else {
      S.extra.push(text);
      absorb(text);
    }
    paintBoard();
    const k = nextQuestion();
    if (k) {
      await think(650);
      const { inPlay } = funnel();
      const seen = [S.b.industry && S.b.industry !== 'cross-industry' ? industryLabel(S.b.industry) : null, S.b.platform, S.b.region && value('region')].filter(Boolean);
      const lead = S.asked.size === 0 ? `Understood${seen.length ? ` — ${seen.join(', ')}` : ''}. ${fmt(inPlay)} listings could help.` : `Noted — ${fmt(inPlay)} listings in play.`;
      S.asked.add(k);
      S.pending = k;
      say(h('p', null, lead, ' ', Q[k].ask));
      quick(Q[k].opts, (o) => (o ? onUser(o) : skipAll()), 'Skip — show me the answer');
      return;
    }
    await answer();
  }
  function skipAll() {
    S.pending = null;
    me('Show me the answer');
    ['industry', 'success', 'platform', 'region', 'timeline'].forEach((k) => S.asked.add(k));
    answer();
  }

  function sentence() {
    const b = S.b;
    const parts = [b.role ? `A ${b.role.toLowerCase()}` : 'You'];
    if (b.industry && b.industry !== 'cross-industry') parts.push(`in ${industryLabel(b.industry).toLowerCase()}`);
    if (b.scale || b.size) parts.push(`(${[b.size?.toLowerCase(), b.scale].filter(Boolean).join(', ')})`);
    parts.push(`${parts[0] === 'You' ? 'want' : 'wants'} to ${(b.goal || 'improve something').replace(/^(we|i)\s+(want|need|would like)\s+to\s+/i, '').replace(/[.?!…]+$/, '').toLowerCase()}`);
    if (b.success) parts.push(`— success is ${b.success.toLowerCase()}`);
    if (b.platform && b.platform !== 'No preference') parts.push(`on ${b.platform}`);
    if (b.region && b.region !== 'Elsewhere') parts.push(`in ${value('region')}`);
    if (b.timeline) parts.push(b.timeline === 'Just exploring' ? '(exploring for now)' : `(${b.timeline.toLowerCase()})`);
    return parts.join(' ') + '.';
  }

  async function answer() {
    S.pending = null;
    if (S.mode === 'live' && CONFIG.advisorEndpoint && (await answerLive())) return;
    await think(1100);
    const b = S.b;
    const r = matchU(toU(), { limit: 40, boost: (it) => (b.timeline === 'Within 3 months' && it.y === 'accelerator' ? 4 : 0) });
    S.picks = r.picks;
    if (!r.picks.length) {
      say(h('p', null, 'No published listing fits that closely enough.'), h('p', null, 'Try naming the outcome (“reduce fraud losses”) or the capability (“identity and access”). You can also ask Redington directly in a custom proposal.'));
      return quick(['Search the catalogue', 'Start over'], (o) => (o === 'Start over' ? reset() : go('catalogue')));
    }
    const lanes = ['product', 'service', 'accelerator'].map((y) => [y, r.picks.filter((p) => p.it.y === y).slice(0, 2)]).filter(([, a]) => a.length);
    const strong = r.picks.filter((p) => p.fit === 'strong').length;
    say(
      h('p', null, h('b', null, 'What I heard: '), sentence()),
      h('p', null, `${fmt(r.total)} of ${fmt(meta.total)} listings relate to this; ${strong ? `${strong} fit strongly` : 'none fit perfectly, so these are the closest'}.`),
      h('div', { class: 'lanes' }, lanes.map(([y, ps]) => h('div', { class: 'lane' }, h('p', { class: `kind k-${y}` }, KIND[y].lane), ps.map(rcard)))),
      gaps(r),
    );
    await solution(r.picks);
    followUps();
  }

  function rcard(p) {
    const it = p.it;
    const bars = p.fit === 'strong' ? 3 : p.s > 10 ? 2 : 1;
    return h(
      'div',
      { class: `rcard k-${it.y}` },
      h('div', null, h('b', null, h('a', { href: `#/listing/${it.slug}` }, it.t)), h('div', { class: 'rmeta' }, `${catLabel(it.c)} · ${it.k === 'distributor' ? 'Redington' : it.p}`), h('p', { class: 'rwhy' }, p.why.length ? 'Why: ' + p.why.slice(0, 3).join(' · ') : it.s)),
      h('span', { class: 'fitmeter' + (p.fit === 'strong' ? '' : ' partial'), title: p.fit === 'strong' ? 'Strong fit' : 'Partial fit' }, [0, 1, 2].map((j) => h('i', { class: j < bars ? 'on' : '' })), p.fit === 'strong' ? ' Strong' : ' Partial'),
      h('div', { class: 'racts' }, h('button', { type: 'button', onclick: () => pin(it) }, 'Pin'), h('button', { type: 'button', onclick: () => focusListing(it) }, 'Ask about it'), h('button', { type: 'button', onclick: () => (me(`Mission plan for ${it.t}`), plan(it)) }, 'Mission plan'), h('a', { href: `#/listing/${it.slug}` }, 'Open listing')),
    );
  }

  function gaps(r) {
    const notes = [];
    const u = toU();
    if (r.picks[0]?.fit !== 'strong') notes.push('No single listing covers this closely; a custom proposal may combine two.');
    if (u.categories.length > 1) notes.push(`Your need spans ${u.categories.map(catLabel).join(' and ')}, so the answer is a combination rather than one listing.`);
    if (S.b.region && S.b.region !== 'Elsewhere' && !r.picks.slice(0, 4).some((p) => p.it.r.length)) notes.push('Most matches do not state regional availability yet; confirm residency in the discovery call.');
    return notes.length ? h('div', { class: 'gapnote' }, h('b', null, 'Gaps to know about: '), notes.join(' ')) : null;
  }

  // ---------- the Solution step ----------
  let lastSolution = null;
  async function solution(picks) {
    const best = (y) => picks.find((p) => p.it.y === y);
    const roles = [
      ['product', 'Product', 'The software you license'],
      ['service', 'Service', 'Who implements it'],
      ['accelerator', 'Accelerator', 'A packaged head start'],
    ];
    const chosen = roles.map(([y, role, why]) => ({ y, role, why, p: best(y) })).filter((x) => x.p || x.y !== 'accelerator');
    const details = await Promise.all(chosen.map((x) => (x.p ? detail(x.p.it.id) : null)));
    const items = chosen.map((x, i) => ({ ...x, sku: details[i]?.skus?.[0] || null }));
    const inCat = items.filter((x) => x.p);
    if (!inCat.length) return;
    lastSolution = items;
    const title = S.b.goal ? S.b.goal.replace(/[.?!…]+$/, '') : 'Your solution';
    const send = h('button', { class: 'btn primary sm', type: 'button' }, 'Send this solution as one private offer request');
    send.addEventListener('click', () => requestDialog(inCat[0].p.it, 'private-offer', null, { bundle: inCat.map((x) => ({ it: x.p.it, sku: x.sku ? `${x.sku.edition} (${x.sku.code})` : null })), title: 'Solution: ' + title, need: sentence() }));
    say(
      h('p', null, 'Here is the combination I would take to Redington:'),
      h(
        'div',
        { class: 'solution' },
        h('header', null, h('p', { class: 'label' }, 'Solution'), h('h3', null, title[0].toUpperCase() + title.slice(1)), h('p', null, `${inCat.length} part${inCat.length === 1 ? '' : 's'} from the catalogue${items.length > inCat.length ? ', 1 to confirm with Redington' : ''}`)),
        items.map((x) =>
          x.p
            ? h('div', { class: `sol-item k-${x.y}` }, h('span', { class: 'role' }, x.role), h('div', null, h('b', null, h('a', { href: `#/listing/${x.p.it.slug}` }, x.p.it.t)), h('span', { class: 'muted small' }, `${x.why} · ${x.p.it.k === 'distributor' ? 'Redington' : x.p.it.p}`), x.sku ? h('div', null, h('code', null, skuLine(x.sku))) : null))
            : h('div', { class: 'sol-item missing' }, h('span', { class: 'role' }, x.role), h('div', null, h('b', null, `${x.why}`), h('span', { class: 'muted small' }, 'Not in the catalogue: ask Redington to confirm it in a request.'))),
        ),
        h('div', { class: 'sol-foot' }, h('small', null, 'Prices come as a private offer · sample editions'), send),
      ),
    );
    inCat.forEach((x) => {
      const a = short.get();
      if (!a.includes(x.p.it.id)) a.push(x.p.it.id);
      short.set(a);
    });
    paintBoard();
  }

  function followUps() {
    quick(['Only accelerators', 'Only buyable on AWS Marketplace', 'Compare the top 3', 'Mission plan for the top match', 'Start over'], onFollow);
  }
  async function onFollow(o) {
    me(o);
    if (o === 'Start over') return reset();
    if (o === 'Compare the top 3') {
      lists.set('compare', S.picks.slice(0, 3).map((p) => p.it.id));
      return go('compare');
    }
    if (o === 'Mission plan for the top match') return plan(S.picks[0].it);
    await think(600);
    const filt = o === 'Only accelerators' ? (it) => it.y === 'accelerator' : (it) => it.aws;
    const r = matchU(toU(), { limit: 4, filter: filt });
    if (!r.picks.length) say(h('p', null, o === 'Only accelerators' ? 'No accelerator fits this brief yet. The services above are the faster route.' : 'None of the close matches are buyable on AWS Marketplace yet; Redington resale is the route.'));
    else say(h('p', null, o === 'Only accelerators' ? 'Accelerators shorten delivery. The closest:' : 'These you can buy through an AWS Marketplace private offer:'), h('div', { class: 'lanes' }, r.picks.slice(0, 3).map(rcard)));
    followUps();
  }
  function backToMatches() {
    clearQuick();
    S.focus = null;
    if (!S.picks.length) return say(h('p', null, 'Tell me what you want to change, and I will find what fits.'));
    me('Back to my matches');
    say(h('p', null, 'Your top matches again:'), h('div', { class: 'lanes' }, S.picks.slice(0, 4).map(rcard)));
    followUps();
  }

  // ---------- questions about one listing ----------
  const LQ = ['How long does it take?', 'What do I get?', 'Who is it not for?', 'How do I buy it?', 'What do I need in place?', 'How is success measured?'];
  async function focusListing(it) {
    S.focus = it;
    me(`Tell me about ${it.t}`);
    await think(500);
    const d = await detail(it.id);
    say(h('p', null, h('b', null, it.t), ` — ${d?.outcome || it.s}`), h('p', null, 'What would you like to know?'));
    quick(LQ, (o) => onUser(o), 'Back to my matches');
  }
  async function answerListing(it, q) {
    await think(600);
    const d = await detail(it.id);
    const t = q.toLowerCase();
    const out = [];
    if (!d) out.push(h('p', null, 'The full record is not in this snapshot; a discovery call will cover it.'));
    else if (/long|duration|time|weeks|months|effort|fast/.test(t)) {
      const w = d.delivery?.weeks ? `${d.delivery.weeks[0]}–${d.delivery.weeks[1]} weeks (sample delivery details)` : d.effort || it.db;
      out.push(h('p', null, w ? `Published estimate: ${w}.` : 'No duration is published yet.'), scopeSteps(d.scope).length ? h('ol', null, scopeSteps(d.scope).slice(0, 4).map((s) => h('li', null, s))) : null);
    } else if (/get|deliver|include|output/.test(t)) out.push(h('p', null, 'You receive:'), h('ul', null, (d.deliverables.length ? d.deliverables : scopeSteps(d.scope)).slice(0, 6).map((x) => h('li', null, x))));
    else if (/not for|avoid|wrong|bad fit/.test(t)) out.push(d.notFor.length ? [h('p', null, 'It is not a fit when:'), h('ul', null, d.notFor.map((n) => h('li', null, n.situation)))] : h('p', null, 'The listing does not publish exclusions yet; ask in the discovery call.'));
    else if (/buy|price|cost|purchase|pay|licen|marketplace/.test(t)) {
      const routes = [...new Set(d.skus.flatMap((s) => s.routes))].map(label.route);
      out.push(h('p', null, `${d.skus.length} way${d.skus.length === 1 ? '' : 's'} to buy:`), h('ul', null, d.skus.map((s) => h('li', null, skuLine(s)))), h('p', null, `Routes: ${routes.join(', ') || 'agreed in a proposal'}. Prices come as a private offer, never as an amount.`));
    } else if (/need|prereq|require|in place|ready|data/.test(t)) {
      const pre = prerequisites(d);
      out.push(pre.length ? [h('p', null, 'Have these in place first:'), h('ul', null, pre.map((x) => h('li', null, x)))] : h('p', null, 'No prerequisites are published; a named owner and data access are always needed.'), d.residency ? h('p', null, `Data residency: ${d.residency}.`) : null);
    } else if (/measure|kpi|success|roi|value|benefit/.test(t)) out.push(h('p', null, d.kpi ? `Main measure of value: ${d.kpi}.` : 'No success measure is published yet.'), d.benefits.length ? h('ul', null, d.benefits.map((b) => h('li', null, `${b.text} (${b.kind})`))) : null, h('p', { class: 'small' }, 'Benefits are estimates until measured against your own baseline.'));
    else out.push(h('p', null, d.overview || d.outcome));
    say(...out);
    quick([...LQ.filter((x) => x.toLowerCase() !== t), 'Mission plan', 'Request a discovery call'], (o) => (o === 'Request a discovery call' ? requestDialog(it, 'discovery') : o === 'Mission plan' ? (me(`Mission plan for ${it.t}`), plan(it)) : onUser(o)), 'Back to my matches');
  }

  // ---------- mission plan ----------
  async function plan(it) {
    S.focus = it;
    await think(1100);
    const d = await detail(it.id);
    const sections = buildPlan(it, d, sentence());
    say(h('p', null, h('b', null, `Mission plan · ${it.t}`)), renderPlan(it, sections), h('div', { class: 'chips', style: { marginTop: '12px' } }, h('button', { class: 'btn sm', type: 'button', onclick: () => downloadPlan(it, sections) }, 'Download (.md)'), h('button', { class: 'btn primary sm', type: 'button', onclick: () => requestDialog(it, 'discovery', null, { need: sentence() }) }, 'Request a discovery call')));
    pin(it);
    quick(LQ.slice(0, 4), (o) => onUser(o), 'Back to my matches');
  }

  // ---------- live AI ----------
  async function answerLive() {
    setState('thinking');
    const t = h('div', { class: 'msg' }, h('span', { class: 'av' }), h('div', { class: 'bubble' }, 'Asking the Buzzar advisor…'));
    thread.append(t);
    scrollDown();
    try {
      const res = await fetch(CONFIG.advisorEndpoint, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ problem: sentence(), industry: S.b.industry ? industryLabel(S.b.industry) : undefined, slots: { industry: S.b.industry ? industryLabel(S.b.industry) : undefined, need: S.b.goal } }) });
      t.remove();
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const picks = (data.picks || []).map((p) => ({ it: get(p.id), fit: p.fit === 'strong' ? 'strong' : 'partial', why: p.why ? [p.why] : [], s: 10 })).filter((p) => p.it);
      S.picks = picks;
      say(h('p', null, data.summary || 'Here is what the advisor found.'), h('div', { class: 'lanes' }, picks.map(rcard)), (data.gaps || []).length ? h('div', { class: 'gapnote' }, h('b', null, 'Gaps to know about: '), data.gaps.join(' ')) : null);
      await solution(picks);
      if ((data.questions || []).length) quick(data.questions, (q) => ((ta.placeholder = q), ta.focus()));
      else followUps();
      return true;
    } catch {
      t.remove();
      say(h('p', null, 'The live advisor did not answer, so I will answer on-device.'));
      return false;
    }
  }

  // ---------- intro & reset ----------
  function intro() {
    const big = h('canvas', { width: 360, height: 360, 'aria-hidden': 'true' });
    thread.replaceChildren(
      h(
        'div',
        { class: 'sami-intro' },
        big,
        h('h1', null, 'Talk to Sami'),
        h('p', null, 'Say what you want to change. I ask, you answer, and the right fit appears.'),
        h('div', { class: 'starters' }, STARTERS.map(([k, t]) => h('button', { type: 'button', onclick: () => onUser(t) }, h('small', null, k), t))),
      ),
    );
    introOrb = createOrb(big, { halo: true });
  }
  function reset() {
    S.b = blank();
    S.asked.clear();
    S.pending = null;
    S.focus = null;
    S.picks = [];
    S.extra = [];
    lastSolution = null;
    intro();
    paintBoard();
    setState('idle');
    ta.focus();
  }

  // ---------- input ----------
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
    if (orb.state === 'idle' && ta.value) setState('listening');
    if (!ta.value && orb.state === 'listening') setState('idle');
  });
  resetBtn.addEventListener('click', reset);
  speakBtn.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return toast('This browser cannot read aloud.');
    S.speak = !S.speak;
    speakBtn.setAttribute('aria-pressed', String(S.speak));
    if (!S.speak) speechSynthesis.cancel();
  });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  micBtn.addEventListener('click', () => {
    if (!SR) return toast('Voice input works in Chrome, Edge and Safari.');
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    micBtn.classList.add('on');
    setState('listening');
    rec.onresult = (e) => {
      ta.value = [...e.results].map((r) => r[0].transcript).join(' ');
      if (e.results[e.results.length - 1].isFinal) onUser(ta.value);
    };
    rec.onend = () => {
      micBtn.classList.remove('on');
      if (orb.state === 'listening') setState('idle');
    };
    rec.onerror = () => {
      micBtn.classList.remove('on');
      toast('I could not hear that. Check microphone permission.');
    };
    rec.start();
  });

  intro();
  paintBoard();
  const q = route.params.get('q');
  if (q) setTimeout(() => onUser(q), 250);
  else setTimeout(() => ta.focus(), 250);

  return h('div', { class: 'sami' }, main, boardCol);
}
