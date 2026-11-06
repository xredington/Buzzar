// Home — two screens.
// Screen one: the promise, one primary action, and a live panel that answers as you type.
// Screen two: the tagline reveal and the closing action.
import { h, fmt, img, catImg } from '../ui.js';
import { all, getMeta, match, catLabel, TYPE, industryLabel } from '../data.js';
import { go } from '../main.js';

export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.', 'RACE'],
  ['Experience', 'See it working', 'Demonstrations and reference stories.', 'Experience Centres'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.', 'Blueprint Studios'],
  ['Build', 'Prove it', 'A bounded pilot against your own baseline.', 'Protoverse'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offer or Redington resale.', 'Tech Citadel / Marketplace'],
  ['Adopt', 'Measure the value', 'Track the agreed outcome and scale what works.', 'Adoption Factory'],
];

const STARTS = ['Fewer fraud losses', 'A first AI use case', 'Stop stockouts in 40 stores', 'Move our ERP to Azure'];
const KINDS = [
  ['', 'All'],
  ['product', 'Products'],
  ['service', 'Services'],
  ['accelerator', 'Accelerators'],
];

export default function home() {
  const meta = getMeta();
  return h('div', null, first(meta), second());
}

function first(meta) {
  const items = all();
  const skus = items.reduce((a, x) => a + (x.ns || 0), 0);

  // ---------- the ask ----------
  const input = h('input', { type: 'text', placeholder: 'Describe the change you want to make', 'aria-label': 'Describe the change you want to make', autocomplete: 'off', maxlength: 300 });
  const ask = h(
    'form',
    { class: 'ask', role: 'search' },
    h('div', { class: 'ask-row' }, h('i', { class: 'ph ph-sparkle', 'aria-hidden': 'true' }), input, h('button', { class: 'btn dark', type: 'submit' }, 'Talk to Sami', h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' }))),
    h(
      'div',
      { class: 'ask-starts', 'aria-label': 'Try one of these' },
      STARTS.map((s) =>
        h('button', {
          type: 'button',
          onclick: () => {
            input.value = s;
            input.dispatchEvent(new Event('input'));
            input.focus();
          },
        }, s),
      ),
    ),
  );
  ask.addEventListener('submit', (e) => {
    e.preventDefault();
    go('advisor' + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : ''));
  });

  // ---------- the live panel ----------
  const orbCanvas = h('canvas', { width: 80, height: 80, 'aria-hidden': 'true' });
  let orb = null;
  import('../orb.js').then(({ createOrb }) => (orb = createOrb(orbCanvas, { halo: false })));
  const countEl = h('b', { class: 'num' }, fmt(meta.total));
  const countLbl = h('small', null, 'governed listings');
  const titleEl = h('b', null, 'Live from the catalogue');
  const subEl = h('small', null, 'Start typing. Matches update as you go.');
  const tabsEl = h('div', { class: 'live-tabs', role: 'group', 'aria-label': 'Filter by kind' });
  const listEl = h('ul', { class: 'live-list', 'aria-live': 'polite' });
  const footLink = h('a', { class: 'textlink', href: '#/catalogue' }, 'Open the catalogue');
  let kind = '';
  let last = null;

  function featured() {
    // one strong example per kind, so the panel is useful before anyone types
    const pick = (y) => items.filter((x) => x.y === y && x.aws !== undefined).sort((a, b) => (b.ns || 0) - (a.ns || 0) || a.t.localeCompare(b.t));
    const out = [];
    for (const y of ['product', 'service', 'accelerator']) out.push(...pick(y).slice(0, y === 'accelerator' ? 1 : 2).map((it) => ({ it, fit: null })));
    return out;
  }

  function paintTabs(counts) {
    tabsEl.replaceChildren(
      ...KINDS.map(([k, l]) => {
        const b = h('button', { type: 'button', class: k ? `k-${k}` : '', 'aria-pressed': String(kind === k) }, l, counts ? h('span', null, fmt(k ? counts[k] || 0 : counts.all)) : null);
        b.addEventListener('click', () => {
          kind = k;
          paint(last);
        });
        return b;
      }),
    );
  }
  function row(r, i) {
    const it = r.it;
    return h(
      'li',
      null,
      h(
        'a',
        { class: 'live-item', href: `#/listing/${it.slug}`, style: { animationDelay: `${i * 50}ms` } },
        h('span', { class: 'thumb' }, img(catImg(it.c), '', { width: 48, height: 48 })),
        h('span', null, h('b', null, it.t), h('small', null, `${TYPE[it.y].label} · ${catLabel(it.c)} · ${it.k === 'distributor' ? 'Redington' : it.p}`)),
        r.fit ? h('span', { class: 'fit ' + r.fit }, r.fit === 'strong' ? 'Strong fit' : 'Partial') : h('span', { class: 'fit' }, it.ns ? `${it.ns} ways to buy` : TYPE[it.y].label),
      ),
    );
  }
  function paint(res) {
    last = res;
    if (!res) {
      titleEl.textContent = 'Live from the catalogue';
      subEl.textContent = 'Start typing. Matches update as you go.';
      countEl.textContent = fmt(meta.total);
      countLbl.textContent = 'governed listings';
      const c = { all: meta.total, ...meta.counts.type };
      paintTabs(c);
      const rows = featured().filter((r) => !kind || r.it.y === kind);
      const extra = kind ? items.filter((x) => x.y === kind).slice(0, 5 - rows.length) : [];
      listEl.replaceChildren(...[...rows, ...extra.map((it) => ({ it }))].slice(0, 5).map(row));
      footLink.href = kind ? `#/catalogue?type=${kind}` : '#/catalogue';
      return;
    }
    const counts = { all: res.total };
    for (const p of res.all) counts[p.it.y] = (counts[p.it.y] || 0) + 1;
    paintTabs(counts);
    const rows = res.all.filter((p) => !kind || p.it.y === kind).slice(0, 5);
    titleEl.textContent = rows.length ? 'What fits so far' : 'Nothing close yet';
    const u = res.u;
    const seen = [...u.industries.map(industryLabel), ...u.platforms, ...u.regions].slice(0, 3);
    subEl.textContent = seen.length ? `Reading: ${seen.join(', ')}` : 'Add your industry or platform to sharpen it';
    countEl.textContent = fmt(res.total);
    countLbl.textContent = 'related listings';
    listEl.replaceChildren(...(rows.length ? rows.map(row) : [h('li', { class: 'empty', style: { padding: '32px 16px', textAlign: 'center' } }, h('p', { class: 'body-6', style: { margin: 0 } }, 'Try naming the outcome, like “reduce fraud losses”, or the capability, like “identity and access”.'))]));
    footLink.href = `#/catalogue?q=${encodeURIComponent(input.value.trim())}${kind ? '&type=' + kind : ''}`;
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    orb?.setState(q ? 'listening' : 'idle');
    if (!q) return paint(null);
    timer = setTimeout(() => {
      orb?.setState('thinking');
      listEl.replaceChildren(...[0, 1, 2].map(() => h('li', { class: 'live-skel', 'aria-hidden': 'true' })));
      setTimeout(() => {
        const r = match(q, { limit: 400 });
        paint({ u: r.u, total: r.total, all: r.picks });
        orb?.setState('talking');
      }, 160);
    }, 180);
  });
  paint(null);

  const live = h(
    'aside',
    { class: 'live', 'aria-label': 'Live matches' },
    h(
      'div',
      { class: 'live-in' },
      h('div', { class: 'live-head' }, orbCanvas, h('div', null, titleEl, subEl), h('div', { class: 'count' }, countEl, countLbl)),
      tabsEl,
      listEl,
      h('div', { class: 'live-foot' }, h('span', null, 'Advisory only · from published listings'), footLink),
    ),
  );

  // ---------- dock: categories and the journey ----------
  const order = ['CLD', 'DNA', 'AI', 'SEC', 'SW'];
  const dock = h(
    'nav',
    { class: 'wrap dock', 'aria-label': 'Browse by category' },
    order.map((code) => h('a', { class: 'cat', href: `#/catalogue?cat=${code}` }, h('figure', null, img(catImg(code), '', { width: 56, height: 56 })), h('span', null, h('b', null, catLabel(code)), h('small', null, `${fmt(meta.counts.category[code] || 0)} listings`)))),
    h('div', { class: 'journey', 'aria-label': 'How a buyer moves' }, h('a', { href: '#/discover' }, 'Discover'), h('i', { class: 'ph ph-caret-right', 'aria-hidden': 'true' }), h('a', { href: '#/compare' }, 'Compare'), h('i', { class: 'ph ph-caret-right', 'aria-hidden': 'true' }), h('a', { href: '#/how-it-works' }, 'Connect')),
  );

  return h(
    'section',
    { class: 'home' },
    h(
      'div',
      { class: 'wrap home-grid' },
      h(
        'div',
        null,
        h('a', { class: 'hero-pill', href: '#/advisor' }, h('span', { class: 'tag' }, 'New'), h('span', { class: 'text-shimmer' }, 'Sami now builds whole solutions'), h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' })),
        h('h1', { class: 'heading-1 grad-text' }, 'The right expertise', h('br'), 'for your next move'),
        h('p', { class: 'sub' }, 'Describe the change you want. Buzzar reads every governed product, service and accelerator, shows what fits and why, and Redington delivers it.'),
        ask,
        h(
          'div',
          { class: 'proof' },
          h('div', null, h('b', null, fmt(items.length)), h('span', null, 'governed listings')),
          h('div', null, h('b', null, fmt(meta.providers.length)), h('span', null, 'vendors and partners')),
          h('div', null, h('b', null, fmt(skus)), h('span', null, 'ways to buy, priced on private offer')),
        ),
      ),
      live,
    ),
    dock,
  );
}

// ---------- screen two: tagline reveal + closing ----------
function second() {
  const text = 'Every listing is reviewed by a person before you see it. Every benefit shows its limits. Prices arrive as a private offer, and you make every choice.';
  const accent = new Set(['reviewed', 'limits.', 'choice.']);
  const words = text.split(' ').map((w) => h('span', { class: 'w' + (accent.has(w) ? ' accent' : '') }, w));
  const para = h('p', { class: 'say', 'aria-label': text }, words.flatMap((w, i) => (i ? [' ', w] : [w])));
  const sec = h(
    'section',
    { class: 'tagline' },
    h(
      'div',
      { class: 'wrap' },
      h('p', { class: 'eyebrow' }, 'Our promise'),
      para,
      h(
        'div',
        { class: 'closing reveal' },
        h(
          'div',
          { class: 'facts' },
          h('div', null, h('b', null, 'Checked before it is published'), h('span', null, 'A Buzzar checker approves every listing and its claims.')),
          h('div', null, h('b', null, 'Honest about limits'), h('span', null, 'Benefits are labelled as estimates until your pilot proves them.')),
          h('div', null, h('b', null, 'One request, one reference'), h('span', null, 'Every request to Redington carries a CRM reference you can track.')),
        ),
        h('a', { class: 'btn primary lg', href: '#/advisor' }, 'Describe your need to Sami', h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' })),
      ),
    ),
  );

  // words light up one at a time as the paragraph crosses a trigger line (rAF throttled, skill B11)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) words.forEach((w) => w.classList.add('on'));
  else {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!para.isConnected) return removeEventListener('scroll', onScroll);
      const r = para.getBoundingClientRect();
      const start = innerHeight * 0.85;
      const end = innerHeight * 0.35;
      const p = Math.max(0, Math.min(1, (start - r.top) / (start - end + r.height * 0.6)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => i < n && w.classList.add('on'));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    requestAnimationFrame(update);
  }
  return sec;
}
