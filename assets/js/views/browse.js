import { h, icon, fmt, monogram } from '../ui.js';
import { getMeta, all, industryLabel, industryIcon } from '../data.js';

export default function browse(route) {
  return route.name === 'industries' ? industries() : providers(route);
}

function head(eyebrow, title, lede) {
  return h('header', { class: 'phead' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), h('p', { class: 'lede' }, lede)));
}

const CATS = ['SW', 'DNA', 'CLD', 'SEC', 'AI'];

function industries() {
  const meta = getMeta();
  const items = all();
  const mix = {};
  for (const it of items) for (const k of it.i) (mix[k] ||= {})[it.c] = (mix[k][it.c] || 0) + 1;
  const keys = Object.keys(meta.industries).sort((a, b) => (a === 'cross-industry') - (b === 'cross-industry') || (meta.counts.industry[b] || 0) - (meta.counts.industry[a] || 0));
  return h(
    'div',
    null,
    head('Industries', 'Start from the way your industry works.', `${keys.length} industries, each with solutions shaped around its own regulators, data and day-to-day operations. The bar shows the mix of practices.`),
    h(
      'section',
      { class: 'wrap', style: { padding: '36px 0 90px' } },
      h(
        'div',
        { class: 'ind-grid' },
        keys.map((k) => {
          const n = meta.counts.industry[k] || 0;
          const m = mix[k] || {};
          return h(
            'a',
            { class: 'ind', href: `#/catalogue?ind=${k}` },
            h('span', { class: 'ci' }, icon(industryIcon(k))),
            h(
              'div',
              null,
              h('b', null, industryLabel(k)),
              h('small', null, `${fmt(n)} listings`),
              h(
                'div',
                { class: 'bars', 'aria-hidden': 'true' },
                CATS.map((c) => h('i', { style: { width: `${((m[c] || 0) / Math.max(1, n)) * 100}%`, background: `var(--c-${c})` } })),
              ),
            ),
          );
        }),
      ),
      h('p', { class: 'muted small', style: { marginTop: '22px' } }, 'Legend: ', CATS.map((c) => h('span', { class: 'chip cat', style: { '--cat': `var(--c-${c})`, marginRight: '6px' } }, { SW: 'Software', DNA: 'Data', CLD: 'Cloud', SEC: 'Security', AI: 'AI' }[c]))),
    ),
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
