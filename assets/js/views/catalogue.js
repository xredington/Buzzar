import { h, fmt, plural, coin, img, catImg } from '../ui.js';
import { filterItems, facetCounts, getMeta, TYPE, CAT_BLURB, catLabel, industryLabel, subLabel } from '../data.js';
import { card } from '../components.js';

const PAGE = 24;
const LIST_KEYS = ['cat', 'ind', 'plat', 'reg'];

function readState(params) {
  const s = {
    q: params.get('q') || '',
    type: params.get('type') || '',
    prov: params.get('prov') || '',
    sub: params.get('sub') || '',
    sort: params.get('sort') || '',
    buy: params.get('buy') === '1',
    page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
  };
  for (const k of LIST_KEYS) s[k] = (params.get(k) || '').split(',').filter(Boolean);
  return s;
}
function writeState(s) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.type) p.set('type', s.type);
  for (const k of LIST_KEYS) if (s[k].length) p.set(k, s[k].join(','));
  if (s.prov) p.set('prov', s.prov);
  if (s.sub) p.set('sub', s.sub);
  if (s.buy) p.set('buy', '1');
  if (s.sort) p.set('sort', s.sort);
  if (s.page > 1) p.set('page', s.page);
  const qs = p.toString();
  history.replaceState(null, '', '#/catalogue' + (qs ? '?' + qs : ''));
}

function heading(s, meta) {
  if (s.prov) {
    const p = meta.providers.find((x) => x.name === s.prov);
    return { eyebrow: p?.kind === 'distributor' ? 'Distributor' : 'Provider', title: s.prov, lede: `${plural(p?.n || 0, 'listing')} from ${s.prov} on Buzzar, governed and supported through Redington.` };
  }
  if (s.ind.length === 1 && !s.cat.length && !s.type) return { eyebrow: 'Industry', title: industryLabel(s.ind[0]), lede: `Products, services and accelerators shaped around ${industryLabel(s.ind[0]).toLowerCase()}, plus cross-industry options that fit.` };
  if (s.cat.length === 1 && !s.type) return { eyebrow: 'Category', title: catLabel(s.cat[0]), lede: CAT_BLURB[s.cat[0]] };
  if (s.sub) return { eyebrow: catLabel(s.sub.split(':')[0]), title: subLabel(s.sub), lede: `Listings tagged ${subLabel(s.sub)}.`, iconName: s.sub.split(':')[0], cat: s.sub.split(':')[0] };
  if (s.type) return { eyebrow: 'The solution bazaar', title: TYPE[s.type].plural, lede: TYPE[s.type].blurb };
  return { eyebrow: 'The solution bazaar', title: 'Search the catalogue', lede: `Every published listing, ${fmt(meta.total)} in all: products, services and accelerators. Filter by category, industry, platform and region, or describe what you need to Sami.` };
}

export default function catalogue(route) {
  const meta = getMeta();
  const s = readState(route.params);
  const hd = heading(s, meta);

  const head = h(
    'header',
    { class: 'phead compact' },
    h(
      'div',
      { class: 'wrap' },
      h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/' }, 'Home'), h('span', { 'aria-hidden': 'true' }, '/'), h('a', { href: '#/catalogue' }, 'Catalogue'), hd.title !== 'Search the catalogue' ? [h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, hd.title)] : null),

      s.prov ? h('div', { class: 'provhead' }, coin(s.prov, 64), h('h1', null, hd.title)) : h('h1', null, hd.title),

    ),
  );

  const qInput = h('input', { type: 'search', value: s.q, placeholder: 'Try “Kubernetes”, “fraud” or “customer insights”', 'aria-label': 'Search the catalogue' });
  const sortSel = h(
    'select',
    { class: 'sel', 'aria-label': 'Sort' },
    [
      ['', 'Best match'],
      ['az', 'A to Z'],
      ['za', 'Z to A'],
      ['new', 'Recently updated'],
    ].map(([v, l]) => h('option', { value: v, selected: s.sort === v }, l)),
  );
  const filtersEl = h('div', { class: 'filters-in' });
  const fCount = h('span', { class: 'fcount', hidden: true });
  const toggleF = h('button', { class: 'btn ftoggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'fdrawer' }, h('i', { class: 'ph ph-sliders-horizontal', 'aria-hidden': 'true' }), 'Filters', fCount);
  const fDrawer = h(
    'div',
    { class: 'fdrawer', id: 'fdrawer', hidden: true, role: 'dialog', 'aria-label': 'Filters' },
    h('div', { class: 'fd-scrim', onclick: () => closeF() }),
    h('aside', { class: 'fd-panel' }, h('div', { class: 'fd-head' }, h('b', { class: 'heading-6' }, 'Filters'), h('button', { class: 'tool', type: 'button', 'aria-label': 'Close filters', onclick: () => closeF() }, h('i', { class: 'ph ph-x', 'aria-hidden': 'true' }))), filtersEl, h('div', { class: 'fd-foot' }, h('button', { class: 'btn dark wide', type: 'button', onclick: () => closeF() }, 'Show results'))),
  );
  function openF() {
    fDrawer.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => fDrawer.classList.add('open')));
    toggleF.setAttribute('aria-expanded', 'true');
  }
  function closeF() {
    fDrawer.classList.remove('open');
    toggleF.setAttribute('aria-expanded', 'false');
    setTimeout(() => !fDrawer.classList.contains('open') && (fDrawer.hidden = true), 500);
  }
  toggleF.addEventListener('click', openF);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && fDrawer.isConnected && closeF());
  const catStrip = h('div', { class: 'catstrip', role: 'group', 'aria-label': 'Category' });
  const tabsEl = h('div', { class: 'tabs', role: 'group', 'aria-label': 'Offering type' });
  const activeEl = h('div', { class: 'active-f' });
  const spotEl = h('div', { class: 'spotlight' });
  const barEl = h('div', { class: 'result-bar', 'aria-live': 'polite' });
  const gridEl = h('div', { class: 'grid' });
  const pagerEl = h('nav', { class: 'pager', 'aria-label': 'Pages' });

  const searchForm = h('form', { class: 'searchbar', role: 'search' }, h('label', { class: 'field' }, h('span', { html: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>' }), qInput), sortSel, toggleF);

  let timer;
  qInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      s.q = qInput.value.trim();
      s.page = 1;
      update();
    }, 220);
  });
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    s.q = qInput.value.trim();
    s.page = 1;
    update();
  });
  sortSel.addEventListener('change', () => {
    s.sort = sortSel.value;
    update();
  });

  function without(key) {
    const c = { ...s, [key]: Array.isArray(s[key]) ? [] : '' };
    return filterItems(c).rows;
  }

  function group(title, key, options, counts, open) {
    const det = h('details', { class: 'fgroup', open: open || s[key].length > 0 }, h('summary', null, title));
    const box = h('div', { class: 'fopts' });
    for (const [val, lbl] of options) {
      const n = counts[val] || 0;
      const on = s[key].includes(val);
      if (!n && !on) continue;
      const cb = h('input', { type: 'checkbox', checked: on });
      cb.addEventListener('change', () => {
        s[key] = cb.checked ? [...s[key], val] : s[key].filter((x) => x !== val);
        s.page = 1;
        update();
      });
      box.append(h('label', { class: 'fopt' + (n ? '' : ' zero') + (val === '__none' ? ' ns' : '') }, cb, h('span', null, lbl), h('span', { class: 'n' }, fmt(n))));
    }
    det.append(box);
    return det;
  }

  // single-choice facet (subcategory, provider): radio-like checkboxes
  function single(title, key, options, counts) {
    const det = h('details', { class: 'fgroup', open: !!s[key] }, h('summary', null, title));
    const box = h('div', { class: 'fopts' });
    for (const [val, lbl] of options) {
      const n = counts[val] || 0;
      const on = s[key] === val;
      if (!n && !on) continue;
      const cb = h('input', { type: 'checkbox', checked: on });
      cb.addEventListener('change', () => {
        s[key] = cb.checked ? val : '';
        s.page = 1;
        update();
      });
      box.append(h('label', { class: 'fopt' }, cb, h('span', null, lbl), h('span', { class: 'n' }, fmt(n))));
    }
    det.append(box);
    return det;
  }
  function subOptions(counts) {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 16)
      .map(([k]) => [k, `${catLabel(k.split(':')[0])}: ${subLabel(k)}`]);
  }

  function update() {
    writeState(s);
    const { rows, terms } = filterItems(s);

    // type tabs, counted against everything else that is selected
    const typeCounts = facetCounts(without('type')).type;
    const totalNoType = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    tabsEl.replaceChildren(
      ...[['', 'All offerings', totalNoType], ...Object.entries(TYPE).map(([k, v]) => [k, v.plural, typeCounts[k] || 0])].map(([k, l, n]) => {
        const b = h('button', { type: 'button', class: 'tab' + (k ? ` k-${k}` : ''), 'aria-pressed': String(s.type === k) }, l, h('span', { class: 'n' }, fmt(n)));
        b.addEventListener('click', () => {
          s.type = k;
          s.page = 1;
          update();
        });
        return b;
      }),
    );

    // facets: each counted with its own selection lifted, so options never vanish when you pick one
    const fc = (key) => facetCounts(without(key));
    const indCounts = fc('ind').ind;
    const buyCount = filterItems({ ...s, buy: true }).rows.length;
    const buyCb = h('input', { type: 'checkbox', checked: s.buy });
    buyCb.addEventListener('change', () => {
      s.buy = buyCb.checked;
      s.page = 1;
      update();
    });
    filtersEl.replaceChildren(
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '6px' } }, h('b', null, 'Refine'), h('button', { class: 'linkish small', type: 'button', onclick: reset }, 'Reset all')),
      group(
        'Category',
        'cat',
        meta.categories.map((c) => [c.code, c.label]),
        fc('cat').cat,
        true,
      ),
      group(
        'Industry',
        'ind',
        Object.entries(meta.industries)
          .map(([k]) => [k, industryLabel(k)])
          .sort((a, b) => (indCounts[b[0]] || 0) - (indCounts[a[0]] || 0)),
        indCounts,
        true,
      ),
      group(
        'Platform',
        'plat',
        [...['AWS', 'Azure', 'Google Cloud', 'Hybrid', 'On-premises'].map((x) => [x, x.replace('-', ' ')]), ['__none', 'Not specified']],
        fc('plat').plat,
      ),
      group(
        'Region',
        'reg',
        [...['GCC', 'UAE', 'KSA', 'Middle East', 'EMEA', 'Africa', 'India'].map((x) => [x, x]), ['__none', 'Not specified']],
        fc('reg').reg,
      ),
      single('Subcategory', 'sub', subOptions(fc('sub').sub), fc('sub').sub),
      single('Provider', 'prov', Object.entries(fc('prov').prov).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k]) => [k, k]), fc('prov').prov),
      h('div', { class: 'fgroup' }, h('label', { class: 'fopt' }, buyCb, h('span', null, 'Buyable on AWS Marketplace'), h('span', { class: 'n' }, fmt(buyCount)))),
    );

    // active filter pills
    const pills = [];
    const pill = (txt, clear) => {
      const b = h('button', { type: 'button', 'aria-label': `Remove filter ${txt}` }, txt);
      b.addEventListener('click', () => {
        clear();
        s.page = 1;
        update();
      });
      pills.push(b);
    };
    if (s.q) pill(`“${s.q}”`, () => ((s.q = ''), (qInput.value = '')));
    for (const v of s.cat) pill(catLabel(v), () => (s.cat = s.cat.filter((x) => x !== v)));
    for (const v of s.ind) pill(industryLabel(v), () => (s.ind = s.ind.filter((x) => x !== v)));
    for (const v of s.plat) pill(v === '__none' ? 'Platform not specified' : v, () => (s.plat = s.plat.filter((x) => x !== v)));
    for (const v of s.reg) pill(v === '__none' ? 'Region not specified' : v, () => (s.reg = s.reg.filter((x) => x !== v)));
    if (s.prov) pill(s.prov, () => (s.prov = ''));
    if (s.sub) pill(subLabel(s.sub), () => (s.sub = ''));
    if (s.buy) pill('Buyable on AWS Marketplace', () => (s.buy = false));
    activeEl.replaceChildren(...pills);

    // provider spotlight for the current view: logos, not words
    const provTop = Object.entries(facetCounts(rows).prov).sort((a, b) => b[1] - a[1]).slice(0, 8);
    spotEl.hidden = !provTop.length || !!s.prov;
    spotEl.replaceChildren(h('span', { class: 'caption-4' }, 'Top providers here'), ...provTop.map(([p, n]) => h('a', { class: 'spot-coin', href: `#/catalogue?prov=${encodeURIComponent(p)}`, title: `${p} · ${n} listings` }, coin(p, 32), h('small', { class: 'num' }, fmt(n)))));

    // category picture strip
    const cc = fc('cat').cat;
    catStrip.replaceChildren(
      ...meta.categories.map((c) => {
        const on = s.cat.length === 1 && s.cat[0] === c.code;
        const b = h('button', { type: 'button', class: 'cchip' + (on ? ' on' : ''), 'aria-pressed': String(on), disabled: !cc[c.code] && !on }, h('span', { class: 'cc-img' }, img(catImg(c.code), '', { width: 44, height: 44 })), h('span', null, h('b', null, c.label.replace('Artificial Intelligence', 'AI').replace('Data and Analytics', 'Data')), h('small', { class: 'num' }, fmt(cc[c.code] || 0))));
        b.addEventListener('click', () => {
          s.cat = on ? [] : [c.code];
          s.page = 1;
          update();
        });
        return b;
      }),
    );
    const nf = s.ind.length + s.plat.length + s.reg.length + (s.sub ? 1 : 0) + (s.prov ? 1 : 0) + (s.buy ? 1 : 0) + Math.max(0, s.cat.length - 1);
    fCount.hidden = !nf;
    fCount.textContent = nf;

    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    if (s.page > pages) s.page = pages;
    const start = (s.page - 1) * PAGE;
    const slice = rows.slice(start, start + PAGE);
    barEl.replaceChildren(...[h('span', null, rows.length ? `Showing ${fmt(start + 1)}–${fmt(start + slice.length)} of ${plural(rows.length, 'listing')}` : 'No listings match'), s.q ? h('span', { class: 'small muted' }, 'Sorted by relevance unless you choose otherwise') : null].filter(Boolean));

    if (!rows.length) {
      gridEl.replaceChildren(
        h(
          'div',
          { class: 'empty', style: { gridColumn: '1 / -1' } },
          h('h3', null, 'No listing matches every filter.'),
          h('p', null, 'Remove a filter, or describe the outcome to Sami.'),
          h('div', { class: 'chips', style: { justifyContent: 'center' } }, h('button', { class: 'btn', type: 'button', onclick: reset }, 'Clear filters'), h('a', { class: 'btn primary', href: `#/advisor?q=${encodeURIComponent(s.q || '')}` }, 'Ask Sami')),
        ),
      );
    } else if (s.type === 'accelerator' && !s.q) {
      gridEl.replaceChildren(...tracks(rows));
      pagerEl.replaceChildren();
      barEl.replaceChildren(h('span', null, `${fmt(rows.length)} accelerators in ${fmt(tracks(rows).length)} programmes. Each programme runs in three stages.`));
      gridEl.className = 'tracks';
      return;
    } else gridEl.replaceChildren(...slice.map((it) => card(it, { terms, quick: true })));
    gridEl.className = 'grid';

    // pagination with a window around the current page
    pagerEl.replaceChildren();
    if (pages > 1) {
      const btn = (p, label, attrs = {}) => {
        const b = h('button', { type: 'button', ...attrs }, label);
        b.addEventListener('click', () => {
          s.page = p;
          update();
          gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return b;
      };
      pagerEl.append(btn(s.page - 1, '←', { disabled: s.page === 1, 'aria-label': 'Previous page' }));
      const set = new Set([1, pages, s.page - 1, s.page, s.page + 1].filter((p) => p >= 1 && p <= pages));
      let last = 0;
      for (const p of [...set].sort((a, b) => a - b)) {
        if (p - last > 1) pagerEl.append(h('span', { class: 'muted' }, '…'));
        pagerEl.append(btn(p, String(p), { 'aria-current': p === s.page ? 'page' : null, 'aria-label': `Page ${p}` }));
        last = p;
      }
      pagerEl.append(btn(s.page + 1, '→', { disabled: s.page === pages, 'aria-label': 'Next page' }));
    }
  }

  function reset() {
    Object.assign(s, { q: '', type: s.type, prov: '', sub: '', buy: false, page: 1, cat: [], ind: [], plat: [], reg: [] });
    qInput.value = '';
    update();
  }

  update();

  return h('div', null, head, h('div', { class: 'wrap cat-main' }, searchForm, catStrip, h('div', { class: 'cat-row' }, tabsEl, spotEl), activeEl, barEl, gridEl, pagerEl), fDrawer);
}

// ---------- accelerators as programme tracks ----------
const STAGE_ICON = ['ph-magnifying-glass', 'ph-flask', 'ph-rocket-launch'];
function tracks(rows) {
  const by = new Map();
  for (const it of rows) {
    const [prog, stage] = it.t.split(' — ');
    if (!by.has(prog)) by.set(prog, []);
    by.get(prog).push({ it, stage: stage || it.t });
  }
  const order = ['Assess and Prioritize', 'Pilot and Demonstrate', 'Scale and Operate'];
  return [...by.entries()].map(([prog, list], k) => {
    list.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
    const c = list[0].it.c;
    return h(
      'article',
      { class: 'track', style: { animationDelay: `${k * 50}ms` } },
      h('div', { class: 'tr-head' }, h('span', { class: 'tr-img' }, img(catImg(c), '', { width: 56, height: 56 })), h('div', null, h('h3', null, prog.replace(/ Program$/, '')), h('small', null, `${catLabel(c)} · programme in ${list.length} stages`))),
      h(
        'ol',
        { class: 'tr-stages' },
        list.map((x, i) => h('li', null, h('a', { href: `#/listing/${x.it.slug}` }, h('span', { class: 'tr-n' }, h('i', { class: `ph ${STAGE_ICON[i] || 'ph-circle'}`, 'aria-hidden': 'true' })), h('b', null, x.stage.replace(' and ', ' & ')), h('small', null, `Stage ${i + 1}`)))),
      ),
    );
  });
}
