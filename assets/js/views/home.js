// Home — one screen. The catalogue itself is the picture: 1,265 listings as dots in five clusters.
// Type, and the matching dots light up. Hover to name a dot. Click to open it.
import { h, fmt, img, catImg } from '../ui.js';
import { all, getMeta, match, catLabel, TYPE } from '../data.js';
import { quickView } from '../components.js';
import { createField } from '../field.js';
import { go } from '../main.js';

export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.', 'RACE'],
  ['Experience', 'See it working', 'Demonstrations and reference stories.', 'Experience Centres'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.', 'Blueprint Studios'],
  ['Build', 'Prove it', 'A bounded pilot against your own baseline.', 'Protoverse'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offer or Redington resale.', 'Tech Citadel / Marketplace'],
  ['Adopt', 'Measure the value', 'Track the agreed outcome and scale what works.', 'Adoption Factory'],
];

const ORDER = ['CLD', 'SW', 'AI', 'DNA', 'SEC'];
const STARTS = [
  ['ph-shield-check', 'Zero trust for a bank'],
  ['ph-storefront', 'Fewer stockouts'],
  ['ph-cloud-arrow-up', 'Move to Azure'],
  ['ph-sparkle', 'First AI use case'],
];

export default function home() {
  const meta = getMeta();
  const items = all();

  const stage = h('div', { class: 'stage' });
  const labels = h('div', { class: 'stage-labels' });
  const tip = h('div', { class: 'stage-tip', role: 'tooltip', hidden: true });
  stage.append(labels);

  // cluster labels, placed under each cluster
  const labelEls = {};
  for (const c of ORDER) {
    labelEls[c] = h('a', { class: 'clabel', href: `#/catalogue?cat=${c}` }, h('span', { class: 'cimg' }, img(catImg(c), '', { width: 40, height: 40 })), h('span', null, h('b', null, catLabel(c).replace('Artificial Intelligence', 'AI').replace('Data and Analytics', 'Data')), h('small', { class: 'num' }, fmt(meta.counts.category[c] || 0))));
    labels.append(labelEls[c]);
  }

  const field = createField(stage, items, {
    order: ORDER,
    onDot: (it) => quickView(it),
    onCluster: (c) => go(`catalogue?cat=${c}`),
    onHover: (hv, cluster) => {
      for (const c of ORDER) labelEls[c].classList.toggle('on', c === cluster);
      if (!hv) return (tip.hidden = true);
      tip.hidden = false;
      tip.replaceChildren(h('b', null, hv.it.t), h('small', null, `${TYPE[hv.it.y].label} · ${hv.it.k === 'distributor' ? 'Redington' : hv.it.p}`));
      tip.style.transform = `translate(${Math.round(hv.x)}px, ${Math.round(hv.y)}px)`;
    },
  });
  field.onLayout = (centres) => {
    for (const c of ORDER) {
      const ce = centres[c];
      if (!ce) continue;
      labelEls[c].style.transform = `translate(${Math.round(ce.x)}px, ${Math.round(ce.y + ce.R + 12)}px) translateX(-50%)`;
    }
  };

  // ---------- results rail (appears only while asking) ----------
  const countEl = h('b', { class: 'num' }, fmt(items.length));
  const countLbl = h('span', null, 'solutions');
  const rail = h('div', { class: 'rail', hidden: true, 'aria-live': 'polite' });

  function showResults(r) {
    if (!r) {
      field.highlight(null);
      rail.hidden = true;
      countEl.textContent = fmt(items.length);
      countLbl.textContent = 'solutions';
      return;
    }
    const map = new Map();
    const top = r.picks[0]?.s || 1;
    for (const p of r.picks) map.set(p.it.id, p.s >= top * 0.6 ? 2 : 1);
    field.highlight(map);
    countEl.textContent = fmt(r.total);
    countLbl.textContent = r.total === 1 ? 'match' : 'matches';
    const best = r.picks.slice(0, 4);
    rail.hidden = !best.length;
    rail.replaceChildren(
      ...best.map((p, i) =>
        h(
          'button',
          { type: 'button', class: `rcard2 k-${p.it.y}`, style: { animationDelay: `${i * 60}ms` }, onclick: () => quickView(p.it) },
          h('span', { class: 'thumb' }, img(catImg(p.it.c), '', { width: 40, height: 40 })),
          h('span', { class: 'txt' }, h('b', null, p.it.t), h('small', { class: 'kind' }, TYPE[p.it.y].label)),
        ),
      ),
    );
  }

  // ---------- the ask bar ----------
  const input = h('input', { type: 'text', placeholder: 'What do you want to change?', 'aria-label': 'What do you want to change?', autocomplete: 'off', maxlength: 300 });
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) return showResults(null);
    timer = setTimeout(() => showResults(match(q, { limit: 400 })), 160);
  });
  const bar = h(
    'form',
    { class: 'askbar', role: 'search' },
    h('i', { class: 'ph ph-magnifying-glass', 'aria-hidden': 'true' }),
    input,
    h('button', { class: 'btn dark', type: 'submit' }, 'Ask Sami', h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' })),
  );
  bar.addEventListener('submit', (e) => {
    e.preventDefault();
    go('advisor' + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : ''));
  });
  const starts = h(
    'div',
    { class: 'starts' },
    STARTS.map(([ic, s]) =>
      h('button', {
        type: 'button',
        onclick: () => {
          input.value = s;
          input.dispatchEvent(new Event('input'));
          input.focus();
        },
      }, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' }), s),
    ),
  );

  // ---------- legend ----------
  const c = meta.counts.type;
  const legend = h(
    'div',
    { class: 'legend', 'aria-label': 'Legend' },
    [
      ['accelerator', 'Accelerators'],
      ['product', 'Products'],
      ['service', 'Services'],
    ].map(([k, l]) => h('a', { class: `k-${k}`, href: `#/catalogue?type=${k}` }, h('i', { 'aria-hidden': 'true' }), l, h('span', { class: 'num' }, fmt(c[k] || 0)))),
  );

  return h(
    'section',
    { class: 'home2', 'aria-label': 'Buzzar catalogue' },
    stage,
    h('div', { class: 'h-top' }, h('h1', { class: 'grad-text' }, 'Find what fits.'), h('p', null, 'Every dot is a governed solution. Ask, and watch them light up.')),
    h('div', { class: 'h-count' }, countEl, countLbl),
    rail,
    tip,
    h('div', { class: 'h-bottom' }, bar, starts),
    legend,
  );
}
