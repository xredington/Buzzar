import { h, icon, fmt, monogram, img, indImg, coin } from '../ui.js?v=202611090805';
import { getMeta, all, industryLabel, industryIcon, subLabel } from '../data.js?v=202611090805';

export default function browse(route) {
  return route.name === 'industries' ? industries() : providers(route);
}

function head(eyebrow, title, lede) {
  return h('header', { class: 'phead' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), h('p', { class: 'lede' }, lede)));
}

const CATS = ['SW', 'DNA', 'CLD', 'SEC', 'AI'];
const IND_PH = {
  'financial-services': 'ph-bank', retail: 'ph-shopping-cart', healthcare: 'ph-heartbeat', 'life-sciences': 'ph-flask', manufacturing: 'ph-gear-six',
  media: 'ph-film-slate', 'technology-software': 'ph-cpu', education: 'ph-graduation-cap', telecommunications: 'ph-cell-signal-full',
  'gaming-and-esports': 'ph-game-controller', 'professional-services': 'ph-briefcase', 'public-sector': 'ph-bank', hospitality: 'ph-bed',
  logistics: 'ph-truck', aviation: 'ph-airplane-tilt', agriculture: 'ph-plant', automotive: 'ph-car', 'construction-real-estate': 'ph-buildings',
  'consumer-goods': 'ph-package', utilities: 'ph-lightning', 'oil-gas': 'ph-drop', 'cross-industry': 'ph-globe-hemisphere-east',
};

function industries() {
  const meta = getMeta();
  const items = all();
  const by = {};
  for (const it of items)
    for (const k of it.i) {
      const r = (by[k] ||= { n: 0, c: {}, p: {}, s: {} });
      r.n++;
      r.c[it.c] = (r.c[it.c] || 0) + 1;
      if (it.p !== 'Redington') r.p[it.p] = (r.p[it.p] || 0) + 1;
      for (const x of it.sc) r.s[x] = (r.s[x] || 0) + 1;
    }
  const keys = Object.keys(meta.industries)
    .filter((k) => k !== 'cross-industry' && by[k])
    .sort((a, b) => by[b].n - by[a].n);
  let q = '';
  const grid = h('div', { class: 'imosaic' });
  const paint = () => {
    const rows = keys.filter((k) => !q || industryLabel(k).toLowerCase().includes(q));
    grid.replaceChildren(...rows.map((k, i) => tile(k, i, !q && i < 2 ? 'xl' : !q && i < 6 ? 'lg' : '')));
    if (!rows.length) grid.append(h('p', { class: 'muted' }, 'No industry by that name.'));
  };
  const tile = (k, i, size) => {
    const r = by[k];
    const provs = Object.entries(r.p).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p);
    const subs = Object.entries(r.s).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([x]) => subLabel(x));
    return h(
      'a',
      { class: 'itile ' + size, href: `#/catalogue?ind=${k}`, style: { animationDelay: `${Math.min(i, 12) * 40}ms` } },
      h('span', { class: 'it-img' }, img(indImg(k), '', { width: 600, height: 450 })),
      h('span', { class: 'it-shade', 'aria-hidden': 'true' }),
      h('span', { class: 'it-mix', 'aria-hidden': 'true' }, CATS.map((c) => (r.c[c] ? h('i', { class: 'cm-' + c, style: { flexGrow: r.c[c] } }) : null))),
      h('span', { class: 'it-body' }, h('span', { class: 'it-ic' }, h('i', { class: `ph ${IND_PH[k] || 'ph-buildings'}`, 'aria-hidden': 'true' })), h('span', { class: 'it-t' }, h('b', null, industryLabel(k)), h('small', { class: 'num' }, `${fmt(r.n)} solutions`)), h('span', { class: 'it-arrow' }, h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' }))),
      h('span', { class: 'it-more' }, h('span', { class: 'it-subs' }, subs.map((x) => h('em', null, x))), provs.length ? h('span', { class: 'it-provs' }, provs.map((p) => coin(p, 26))) : null, h('span', { class: 'it-go' }, 'Explore', h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' }))),
    );
  };
  paint();
  const input = h('input', { type: 'search', placeholder: 'Find your industry', 'aria-label': 'Find your industry' });
  input.addEventListener('input', () => ((q = input.value.trim().toLowerCase()), paint()));
  const cross = by['cross-industry']?.n || 0;
  return h(
    'div',
    null,
    h(
      'header',
      { class: 'wrap ihead' },
      h('div', null, h('h1', null, 'Pick your ', h('span', { class: 'accent' }, 'world.')), h('p', { class: 'muted' }, `${keys.length} industries. Each tile shows what is built for it.`)),
      h('div', { class: 'ihead-r' }, h('label', { class: 'field' }, h('i', { class: 'ph ph-magnifying-glass', 'aria-hidden': 'true' }), input), h('div', { class: 'ilegend' }, CATS.map((c) => h('span', null, h('i', { class: 'cm-' + c }), { SW: 'Software', DNA: 'Data', CLD: 'Cloud', SEC: 'Security', AI: 'AI' }[c])))),
    ),
    h('section', { class: 'wrap', style: { paddingBottom: '80px' } }, grid, cross ? h('a', { class: 'icross', href: '#/catalogue?ind=cross-industry' }, h('span', { class: 'it-img' }, img(indImg('cross-industry'), '', { width: 200, height: 150 })), h('span', null, h('b', null, 'Works in any industry'), h('small', null, `${fmt(cross)} cross industry solutions`)), h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' })) : null),
  );
}

function providers(route) {
  const meta = getMeta();
  const letter = route.params.get('l') || '';
  const q = (route.params.get('q') || '').toLowerCase();
  const list = meta.providers.filter((p) => (!letter || p.name[0].toUpperCase() === letter) && (!q || p.name.toLowerCase().includes(q)));
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const has = new Set(meta.providers.map((p) => p.name[0].toUpperCase()));
  const input = h('input', { type: 'search', placeholder: 'Find a provider', value: route.params.get('q') || '', 'aria-label': 'Find a provider' });
  const grid = h('div', { class: 'prov-grid' });
  const paint = (filter) => {
    const rows = list.filter((p) => !filter || p.name.toLowerCase().includes(filter));
    grid.replaceChildren(
      ...rows.map((p) => h('a', { class: 'prov', href: `#/catalogue?prov=${encodeURIComponent(p.name)}` }, monogram(p.name), h('div', null, h('b', null, p.name), h('small', null, `${p.n} listing${p.n === 1 ? '' : 's'}${p.kind === 'distributor' ? ' · distributor' : ''}`)))),
    );
    if (!rows.length) grid.append(h('p', { class: 'muted' }, 'No provider by that name.'));
  };
  input.addEventListener('input', () => paint(input.value.trim().toLowerCase()));
  paint(q);
  const featured = meta.providers.filter((p) => p.name !== 'Redington').slice(0, 6);
  return h(
    'div',
    null,
    head('Providers', 'The people behind the possibilities.', `${fmt(meta.providers.length)} vendors and delivery partners, all listed and supported through Redington.`),
    h(
      'section',
      { class: 'wrap', style: { padding: '36px 0 20px' } },
      h('p', { class: 'eyebrow' }, 'Most listings'),
      h('div', { class: 'prov-grid' }, featured.map((p) => h('a', { class: 'prov', href: `#/catalogue?prov=${encodeURIComponent(p.name)}`, style: { borderColor: 'var(--line-2)' } }, monogram(p.name), h('div', null, h('b', null, p.name), h('small', null, `${p.n} listings`))))),
    ),
    h(
      'section',
      { class: 'wrap', style: { padding: '30px 0 90px' } },
      h('div', { class: 'searchbar' }, h('label', { class: 'field' }, h('span', { html: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>' }), input)),
      h(
        'div',
        { class: 'az', role: 'group', 'aria-label': 'Filter by first letter' },
        h('a', { class: 'tab', href: '#/providers', 'aria-pressed': String(!letter) }, 'All'),
        letters.map((l) => (has.has(l) ? h('a', { href: `#/providers?l=${l}`, style: { display: 'contents' } }, h('button', { type: 'button', tabindex: '-1', 'aria-pressed': String(l === letter) }, l)) : h('button', { type: 'button', disabled: true }, l))),
      ),
      grid,
    ),
  );
}
