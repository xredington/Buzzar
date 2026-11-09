import { h, lists, fmt, toast } from '../ui.js?v=202611090654';
import { all, get, detail, TYPE, catLabel, industryLabel, label, readiness } from '../data.js?v=202611090654';
import { card, catChip, requestDialog, MAX_COMPARE, REQUEST_TYPES } from '../components.js?v=202611090654';

export default function view(route) {
  if (route.name === 'compare') return compare();
  if (route.name === 'saved') return saved();
  return journey();
}

function head(eyebrow, title, lede) {
  return h('header', { class: 'phead' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), h('p', { class: 'lede' }, lede)));
}

// an empty list is an invitation: what to do, how it will look, and a few good places to start
function empty(title, text, href, cta, ic = 'ph-sparkle') {
  const cats = ['CLD', 'SEC', 'AI', 'DNA'];
  const starters = cats.map((c) => all().find((it) => it.c === c && it.y === 'product' && it.aws && it._img) || all().find((it) => it.c === c)).filter(Boolean);
  return h(
    'div',
    { class: 'empty2' },
    h(
      'div',
      { class: 'e2-card' },
      h('div', { class: 'e2-ghosts', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('span', { style: { animationDelay: `${i * 160}ms` } }, h('i'), h('b'), h('em')))),
      h('div', { class: 'e2-txt' }, h('span', { class: 'e2-ic' }, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' })), h('h3', null, title), h('p', null, text), h('div', { class: 'chips', style: { gap: '10px', justifyContent: 'center' } }, h('a', { class: 'btn primary', href }, cta), h('a', { class: 'btn', href: '#/advisor' }, 'Ask Sami'))),
    ),
    starters.length ? h('div', { class: 'e2-start' }, h('p', { class: 'eyebrow' }, 'Good places to start'), h('div', { class: 'grid' }, starters.map((it) => card(it, { quick: true })))) : null,
  );
}

// ---------- compare ----------
async function compare() {
  const ids = lists.get('compare').filter(get);
  const node = h('div', null, head('Compare', 'See the differences. Find your fit.', `Put up to ${MAX_COMPARE} solutions side by side. Rows where they differ are highlighted.`));
  const wrap = h('div', { class: 'wrap' });
  node.append(wrap);
  if (!ids.length) {
    wrap.append(empty('Nothing to compare yet.', 'Use the compare button on any listing to add it here.', '#/catalogue', 'Browse the catalogue', 'ph-scales'));
    return node;
  }
  const items = ids.map(get);
  const details = await Promise.all(items.map((it) => detail(it.id)));
  const rows = [
    ['Type', (it) => TYPE[it.y].label],
    ['Practice', (it) => catLabel(it.c)],
    ['Provider', (it) => it.p],
    ['Outcome', (it, d) => d?.outcome || it.s],
    ['Success measure', (it, d) => d?.kpi || '—'],
    ['Industries', (it) => it.i.map(industryLabel).join(', ')],
    ['Platforms', (it) => it.pl.join(', ') || 'Not stated'],
    ['Regions', (it) => it.r.join(', ') || 'Not stated'],
    ['Organisation size', (it, d) => (d?.orgSizes || []).map(label.size).join(', ') || '—'],
    ['Decision owner', (it, d) => (d?.audience || []).join(', ') || '—'],
    ['Readiness', (it, d) => `${readiness(it, d).pct}%`],
    ['Buying routes', (it, d) => [...new Set((d?.skus || []).flatMap((s) => s.routes))].map(label.route).join(', ') || 'On request'],
    ['Marketplace', (it) => (it.b ? 'Yes' : 'No')],
    ['Not for', (it, d) => (d?.notFor || []).slice(0, 2).map((n) => n.situation).join(' · ') || '—'],
  ];
  const table = h(
    'table',
    { class: 'ctable' },
    h(
      'thead',
      null,
      h(
        'tr',
        null,
        h('th', { scope: 'col' }, h('span', { class: 'sr' }, 'Attribute')),
        items.map((it) =>
          h(
            'th',
            { scope: 'col' },
            catChip(it.c),
            h('h3', null, h('a', { href: `#/listing/${it.slug}` }, it.t)),
            h('div', { class: 'chips', style: { marginTop: '10px' } }, h('button', { class: 'btn sm primary', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Request call'), h('button', { class: 'btn sm', type: 'button', onclick: () => (lists.toggle('compare', it.id), rerender()) }, 'Remove')),
          ),
        ),
      ),
    ),
    h(
      'tbody',
      null,
      rows.map(([name, fn]) => {
        const vals = items.map((it, i) => String(fn(it, details[i])));
        const differs = new Set(vals).size > 1;
        return h('tr', { class: differs && items.length > 1 ? 'diff' : '' }, h('th', { scope: 'row' }, name), vals.map((v) => h('td', null, v)));
      }),
    ),
  );
  wrap.append(h('div', { class: 'ctable-wrap' }, table));
  if (ids.length < MAX_COMPARE) wrap.append(h('p', { class: 'muted', style: { marginTop: '-50px', marginBottom: '80px' } }, `Room for ${MAX_COMPARE - ids.length} more. `, h('a', { class: 'link', href: '#/catalogue' }, 'Add from the catalogue')));
  return node;
}

// ---------- saved ----------
function saved() {
  const items = lists.get('saved').map(get).filter(Boolean);
  const node = h('div', null, head('Saved', 'Keep the expertise worth exploring.', 'Solutions you have saved on this device.'));
  const wrap = h('div', { class: 'wrap', style: { padding: '36px 0 90px' } });
  node.append(wrap);
  if (!items.length) wrap.append(empty('Your saved list is empty.', 'Tap the heart on any listing to keep it here.', '#/catalogue', 'Find something worth saving', 'ph-heart'));
  else wrap.append(h('div', { class: 'grid' }, items.map((it) => card(it))));
  return node;
}

// ---------- journey board ----------
const COLS = [
  ['exploring', 'Exploring', 'Listings you have opened'],
  ['shortlisted', 'Shortlisted', 'Worth a proper conversation'],
  ['talking', 'Talking to Redington', 'Requests you have sent'],
];
function journey() {
  const j = lists.get('journey');
  const reqs = lists.get('requests');
  const node = h('div', null, head('My journey', 'Everything you are evaluating, in one place.', 'Move solutions along as your thinking firms up. It all stays on this device.'));
  const wrap = h('div', { class: 'wrap' });
  node.append(wrap);
  const entries = Object.entries(j)
    .map(([id, v]) => [get(id), v])
    .filter(([it]) => it);
  if (!entries.length && !reqs.length) {
    wrap.append(empty('Your journey starts with a single listing.', 'Open any solution and it will appear here, ready to shortlist.', '#/discover', 'Start guided discovery', 'ph-path'));
    return node;
  }
  const board = h(
    'div',
    { class: 'board' },
    COLS.map(([key, title, sub], ci) => {
      const here = entries.filter(([, v]) => v.stage === key).sort((a, b) => b[1].at.localeCompare(a[1].at));
      return h(
        'section',
        { class: 'col', 'aria-label': title },
        h('h3', null, title, h('span', null, fmt(here.length))),
        h('p', { class: 'muted small' }, sub),
        here.map(([it]) =>
          h(
            'div',
            { class: 'mini' },
            h('div', { class: 'chips', style: { marginBottom: '6px' } }, catChip(it.c)),
            h('a', { href: `#/listing/${it.slug}` }, it.t),
            h(
              'div',
              { class: 'acts' },
              ci > 0 ? h('button', { class: 'btn sm', type: 'button', onclick: () => (lists.stage(it.id, COLS[ci - 1][0]), rerender()) }, '←') : null,
              ci < COLS.length - 1 ? h('button', { class: 'btn sm', type: 'button', onclick: () => (ci === 1 ? requestDialog(it, 'discovery') : (lists.stage(it.id, COLS[ci + 1][0]), rerender())) }, ci === 1 ? 'Request call' : 'Shortlist →') : null,
              h('button', { class: 'btn sm ghost', type: 'button', onclick: () => (lists.stage(it.id, null), rerender(), toast('Removed from your journey')) }, 'Remove'),
            ),
          ),
        ),
      );
    }),
  );
  wrap.append(board);
  if (reqs.length)
    wrap.append(
      h(
        'section',
        { style: { paddingBottom: '90px' } },
        h('h2', null, 'Your requests'),
        h(
          'div',
          { class: 'ctable-wrap', style: { margin: '16px 0 0' } },
          h(
            'table',
            { class: 'ctable' },
            h('thead', null, h('tr', null, ['Solution', 'Type', 'Company', 'Date', 'Status'].map((t) => h('th', { scope: 'col' }, t)))),
            h(
              'tbody',
              null,
              reqs.map((r) => h('tr', null, h('td', null, h('a', { class: 'link', href: `#/listing/${get(r.listing)?.slug || ''}` }, r.title), r.sku ? h('div', { class: 'small muted' }, r.sku) : null), h('td', null, (REQUEST_TYPES.find((t) => t.key === r.type)?.label || r.type).replace(/^Request an? |^Submit /, '').replace(/^./, (c) => c.toUpperCase())), h('td', null, r.company), h('td', null, new Date(r.at).toLocaleDateString('en-GB')), h('td', null, h('span', { class: 'chip honey' }, r.status)))),
            ),
          ),
        ),
      ),
    );
  return node;
}

function rerender() {
  dispatchEvent(new HashChangeEvent('hashchange'));
}
