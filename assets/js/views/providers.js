// Providers — a partner orbit. Redington at the centre; vendors circle it in slow rings, sized by how many
// listings they bring. Hover pauses and names a logo; click opens the provider panel. Below, a logo wall.
import { h, fmt, img, catImg, itemImg, coin } from '../ui.js';
import { providerStats, catLabel, TYPE } from '../data.js';
import { go } from '../main.js';

const KINDS = ['product', 'service', 'accelerator'];

export default function providers(route) {
  const stats = providerStats();
  const red = stats.find((p) => p.name === 'Redington');
  const others = stats.filter((p) => p !== red);
  const vendorListings = others.reduce((a, p) => a + p.n, 0);

  return h('div', { class: 'prov-page' }, hero(stats, red, others, vendorListings), wall(others, route));
}

// ---------- the orbit ----------
function hero(stats, red, others, vendorListings) {
  const ring1 = others.slice(0, 8);
  const ring2 = others.slice(8, 24);
  const ring3 = others.slice(24, 60);
  const rest = others.length - 60;
  const maxN = ring1[0]?.n || 1;

  const orbit = h('div', { class: 'orbit', role: 'group', 'aria-label': 'Providers orbiting Redington' });
  const ring = (list, radius, dur, reverse, sizeOf, cls) => {
    const r = h('div', { class: 'oring ' + cls + (reverse ? ' rev' : ''), style: { '--r': radius, '--dur': dur + 's' } });
    list.forEach((p, k) => {
      const a = (k * 360) / list.length + (reverse ? 12 : 0);
      const size = sizeOf(p);
      const item = h(
        'button',
        { type: 'button', class: 'oitem', style: { '--a': a + 'deg' }, 'aria-label': `${p.name}, ${p.n} listings`, onclick: () => providerPanel(p) },
        h('span', { class: 'upright' }, coin(p.name, size, { stack: false }), h('span', { class: 'olabel' }, h('b', null, p.name), h('small', { class: 'num' }, `${p.n} listings`))),
      );
      r.append(item);
    });
    return r;
  };
  // the long tail as a ring of fine dots
  const dust = h('div', { class: 'oring dust', style: { '--r': 0.5, '--dur': '240s' }, 'aria-hidden': 'true' });
  for (let k = 0; k < Math.min(rest, 160); k++) dust.append(h('i', { style: { '--a': (k * 360) / Math.min(rest, 160) + 'deg' } }));

  orbit.append(
    h('div', { class: 'otrack', style: { '--r': 0.2 } }),
    h('div', { class: 'otrack', style: { '--r': 0.33 } }),
    h('div', { class: 'otrack', style: { '--r': 0.445 } }),
    dust,
    ring(ring3, 0.445, 160, false, () => 30, 'r3'),
    ring(ring2, 0.33, 120, true, () => 40, 'r2'),
    ring(ring1, 0.2, 90, false, (p) => Math.round(46 + 22 * Math.sqrt(p.n / maxN)), 'r1'),
    h('button', { type: 'button', class: 'ohub', onclick: () => red && providerPanel(red), 'aria-label': `Redington, ${red?.n || 0} listings` }, coin('Redington', 88), h('b', null, 'Redington'), h('small', { class: 'num' }, `${fmt(red?.n || 0)} listings`)),
  );

  return h(
    'section',
    { class: 'prov-hero' },
    h(
      'div',
      { class: 'wrap prov-hero-grid' },
      h(
        'div',
        { class: 'prov-copy' },
        h('p', { class: 'eyebrow' }, 'Providers'),
        h('h1', { class: 'grad-text' }, 'Who stands', h('br'), 'behind it.'),
        h('p', { class: 'muted' }, 'Redington at the centre. Every vendor and partner in orbit.'),
        h(
          'div',
          { class: 'prov-nums' },
          h('div', null, h('b', { class: 'num' }, fmt(stats.length)), h('span', null, 'providers')),
          h('div', null, h('b', { class: 'num' }, fmt(vendorListings)), h('span', null, 'vendor listings')),
          h('div', null, h('b', { class: 'num' }, fmt(red?.n || 0)), h('span', null, 'by Redington')),
        ),
        h(
          'ul',
          { class: 'okey' },
          h('li', null, h('i', { class: 'k0' }), 'Centre: Redington, the distributor behind every listing'),
          h('li', null, h('i', { class: 'k1' }), 'Inner ring: vendors with the most listings, larger means more'),
          h('li', null, h('i', { class: 'k2' }), 'Outer rings and dots: the rest of the 371'),
          h('li', null, h('i', { class: 'ph ph-cursor-click' }), 'Select any logo to see what they offer'),
        ),
      ),
      orbit,
    ),
  );
}

// ---------- the logo wall ----------
function wall(others, route) {
  let q = (route.params.get('q') || '').toLowerCase();
  let sort = 'n';
  let kind = '';
  let all = false;
  const grid = h('div', { class: 'pwall' });
  const more = h('button', { type: 'button', class: 'btn', style: { margin: '24px auto 0', display: 'flex' } });
  const input = h('input', { type: 'search', placeholder: 'Find a provider', 'aria-label': 'Find a provider', value: q });
  input.addEventListener('input', () => {
    q = input.value.trim().toLowerCase();
    paint();
  });
  const seg = (opts, get, set) => {
    const box = h('div', { class: 'seg', role: 'group' });
    const draw = () =>
      box.replaceChildren(
        ...opts.map(([v, l]) => {
          const b = h('button', { type: 'button', 'aria-pressed': String(get() === v) }, l);
          b.addEventListener('click', () => {
            set(v);
            draw();
            paint();
          });
          return b;
        }),
      );
    draw();
    return box;
  };
  function paint() {
    let rows = others.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!kind || p.y[kind] > 0));
    rows = sort === 'az' ? [...rows].sort((a, b) => a.name.localeCompare(b.name)) : rows;
    const shown = all || q ? rows : rows.slice(0, 32);
    grid.replaceChildren(...shown.map(card));
    if (!rows.length) grid.append(h('div', { class: 'empty', style: { gridColumn: '1 / -1', textAlign: 'center' } }, h('p', { style: { margin: 0 } }, 'No provider by that name.')));
    more.hidden = all || q || rows.length <= 32;
    more.textContent = `Show all ${fmt(rows.length)} providers`;
  }
  more.addEventListener('click', () => {
    all = true;
    paint();
  });
  paint();
  return h(
    'section',
    { class: 'wrap prov-wall' },
    h(
      'div',
      { class: 'pwall-bar' },
      h('h2', { class: 'heading-5' }, 'All providers'),
      h('label', { class: 'field', style: { maxWidth: '320px' } }, h('i', { class: 'ph ph-magnifying-glass', 'aria-hidden': 'true' }), input),
      seg(
        [
          ['', 'All'],
          ['product', 'Products'],
          ['service', 'Services'],
          ['accelerator', 'Accelerators'],
        ],
        () => kind,
        (v) => (kind = v),
      ),
      seg(
        [
          ['n', 'Most listings'],
          ['az', 'A to Z'],
        ],
        () => sort,
        (v) => (sort = v),
      ),
    ),
    grid,
    more,
  );
}

function kindBar(p) {
  return h(
    'span',
    { class: 'kbar', 'aria-label': KINDS.map((k) => `${p.y[k]} ${TYPE[k].plural.toLowerCase()}`).join(', ') },
    KINDS.map((k) => (p.y[k] ? h('i', { class: `k-${k}`, style: { flexGrow: p.y[k] } }) : null)),
  );
}

function card(p) {
  const top = Object.entries(p.c).sort((a, b) => b[1] - a[1])[0];
  return h(
    'button',
    { type: 'button', class: 'pcard2', onclick: () => providerPanel(p) },
    coin(p.name, 48),
    h('span', { class: 'pc-txt' }, h('b', null, p.name), h('small', null, `${p.n} listing${p.n === 1 ? '' : 's'}${top ? ' · ' + catLabel(top[0]) : ''}`), kindBar(p)),
    h('i', { class: 'ph ph-arrow-up-right go', 'aria-hidden': 'true' }),
  );
}

// ---------- the provider panel (slide over) ----------
let panel = null;
function close() {
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(() => panel && !panel.classList.contains('open') && (panel.hidden = true), 500);
}
export function providerPanel(p) {
  if (!panel) {
    panel = h('div', { class: 'qv', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Provider' }, h('div', { class: 'qv-scrim', onclick: close }), h('div', { class: 'qv-panel' }));
    document.body.append(panel);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
    addEventListener('hashchange', close);
  }
  const box = panel.querySelector('.qv-panel');
  const x = h('button', { class: 'tool qv-x', type: 'button', 'aria-label': 'Close', onclick: close }, h('i', { class: 'ph ph-x', 'aria-hidden': 'true' }));
  const cats = Object.entries(p.c).sort((a, b) => b[1] - a[1]);
  const maxC = cats[0]?.[1] || 1;
  const top = [...p.items].sort((a, b) => (b.ns || 0) - (a.ns || 0) || a.t.localeCompare(b.t)).slice(0, 6);
  box.replaceChildren(
    h('div', { class: 'qv-head' }, coin(p.name, 72), h('div', null, h('p', { class: 'caption-4', style: { margin: 0 } }, p.kind === 'distributor' ? 'Distributor' : 'Vendor or partner'), h('h2', null, p.name), h('p', { class: 'caption-2', style: { margin: 0 } }, `${p.n} listing${p.n === 1 ? '' : 's'} on Buzzar`)), x),
    h(
      'div',
      { class: 'qv-body' },
      h('div', { class: 'pmix' }, KINDS.map((k) => h('div', { class: `k-${k}` }, h('b', { class: 'num' }, fmt(p.y[k])), h('span', { class: 'kind' }, TYPE[k].plural)))),
      h('section', null, h('h4', null, 'Where they play'), h('div', { class: 'pcats' }, cats.map(([c, n]) => h('div', null, h('span', null, catLabel(c)), h('i', { style: { '--w': (n / maxC) * 100 + '%' } }), h('b', { class: 'num' }, n))))),
      h(
        'section',
        null,
        h('h4', null, 'Top listings'),
        h(
          'div',
          { class: 'ptop' },
          top.map((it) => h('a', { href: `#/listing/${it.slug}` }, h('span', { class: 'thumb' }, img(itemImg(it), '', { width: 40, height: 40 })), h('span', null, h('b', null, it.t), h('small', { class: `kind k-${it.y}` }, TYPE[it.y].label)), h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' }))),
        ),
      ),
    ),
    h('div', { class: 'qv-foot' }, h('a', { class: 'btn dark', href: `#/catalogue?prov=${encodeURIComponent(p.name)}` }, `Browse all ${p.n}`, h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' })), h('button', { class: 'btn', type: 'button', onclick: () => go('advisor?q=' + encodeURIComponent(`What does ${p.name} offer?`)) }, h('i', { class: 'ph ph-chats-circle', 'aria-hidden': 'true' }), 'Ask Sami')),
  );
  panel.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));
  setTimeout(() => x.focus(), 60);
}
