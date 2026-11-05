import { h, icon, iconMarkup, hexPath, BEE, countUp, onReveal, fmt } from '../ui.js';
import { all, getMeta, catLabel, industryLabel, industryIcon, CAT_BLURB, TYPE } from '../data.js';
import { card } from '../components.js';
import { go } from '../main.js';

const PROMPTS = [
  'Stop stockouts across 40 stores',
  'Zero trust for a bank in Riyadh',
  'Move our ERP to Azure',
  'A GenAI assistant for our call centre',
  'Predictive maintenance for a plant',
  'Prove PDPL compliance',
];

export default function home() {
  const meta = getMeta();
  const items = all();
  return h(
    'div',
    null,
    hero(meta),
    marquee(meta),
    practices(meta),
    discoverTeaser(),
    fresh(items),
    pathSection(),
    accelerators(items),
    industries(meta),
    cta(),
  );
}

// ---------- hero ----------
function hero(meta) {
  const input = h('input', { type: 'text', 'aria-label': 'Describe what you want to achieve', placeholder: PROMPTS[0], autocomplete: 'off', maxlength: 400 });
  const form = h(
    'form',
    { class: 'ask-box', role: 'search' },
    h('span', { class: 'spark', 'aria-hidden': 'true' }, '✦'),
    input,
    h('button', { class: 'btn primary', type: 'submit' }, 'Ask Buzzar', h('span', { class: 'arr' }, '→')),
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim() || input.placeholder;
    go('ask?q=' + encodeURIComponent(q));
  });
  // rotate the placeholder like a thought passing by
  let pi = 0;
  const rot = setInterval(() => {
    if (!document.body.contains(input)) return clearInterval(rot);
    if (document.activeElement === input || input.value) return;
    pi = (pi + 1) % PROMPTS.length;
    input.placeholder = PROMPTS[pi];
  }, 3200);

  const providers = meta.providers.length;
  const stats = [
    [meta.total, 'governed listings'],
    [providers, 'providers'],
    [Object.keys(meta.industries).length, 'industries'],
    [meta.categories.length, 'practices'],
  ].map(([n, l]) => {
    const b = h('b', null, '0');
    const s = h('div', { class: 'stat' }, b, h('span', null, l));
    onReveal(s, () => countUp(b, n));
    return s;
  });

  const words = (txt, delay0) =>
    txt.split(' ').map((w, i) => [h('span', { class: 'word', style: { animationDelay: `${delay0 + i * 70}ms` } }, w), ' ']);

  return h(
    'section',
    { class: 'hero' },
    h(
      'div',
      { class: 'wrap hero-grid' },
      h(
        'div',
        null,
        h('p', { class: 'eyebrow' }, 'The business solution marketplace'),
        h('h1', null, h('span', { class: 'line' }, words('Where expertise', 0)), h('span', { class: 'line' }, words('meets', 140), h('em', { class: 'hl word', style: { animationDelay: '220ms' } }, 'opportunity.'))),
        h('p', { class: 'lede' }, `Products, services and accelerators across cloud, data, AI, security and software. Every listing is governed by Redington, so you can tell what fits before you talk to anyone.`),
        form,
        h('div', { class: 'prompts', 'aria-label': 'Try asking' }, PROMPTS.slice(1, 5).map((p) => h('button', { type: 'button', onclick: () => go('ask?q=' + encodeURIComponent(p)) }, p))),
        h('div', { class: 'stats' }, stats),
      ),
      hive(meta),
    ),
  );
}

function hive(meta) {
  const R = 74;
  const cx = 300;
  const cy = 292;
  const dy = Math.sqrt(3) * R;
  const pos = (q, r) => [cx + q * 1.5 * R, cy + (r + q / 2) * dy];
  const counts = meta.counts.category;
  // axial neighbours of the centre, clockwise from the top
  const ring1 = [
    [0, -1],
    [1, -1],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
  ];
  const cats = ['AI', 'CLD', 'SEC', 'DNA', 'SW'];
  const ring2 = [
    [0, -2],
    [1, -2],
    [2, -2],
    [2, -1],
    [2, 0],
    [1, 1],
    [0, 2],
    [-1, 2],
    [-2, 2],
    [-2, 1],
    [-2, 0],
    [-1, -1],
  ];
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'comb');
  svg.setAttribute('viewBox', '0 0 600 584');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', 'Browse by practice');

  const indKeys = ['retail', 'financial-services', 'healthcare', 'public-sector', 'telecommunications', 'logistics'];
  let html = '';
  ring2.forEach(([q, r], i) => {
    const [x, y] = pos(q, r);
    const ind = i % 2 === 1 ? indKeys[(i - 1) / 2] : null;
    if (ind) {
      html += `<g class="cell ind" tabindex="0" role="link" data-go="catalogue?ind=${ind}" data-tip="${industryLabel(ind)} · ${meta.counts.industry[ind] || 0} listings" style="animation-delay:${400 + i * 40}ms;--cat:var(--honey)">
        <path class="hexp" d="${hexPath(x, y, R - 6)}"/>
        <g transform="translate(${x - 14} ${y - 14}) scale(1.17)" class="ico" style="stroke:var(--honey-ink)">${iconMarkup(industryIcon(ind))}</g></g>`;
    } else {
      html += `<g class="cell ghost" aria-hidden="true" style="animation-delay:${400 + i * 40}ms"><path class="hexp" d="${hexPath(x, y, R - 6)}"/></g>`;
    }
  });
  ring1.forEach(([q, r], i) => {
    const [x, y] = pos(q, r);
    if (i === 5) {
      html += `<g class="cell honeyc" tabindex="0" role="link" data-go="discover" data-tip="Answer three questions, get matches" style="animation-delay:${150 + i * 60}ms;--cat:var(--honey)">
        <path class="hexp" d="${hexPath(x, y, R - 4)}"/>
        <text class="t1" x="${x}" y="${y - 2}" style="fill:#1b1405">Discover</text><text class="t2" x="${x}" y="${y + 16}" style="fill:#4a3608">3 questions</text></g>`;
      return;
    }
    const c = cats[i];
    html += `<g class="cell big" tabindex="0" role="link" data-go="catalogue?cat=${c}" data-tip="${CAT_BLURB[c]}" style="animation-delay:${150 + i * 60}ms;--cat:var(--c-${c})">
      <path class="hexp" d="${hexPath(x, y, R - 4)}"/>
      <g transform="translate(${x - 12} ${y - 34})" class="ico">${iconMarkup(c)}</g>
      <text class="t1" x="${x}" y="${y + 12}">${c === 'DNA' ? 'Data' : catLabel(c).replace('Artificial Intelligence', 'AI')}</text>
      <text class="t2" x="${x}" y="${y + 30}">${fmt(counts[c] || 0)} listings</text></g>`;
  });
  const [x0, y0] = [cx, cy];
  html += `<g class="cell" tabindex="0" role="link" data-go="catalogue" data-tip="Browse all ${fmt(meta.total)} listings" style="--cat:var(--green)">
      <path class="hexp" d="${hexPath(x0, y0, R - 4)}" style="fill:var(--green);stroke:var(--green)"/>
      <text class="t1" x="${x0}" y="${y0 - 4}" style="fill:var(--on-green);font-size:26px">${fmt(meta.total)}</text>
      <text class="t2" x="${x0}" y="${y0 + 18}" style="fill:var(--on-green);opacity:.8">solutions</text></g>`;
  // a pollen trail the bee follows, weaving through the comb
  html += `<path id="flight" class="flight" d="M70 300 C 90 120, 250 40, 330 120 S 560 140, 530 300 S 420 540, 300 480 S 60 470, 110 360 S 210 230, 300 200 S 470 250, 430 380 S 200 420, 70 300"/>`;
  svg.innerHTML = html;

  const bee = h('div', { class: 'bee', html: BEE });
  bee.style.animation = 'none';
  const tip = h('div', { class: 'hive-tip', role: 'tooltip' });
  const wrap = h('div', { class: 'hive' }, svg, bee, tip);

  svg.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) go(g.dataset.go);
  });
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest('[data-go]');
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      go(g.dataset.go);
    }
  });
  const showTip = (e) => {
    const g = e.target.closest('[data-tip]');
    if (!g) return tip.classList.remove('on');
    const box = g.getBoundingClientRect();
    const host = wrap.getBoundingClientRect();
    tip.textContent = g.dataset.tip;
    tip.style.left = `${box.left - host.left + box.width / 2}px`;
    tip.style.top = `${box.top - host.top + 8}px`;
    tip.classList.add('on');
  };
  svg.addEventListener('pointerover', showTip);
  svg.addEventListener('focusin', showTip);
  svg.addEventListener('pointerleave', () => tip.classList.remove('on'));
  svg.addEventListener('focusout', () => tip.classList.remove('on'));

  // fly the bee along the trail, in the comb's own coordinates so it scales with the layout
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const path = svg.querySelector('#flight');
    const L = path.getTotalLength();
    const t0 = performance.now();
    const frame = (t) => {
      if (!document.body.contains(wrap)) return;
      const k = (((t - t0) / 22000) % 1) * L;
      const p = path.getPointAtLength(k);
      const q = path.getPointAtLength((k + 2) % L);
      const scale = wrap.clientWidth / 600;
      const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
      const flip = Math.abs(ang) > 90 ? -1 : 1;
      bee.style.transform = `translate(${p.x * scale - 23}px, ${p.y * scale - 23}px) rotate(${flip < 0 ? ang + 180 : ang}deg) scaleX(${flip})`;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  return wrap;
}

// ---------- provider marquee ----------
function marquee(meta) {
  const top = meta.providers.filter((p) => p.name !== 'Redington').slice(0, 28);
  const links = top.map((p) => h('a', { href: `#/catalogue?prov=${encodeURIComponent(p.name)}` }, p.name));
  return h(
    'div',
    { class: 'marquee', 'aria-label': 'Providers on Buzzar' },
    h('div', { class: 'marquee-track' }, links, top.map((p) => h('a', { href: `#/catalogue?prov=${encodeURIComponent(p.name)}`, 'aria-hidden': 'true', tabindex: '-1' }, p.name))),
  );
}

// ---------- practices ----------
function practices(meta) {
  const subsCount = meta.counts.sub;
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Five practices, one hive'), h('h2', null, 'Start from the capability you need.')), h('a', { class: 'btn', href: '#/catalogue' }, 'Browse everything', h('span', { class: 'arr' }, '→'))),
      h(
        'div',
        { class: 'cats' },
        meta.categories.map((c) =>
          h(
            'a',
            { class: 'cat-tile', href: `#/catalogue?cat=${c.code}`, style: { '--cat': `var(--c-${c.code})` } },
            h('span', { class: 'hexbig' }, icon(c.code)),
            h('h3', null, c.label),
            h('span', { class: 'n' }, `${fmt(meta.counts.category[c.code] || 0)} listings`),
            h(
              'ul',
              null,
              [...c.subs]
                .sort((a, b) => (subsCount[b.key] || 0) - (subsCount[a.key] || 0))
                .slice(0, 3)
                .map((s) => h('li', null, s.label)),
            ),
          ),
        ),
      ),
    ),
  );
}

// ---------- guided discovery teaser ----------
function discoverTeaser() {
  const pickers = ['retail', 'financial-services', 'healthcare', 'public-sector', 'manufacturing', 'telecommunications'];
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap hero-grid', style: { alignItems: 'start' } },
      h(
        'div',
        null,
        h('p', { class: 'eyebrow' }, 'Guided discovery'),
        h('h2', null, 'Not sure what to search for? ', h('em', { class: 'hl' }, 'Start with your world.')),
        h('p', { class: 'lede' }, 'Three questions: your industry, your perspective and what you want to change. You pick every answer, nothing is saved, and your matches explain why they fit.'),
        h('a', { class: 'btn primary', href: '#/discover' }, 'Start guided discovery', h('span', { class: 'arr' }, '→')),
      ),
      h(
        'div',
        null,
        h('p', { class: 'muted small', style: { marginBottom: '10px' } }, 'What world do you work in?'),
        h(
          'div',
          { class: 'choices', style: { marginTop: 0 } },
          pickers.map((k, i) => h('a', { class: 'choice', href: `#/discover?industry=${k}`, style: { animationDelay: `${i * 60}ms` } }, h('span', { class: 'ci' }, icon(industryIcon(k))), h('b', null, industryLabel(k)), h('small', null, 'Pick to begin →'))),
        ),
      ),
    ),
  );
}

// ---------- fresh listings ----------
function fresh(items) {
  const pick = [...items]
    .filter((x) => x.y !== 'accelerator')
    .sort((a, b) => (b.u || '').localeCompare(a.u || ''))
    .filter((x, i, a) => a.findIndex((y) => y.c === x.c && y.y === x.y) === i)
    .slice(0, 6);
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Fresh from the hive'), h('h2', null, 'Recently published.')), h('a', { class: 'btn', href: '#/catalogue?sort=new' }, 'See what’s new', h('span', { class: 'arr' }, '→'))),
      h('div', { class: 'grid' }, pick.map((it) => card(it))),
    ),
  );
}

// ---------- the six-step path ----------
export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.'],
  ['Experience', 'See it working', 'Demos and reference stories in Redington experience centres.'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.'],
  ['Build', 'Prove it', 'A bounded pilot against your baseline, not a promise.'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offers or Redington resale.'],
  ['Adopt', 'Measure the value', 'Track the outcome you agreed, and scale what works.'],
];
function pathSection() {
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'One connected journey'), h('h2', null, 'From first look to measured value.')), h('a', { class: 'btn', href: '#/how-it-works' }, 'How it works', h('span', { class: 'arr' }, '→'))),
      h(
        'div',
        { class: 'path6' },
        PATH.map(([n, s, p], i) => h('div', { class: 'p6' + (i < 1 ? ' on' : '') }, h('div', { class: 'hx' }, String(i + 1)), h('h4', null, n), h('p', null, h('b', null, s)), h('p', null, p))),
      ),
    ),
  );
}

// ---------- accelerators ----------
function accelerators(items) {
  const acc = items.filter((x) => x.y === 'accelerator');
  const pick = acc.filter((x, i, a) => a.findIndex((y) => y.c === x.c) === i).slice(0, 3);
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'section-head' },
        h('div', null, h('p', { class: 'eyebrow' }, 'Accelerators'), h('h2', null, 'Proven patterns. ', h('em', { class: 'hl' }, 'Weeks, not quarters.')), h('p', { class: 'lede', style: { marginTop: '10px' } }, TYPE.accelerator.blurb)),
        h('a', { class: 'btn', href: '#/catalogue?type=accelerator' }, `All ${acc.length} accelerators`, h('span', { class: 'arr' }, '→')),
      ),
      h('div', { class: 'grid' }, pick.map((it) => card(it))),
    ),
  );
}

// ---------- industries ----------
function industries(meta) {
  const top = Object.entries(meta.counts.industry)
    .filter(([k]) => k !== 'cross-industry' && meta.industries[k])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  return h(
    'section',
    { class: 'section-tight' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Industries'), h('h2', null, 'Built for the way your sector works.')), h('a', { class: 'btn', href: '#/industries' }, 'All industries', h('span', { class: 'arr' }, '→'))),
      h(
        'div',
        { class: 'ind-grid' },
        top.map(([k, n]) => h('a', { class: 'ind', href: `#/catalogue?ind=${k}` }, h('span', { class: 'ci' }, icon(industryIcon(k))), h('div', null, h('b', null, industryLabel(k)), h('small', null, `${fmt(n)} listings`)))),
      ),
    ),
  );
}

function cta() {
  const comb = `<svg class="cta-comb" viewBox="0 0 300 300" aria-hidden="true">${[0, 1, 2, 3]
    .flatMap((c) => [0, 1, 2, 3].map((r) => `<path d="${hexPath(40 + c * 66, 40 + r * 76 + (c % 2) * 38, 40)}"/>`))
    .join('')}</svg>`;
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'div',
        { class: 'cta' },
        h('div', { html: comb }),
        h('div', null, h('p', { class: 'eyebrow', style: { color: 'var(--honey-2)' } }, 'For partners'), h('h2', null, 'Bring your solution to the hive.'), h('p', null, 'List with Redington and reach buyers across the GCC, Africa and India, with the governance that makes enterprise buyers say yes.')),
        h('div', { class: 'acts' }, h('a', { class: 'btn honey', href: '#/partners' }, 'List your solution', h('span', { class: 'arr' }, '→')), h('a', { class: 'btn ghost', href: '#/agents' }, 'For agents & developers')),
      ),
    ),
  );
}
