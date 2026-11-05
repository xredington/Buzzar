import { h, icon, countUp, onReveal, fmt, img, catImg, IND_IMG, monogram } from '../ui.js';
import { all, getMeta, industryLabel, CAT_BLURB } from '../data.js';
import { card } from '../components.js';
import { go } from '../main.js';

export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.'],
  ['Experience', 'See it working', 'Demos and reference stories in Redington experience centres.'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.'],
  ['Build', 'Prove it', 'A bounded pilot against your baseline, not a promise.'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offers or Redington resale.'],
  ['Adopt', 'Measure the value', 'Track the outcome you agreed, and scale what works.'],
];

const ROTATE = ['next move.', 'AI rollout.', 'cloud migration.', 'zero-trust plan.', 'data platform.'];
const PROMPTS = ['Stop stockouts across 40 stores', 'Zero trust for a bank in Riyadh', 'Move our ERP to Azure', 'A GenAI assistant for our call centre'];

const alive = (el) => document.body.contains(el);

export default function home() {
  const meta = getMeta();
  const items = all();
  return h('div', null, hero(meta), logos(meta), beams(meta), bento(meta), sami(), gallery(meta), journey(), latest(items), tickers(meta), partner());
}

// ---------- hero ----------
function hero(meta) {
  const rot = h('span', { class: 'rot' }, h('span', { class: 'rot-word' }, h('span', { class: 'grad' }, ROTATE[0])));
  let ri = 0;
  const timer = setInterval(() => {
    if (!alive(rot)) return clearInterval(timer);
    const cur = rot.firstChild;
    cur.classList.add('out');
    setTimeout(() => {
      ri = (ri + 1) % ROTATE.length;
      rot.replaceChildren(h('span', { class: 'rot-word' }, h('span', { class: 'grad' }, ROTATE[ri])));
    }, 380);
  }, 2800);

  const input = h('input', { type: 'text', placeholder: 'Describe the outcome you want…', 'aria-label': 'Describe the outcome you want', autocomplete: 'off', maxlength: 400 });
  const form = h('form', { class: 'ask-box', role: 'search' }, h('span', { class: 'spark', 'aria-hidden': 'true' }, '✦'), input, h('button', { class: 'btn shimmer', type: 'submit' }, h('span', { class: 'sh-spark' }), 'Ask Sami', h('span', { class: 'arr' }, '→')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    go('advisor?q=' + encodeURIComponent(input.value.trim() || PROMPTS[0]));
  });

  const chip = (style, iconTxt, bg, title, sub, extra = '') => h('div', { class: 'glass-chip ' + extra, style }, h('span', { class: 'ic', style: { background: bg } }, iconTxt), h('div', null, h('b', null, title), h('small', null, sub)));

  return h(
    'section',
    { class: 'hero2' },
    h('div', { class: 'aurora', 'aria-hidden': 'true' }),
    h('div', { class: 'dots', 'aria-hidden': 'true' }),
    h(
      'div',
      { class: 'wrap hero2-grid' },
      h(
        'div',
        null,
        h('a', { class: 'hero-pill', href: '#/advisor' }, h('span', { class: 'tag' }, 'New'), h('span', { class: 'text-shimmer' }, 'Meet Sami, your solution advisor'), h('span', { class: 'arr' }, '→')),
        h('h1', null, 'The right expertise', h('br'), 'for your ', rot),
        h('p', { class: 'lede' }, `${fmt(meta.total)} governed products, services and accelerators across cloud, data, AI, security and software. Tell Sami what you want to change; get a shortlist that explains itself.`),
        h('div', { class: 'beam-box' }, form),
        h('div', { class: 'prompts' }, PROMPTS.slice(1).map((p) => h('button', { type: 'button', onclick: () => go('advisor?q=' + encodeURIComponent(p)) }, p))),
        h('div', { class: 'trust' }, h('span', null, 'Every claim shows its basis'), h('span', null, 'Nothing you type is stored'), h('span', null, 'Delivered by Redington')),
      ),
      h(
        'div',
        { class: 'hero-visual' },
        img('assets/img/hero.webp', 'Glass honeycomb with a golden bee', { class: 'main', loading: 'eager', fetchpriority: 'high', width: 1100, height: 829 }),
        chip({ left: '-2%', top: '8%', animationDelay: '.3s, 0s' }, '✓', 'var(--green-soft)', 'Strong fit', 'Demand forecasting · Retail'),
        chip({ right: '-2%', top: '42%', animationDelay: '.6s, 1.2s' }, '◆', 'var(--honey-soft)', `${fmt(meta.providers.length)} providers`, 'Cisco, Fortinet, Dell…'),
        chip({ left: '6%', bottom: '4%', animationDelay: '.9s, 2s' }, '✦', '#f0ebff', 'Sami asked 2 questions', '43 → 3 matches', 'keep'),
      ),
    ),
  );
}

// ---------- logo cloud ----------
function logos(meta) {
  const top = meta.providers.filter((p) => p.name !== 'Redington').slice(0, 24);
  const row = (hidden) => top.map((p) => h('a', { href: `#/catalogue?prov=${encodeURIComponent(p.name)}`, 'aria-hidden': hidden ? 'true' : null, tabindex: hidden ? '-1' : null }, p.name));
  return h('section', { class: 'logos' }, h('p', null, 'Solutions from the vendors you already run on'), h('div', { class: 'marquee' }, h('div', { class: 'marquee-track' }, row(false), row(true))));
}

// ---------- animated beam: your brief → Sami → providers ----------
function beams(meta) {
  const left = [
    ['bag', 'Retail, 40 stores'],
    ['target', 'Cut stockouts 20%'],
    ['CLD', 'Runs on Azure'],
    ['columns', 'UAE data residency'],
  ];
  const right = meta.providers.filter((p) => p.name !== 'Redington').slice(0, 4);
  const node = (ic, t) => h('div', { class: 'node' }, h('span', { class: 'ni' }, icon(ic)), t);
  const L = h('div', { class: 'node-col' }, left.map(([i, t]) => node(i, t)));
  const R = h('div', { class: 'node-col right' }, right.map((p) => h('div', { class: 'node' }, monogram(p.name), p.name)));
  for (const m of R.querySelectorAll('.mono')) Object.assign(m.style, { width: '30px', height: '33px', fontSize: '.7rem' });
  const hub = h('div', { class: 'hub' }, img('assets/img/sami.webp', '', { width: 120, height: 120 }), h('span', { class: 'hub-label' }, 'Sami matches'));
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'wires');
  svg.setAttribute('aria-hidden', 'true');
  const grid = h('div', { class: 'beams-grid' }, svg, L, hub, R);

  // draw curved wires between real element positions; redraw on resize
  const draw = () => {
    if (!alive(grid)) return removeEventListener('resize', draw);
    const g = grid.getBoundingClientRect();
    const hb = hub.getBoundingClientRect();
    const hx = hb.left - g.left + hb.width / 2;
    const hy = hb.top - g.top + hb.height / 2;
    let html = '<defs>';
    const colors = [
      ['#f4a51c', '#3ccf9a'],
      ['#3ccf9a', '#8fd3ff'],
      ['#b9a6ff', '#f4a51c'],
      ['#f07a2a', '#b9a6ff'],
    ];
    colors.forEach(([a, b], i) => (html += `<linearGradient id="bg${i}" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`));
    html += '</defs>';
    const wire = (x1, y1, x2, y2, i, reverse) => {
      const mx = (x1 + x2) / 2;
      const d = `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      html += `<path class="base" d="${d}"/><path class="pulse" d="${d}" stroke="url(#bg${i % 4})" style="animation-delay:${i * 0.45}s;${reverse ? 'animation-direction:reverse' : ''}"/>`;
    };
    [...L.children].forEach((n, i) => {
      const r = n.getBoundingClientRect();
      wire(r.right - g.left, r.top - g.top + r.height / 2, hx - hb.width / 2 + 6, hy, i);
    });
    [...R.children].forEach((n, i) => {
      const r = n.getBoundingClientRect();
      wire(hx + hb.width / 2 - 6, hy, r.left - g.left, r.top - g.top + r.height / 2, i + 2);
    });
    svg.innerHTML = html;
  };
  requestAnimationFrame(() => requestAnimationFrame(draw));
  addEventListener('resize', draw);
  onReveal(grid, draw);

  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'shead' }, h('span', { class: 'kicker' }, 'How matching works'), h('h2', null, 'Your brief in. ', h('span', { class: 'serif' }, 'The right people out.')), h('p', null, 'Sami reads your industry, goal, platform and constraints, then routes you to the listings and providers that actually fit, with the reason for each.')),
      h('div', { class: 'beams' }, h('div', { class: 'dots' }), grid),
    ),
  );
}

// ---------- bento of practices ----------
function bento(meta) {
  const c = meta.counts.category;
  const subsFor = (code) =>
    meta.categories
      .find((x) => x.code === code)
      .subs.sort((a, b) => (meta.counts.sub[b.key] || 0) - (meta.counts.sub[a.key] || 0))
      .slice(0, 4)
      .map((s) => h('span', null, s.label));
  const cell = (code, size, title, blurb) =>
    h(
      'a',
      { class: `bento-cell spot ${size}`, href: `#/catalogue?cat=${code}`, style: { '--cat': `var(--c-${code})` } },
      h('span', { class: 'spot-border' }),
      h('span', { class: 'go', 'aria-hidden': 'true' }, '→'),
      h('div', null, h('span', { class: 'count' }, `${fmt(c[code] || 0)} listings`), h('h3', null, title), h('p', null, blurb), size === 'b-lg' ? h('div', { class: 'subs' }, subsFor(code)) : null),
      img(catImg(code), '', { width: 640, height: 640 }),
    );
  return h(
    'section',
    { class: 'section', style: { paddingTop: 0 } },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'shead' }, h('span', { class: 'kicker' }, 'Five practices'), h('h2', null, 'Everything your stack needs, ', h('span', { class: 'serif' }, 'in one hive.')), h('p', null, 'Start from the capability. Each practice is curated by Redington specialists and backed by the vendors behind it.')),
      h(
        'div',
        { class: 'bento' },
        cell('AI', 'b-lg', 'Artificial Intelligence', CAT_BLURB.AI),
        cell('CLD', 'b-md', 'Cloud', CAT_BLURB.CLD),
        cell('SEC', 'b-md', 'Security', CAT_BLURB.SEC),
        cell('DNA', 'b-md', 'Data & Analytics', CAT_BLURB.DNA),
        cell('SW', 'b-md', 'Software', CAT_BLURB.SW),
      ),
    ),
  );
}

// ---------- Sami teaser: a chat that plays itself ----------
const SCRIPT = [
  ['me', 'We keep running out of fresh produce but still throw away a lot.'],
  ['sami', 'Sounds like a forecasting and markdown problem. Which industry, and roughly how many stores?'],
  ['me', 'Grocery retail, about 40 stores in the UAE.'],
  ['sami', 'Got it. 85 listings fit retail; 3 are a strong fit. Want them ranked by speed to pilot?'],
];
function sami() {
  const thread = h('div', { class: 'thread', style: { gap: '12px', display: 'flex', flexDirection: 'column' } });
  const box = h('div', { class: 'mock-chat' }, h('div', { class: 'mc-head' }, img('assets/img/sami.webp', '', { width: 34, height: 34 }), h('div', null, h('b', null, 'Sami'), h('small', null, '● Online · Buzzar advisor'))), thread);
  let i = 0;
  const play = () => {
    if (!alive(box)) return;
    if (i >= SCRIPT.length) {
      setTimeout(() => {
        if (!alive(box)) return;
        thread.replaceChildren();
        i = 0;
        play();
      }, 4000);
      return;
    }
    const [who, text] = SCRIPT[i++];
    if (who === 'sami') {
      const t = h('div', { class: 'msg' }, img('assets/img/sami.webp', '', { class: 'av' }), h('div', { class: 'bubble typing' }, h('i'), h('i'), h('i')));
      thread.append(t);
      setTimeout(() => {
        if (!alive(box)) return;
        t.replaceWith(h('div', { class: 'msg' }, img('assets/img/sami.webp', '', { class: 'av' }), h('div', { class: 'bubble' }, text)));
        setTimeout(play, 1400);
      }, 1100);
    } else {
      thread.append(h('div', { class: 'msg me' }, h('div', { class: 'bubble' }, text)));
      setTimeout(play, 1000);
    }
  };
  onReveal(box, play);
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap sami-band' },
      h(
        'div',
        null,
        h('span', { class: 'kicker' }, 'The Sami sandbox'),
        h('h2', null, 'An advisor that ', h('span', { class: 'serif' }, 'asks before it answers.')),
        h('p', { class: 'lede' }, 'Describe your problem in plain words, or out loud. Sami asks the two or three questions that matter, shows how your options narrow, then gives a ranked shortlist, the honest gaps, and a mission plan you can take to your board.'),
        h('ul', { class: 'ticks', style: { gridTemplateColumns: '1fr', margin: '22px 0 28px' } }, h('li', null, 'A live brief that fills in as you talk'), h('li', null, 'Voice in, voice out'), h('li', null, 'Ask follow-up questions about any listing'), h('li', null, 'One-click mission plan from Explore to Adopt')),
        h('a', { class: 'btn shimmer', href: '#/advisor' }, h('span', { class: 'sh-spark' }), 'Open the sandbox', h('span', { class: 'arr' }, '→')),
      ),
      box,
    ),
  );
}

// ---------- industries gallery ----------
function gallery(meta) {
  const feat = Object.keys(IND_IMG);
  const rest = Object.entries(meta.counts.industry)
    .filter(([k]) => !feat.includes(k) && meta.industries[k])
    .sort((a, b) => b[1] - a[1]);
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'shead' }, h('span', { class: 'kicker' }, `${Object.keys(meta.industries).length} industries`), h('h2', null, 'Built for the way ', h('span', { class: 'serif' }, 'your sector works.'))),
      h(
        'div',
        { class: 'gallery' },
        feat.map((k) =>
          h('a', { class: 'gcard', href: `#/catalogue?ind=${k}` }, img(`assets/img/${IND_IMG[k]}.webp`, industryLabel(k), { width: 820, height: 618 }), h('div', { class: 'gc-body' }, h('div', null, h('h3', null, industryLabel(k)), h('small', null, `${fmt(meta.counts.industry[k] || 0)} solutions`)), h('span', { class: 'round', 'aria-hidden': 'true' }, '→'))),
        ),
      ),
      h('div', { class: 'ind-pills' }, rest.map(([k, n]) => h('a', { href: `#/catalogue?ind=${k}` }, industryLabel(k), h('span', null, fmt(n))))),
    ),
  );
}

// ---------- journey told on scroll ----------
function journey() {
  const steps = PATH.map(([n, s, p], i) => h('div', { class: 'jstep', 'data-n': String(i + 1) }, h('h3', null, n), h('span', { class: 'sub' }, s), h('p', null, p)));
  const fill = h('span', { class: 'fill' });
  const list = h('div', { class: 'jsteps' }, fill, steps);
  const onScroll = () => {
    if (!alive(list)) return removeEventListener('scroll', onScroll);
    const r = list.getBoundingClientRect();
    const mid = innerHeight * 0.55;
    const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    fill.style.setProperty('--p', `${p * 100}%`);
    for (const s of steps) s.classList.toggle('on', s.getBoundingClientRect().top < mid);
  };
  addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(onScroll);
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap journey2' },
      h('div', { class: 'sticky' }, h('span', { class: 'kicker' }, 'The Outcome Network'), h('h2', null, 'From first look to ', h('span', { class: 'serif' }, 'measured value.')), h('p', { class: 'lede' }, 'Six stages, one connected journey. Every listing shows how far it has published along the path, so you know whether to plan, pilot or ask more first.'), h('a', { class: 'btn', href: '#/how-it-works' }, 'How it works', h('span', { class: 'arr' }, '→'))),
      list,
    ),
  );
}

// ---------- latest ----------
function latest(items) {
  const pick = [...items]
    .sort((a, b) => (b.u || '').localeCompare(a.u || ''))
    .filter((x, i, a) => a.findIndex((y) => y.c === x.c) === i)
    .slice(0, 3);
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('span', { class: 'kicker' }, 'Fresh from the hive'), h('h2', null, 'Recently published.')), h('a', { class: 'btn', href: '#/catalogue?sort=new' }, 'Browse all', h('span', { class: 'arr' }, '→'))),
      h('div', { class: 'grid' }, pick.map((it) => card(it))),
    ),
  );
}

// ---------- number tickers ----------
function tickers(meta) {
  const t = (n, label, suffix = '') => {
    const b = h('b', null, '0');
    const d = h('div', null, b, h('span', null, label));
    onReveal(d, () => {
      countUp(b, n);
      if (suffix) setTimeout(() => (b.textContent += suffix), 1450);
    });
    return d;
  };
  return h('section', { class: 'section-tight' }, h('div', { class: 'wrap' }, h('div', { class: 'tickers' }, t(meta.total, 'governed listings'), t(meta.providers.length, 'vendors & partners'), t(meta.counts.type.accelerator || 0, 'accelerators'), t(Object.keys(meta.industries).length, 'industries served'))));
}

// ---------- partner CTA ----------
function partner() {
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'cta2' },
        h(
          'div',
          null,
          h('span', { class: 'kicker' }, 'For partners'),
          h('h2', null, 'Bring your solution ', h('span', { class: 'serif' }, 'to the hive.')),
          h('p', { class: 'lede' }, 'List with Redington and reach enterprise and public-sector buyers across the GCC, Africa and India, with marketplace private offers and delivery capacity behind you.'),
          h('div', { class: 'acts' }, h('a', { class: 'btn shimmer', href: '#/partners' }, h('span', { class: 'sh-spark' }), 'List your solution', h('span', { class: 'arr' }, '→')), h('a', { class: 'btn', href: '#/agents' }, 'For agents & developers')),
        ),
        img('assets/img/partners.webp', 'Two glass hexagons locking together', { width: 1100, height: 616 }),
      ),
    ),
  );
}
