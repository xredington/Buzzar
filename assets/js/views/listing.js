import { h, icon, listingArt, toast, fmt } from '../ui.js';
import { getBySlug, get, detail, TYPE, catLabel, industryLabel, label, readiness, all } from '../data.js';
import { catChip, toggleBtn, card, requestDialog, REQUEST_TYPES } from '../components.js';
import { lists } from '../ui.js';

export default async function listing(route) {
  const it = getBySlug(route.args[0] || '');
  if (!it) {
    return h('section', { class: 'wrap section' }, h('div', { class: 'empty' }, h('h1', null, 'Listing not found.'), h('p', null, 'It may have been retired or renamed.'), h('a', { class: 'btn primary', href: '#/catalogue' }, 'Browse the catalogue')));
  }
  const d = await detail(it.id);
  // record that the buyer has looked at it, for My journey
  const j = lists.get('journey');
  if (!j[it.id]) lists.stage(it.id, 'exploring');

  return h('div', null, hero(it, d), body(it, d));
}

function hero(it, d) {
  const share = h('button', { class: 'btn ghost', type: 'button' }, icon('link'), 'Share');
  share.addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: it.t, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied');
      }
    } catch {
      /* dismissed */
    }
  });
  const art = h('div', { class: 'art', style: { '--cat': `var(--c-${it.c})` }, html: listingArt(it) });
  return h(
    'section',
    { class: 'lhero' },
    h(
      'div',
      { class: 'wrap' },
      h(
        'nav',
        { class: 'crumbs', 'aria-label': 'Breadcrumb' },
        h('a', { href: '#/' }, 'Home'),
        h('span', { 'aria-hidden': 'true' }, '/'),
        h('a', { href: `#/catalogue?type=${it.y}` }, TYPE[it.y].plural),
        h('span', { 'aria-hidden': 'true' }, '/'),
        h('a', { href: `#/catalogue?cat=${it.c}` }, catLabel(it.c)),
      ),
      h(
        'div',
        { class: 'lhero-grid' },
        h(
          'div',
          null,
          h('div', { class: 'chips' }, catChip(it.c), h('span', { class: 'chip' }, TYPE[it.y].label), d?.version ? h('span', { class: 'chip' }, `Version ${d.version}`) : null, it.b ? h('span', { class: 'chip honey' }, 'Cloud marketplace') : null),
          h('h1', null, it.t),
          h('p', { class: 'by' }, it.k === 'distributor' ? ['Delivered by ', h('a', { class: 'link', href: `#/catalogue?prov=${encodeURIComponent(it.p)}` }, it.p)] : ['By ', h('a', { class: 'link', href: `#/catalogue?prov=${encodeURIComponent(it.p)}` }, it.p), ' · listed through Redington']),
          h('p', { class: 'status' }, `Published${it.u ? ' ' + new Date(it.u).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · checker review pending`),
          h('div', { class: 'acts' }, h('button', { class: 'btn primary', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Request a discovery call', h('span', { class: 'arr' }, '→')), toggleBtn('compare', it.id), toggleBtn('saved', it.id), share),
        ),
        art,
      ),
    ),
  );
}

function section(id, eyebrow, title, ...kids) {
  return h('section', { id: 's-' + id, 'aria-labelledby': 'h-' + id }, h('p', { class: 'eyebrow' }, eyebrow), h('h2', { id: 'h-' + id }, title), ...kids);
}

function parseScope(text) {
  const metaRows = [];
  const steps = [];
  const other = [];
  for (const raw of String(text || '').split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const step = line.match(/^\d+[).]\s*(.+)$/);
    if (step) steps.push(step[1]);
    else if (/^[A-Z][A-Za-z ]{2,24}:\s/.test(line)) {
      const i = line.indexOf(':');
      metaRows.push([line.slice(0, i), line.slice(i + 1).trim()]);
    } else other.push(line);
  }
  return { metaRows, steps, other };
}

function body(it, d) {
  const main = h('div', { class: 'lmain' });
  const toc = [];
  const add = (id, name, node) => {
    if (!node) return;
    toc.push([id, name]);
    main.append(node);
  };

  if (it.tw?.length) {
    const twins = it.tw.map(get).filter(Boolean);
    main.append(
      h(
        'div',
        { class: 'twin' },
        icon('link'),
        h('span', null, 'Also on Buzzar: ', twins.map((t, i) => [i ? ', ' : '', h('a', { class: 'link', href: `#/listing/${t.slug}` }, `${it.t} as a ${TYPE[t.y].label.toLowerCase()}`), ` from ${t.p}`]), '. Compare both to decide between a product and a delivered service.'),
      ),
    );
  }

  add(
    'outcome',
    'Outcome',
    section(
      'outcome',
      'The outcome',
      'What this changes',
      h('p', { class: 'outcome' }, d?.outcome || it.s),
      d?.overview ? h('p', { class: 'muted' }, d.overview) : null,
      d?.kpi ? h('div', { class: 'kpi' }, h('span', { class: 'hexdot', 'aria-hidden': 'true' }), h('div', null, h('b', null, 'Primary success measure'), h('span', null, d.kpi.replace(/^./, (c) => c.toUpperCase())))) : null,
    ),
  );

  const r = readiness(it, d);
  const C = 2 * Math.PI * 30;
  const ring = h('div', {
    html: `<svg class="ring" viewBox="0 0 74 74" aria-hidden="true"><circle class="bg" cx="37" cy="37" r="30"/><circle class="fg" cx="37" cy="37" r="30" stroke-dasharray="${C}" stroke-dashoffset="${C}"/><text x="37" y="37">${r.pct}%</text></svg>`,
  });
  requestAnimationFrame(() => setTimeout(() => ring.querySelector('.fg')?.setAttribute('stroke-dashoffset', String(C * (1 - r.pct / 100))), 200));
  const next = r.stages.find((s) => s.ok < 1);
  add(
    'journey',
    'Readiness',
    section(
      'journey',
      'Where it stands',
      'Readiness across your journey',
      h('div', { class: 'readiness' }, ring, h('div', null, h('b', null, r.pct >= 70 ? 'Ready to explore and define' : 'Early: ask before you plan'), h('p', { class: 'muted small', style: { margin: 0 } }, 'Based only on what this listing has published at each stage. ', next ? `Next gap: ${next.name.toLowerCase()}.` : ''))),
      h(
        'div',
        { class: 'path6' },
        r.stages.map((s, i) => h('div', { class: 'p6' + (s.ok === 1 ? ' on' : s.ok > 0 ? ' part' : '') }, h('div', { class: 'hx' }, String(i + 1)), h('h4', null, s.name), h('p', null, s.text), h('span', { class: 'st' }, s.ok === 1 ? 'Ready' : s.ok > 0 ? 'Partly' : 'Not yet'))),
      ),
    ),
  );

  if (d?.benefits?.length)
    add(
      'benefits',
      'Benefits',
      section(
        'benefits',
        'Benefits',
        'What you can expect',
        h('p', { class: 'muted small' }, 'Every benefit is labelled with its basis. Estimates are hypotheses to test against your own baseline, not promises.'),
        h(
          'div',
          { class: 'benefits' },
          d.benefits.map((b) => h('div', { class: 'benefit' }, h('div', { class: 'chips', style: { marginBottom: '8px' } }, h('span', { class: 'chip ' + (b.kind === 'estimate' ? 'honey' : 'green') }, b.kind === 'estimate' ? 'Estimate' : 'Evidenced'), b.source ? h('span', { class: 'chip' }, b.source) : null), h('h4', null, b.text), b.limits ? h('p', null, b.limits) : null)),
        ),
      ),
    );

  if (d && (d.audience.length || d.orgSizes.length || d.maturity.length))
    add(
      'fit',
      'Who it fits',
      section(
        'fit',
        'Fit',
        'Who it is for',
        h(
          'dl',
          { class: 'facts', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', display: 'grid', gap: '20px', marginBottom: '22px' } },
          d.audience.length ? h('div', null, h('dt', null, 'Decision owner'), h('dd', null, d.audience.join(', '))) : null,
          d.orgSizes.length ? h('div', null, h('dt', null, 'Organisation size'), h('dd', null, d.orgSizes.map(label.size).join(', '))) : null,
          d.maturity.length ? h('div', null, h('dt', null, 'Where you are'), h('dd', null, d.maturity.map((m) => m[0].toUpperCase() + m.slice(1)).join(' → '))) : null,
        ),
        d.notFor?.length ? h('div', { class: 'notfor' }, h('h3', null, 'Not for you if…'), h('ul', null, d.notFor.map((n) => h('li', null, n.situation, n.why && !/outside the intended fit/i.test(n.why) ? h('span', null, ` — ${n.why}`) : null)))) : null,
      ),
    );

  if (d?.scope) {
    const sc = parseScope(d.scope);
    add(
      'scope',
      'Scope',
      section(
        'scope',
        'Scope of work',
        'How it gets delivered',
        sc.metaRows.length ? h('div', { class: 'scope-meta' }, sc.metaRows.map(([k, v]) => h('p', { style: { margin: '0 0 6px' } }, h('b', null, k + ': '), v))) : null,
        sc.steps.length ? h('ol', { class: 'scope' }, sc.steps.map((s) => h('li', null, s))) : null,
        sc.other.map((o) => h('p', { class: 'muted' }, o)),
        d.effort && !sc.metaRows.some(([k]) => /duration/i.test(k)) ? h('p', { class: 'muted small' }, h('b', null, 'Effort: '), d.effort) : null,
      ),
    );
  }

  if (d?.deliverables?.length) add('deliverables', 'Deliverables', section('deliverables', 'Deliverables', 'What you walk away with', h('ul', { class: 'ticks' }, d.deliverables.map((x) => h('li', null, x)))));

  if (d?.skus?.length)
    add(
      'buy',
      'Ways to buy',
      section(
        'buy',
        'Ways to buy',
        'Pick a tier',
        h('p', { class: 'muted small' }, d.skus.some((s) => s.sample) ? 'Tiers are illustrative while commercial terms are confirmed. Pricing is shared through a private offer.' : 'Pricing is shared through a private offer.'),
        h(
          'div',
          { class: 'skus' },
          d.skus.map((s, i) =>
            h(
              'div',
              { class: 'sku' + (i === 0 && d.skus.length > 1 ? ' feat' : '') },
              h('div', null, h('h4', null, s.edition || s.name), h('code', null, s.code)),
              h(
                'dl',
                null,
                h('dt', null, 'Pricing'),
                h('dd', null, label.model(s.model)),
                h('dt', null, 'Billed'),
                h('dd', null, label.unit(s.unit)),
                s.terms.length ? [h('dt', null, 'Terms'), h('dd', null, s.terms.map(label.term).join(' or '))] : null,
                s.routes.length ? [h('dt', null, 'Route'), h('dd', null, s.routes.map(label.route).join(' · '))] : null,
              ),
              s.included.length ? h('ul', { class: 'ticks', style: { gridTemplateColumns: '1fr', fontSize: '0.86rem' } }, s.included.slice(0, 4).map((x) => h('li', null, x))) : null,
              h('div', { class: 'price' }, 'Price on private offer'),
              h('button', { class: 'btn sm' + (i === 0 ? ' primary' : ''), type: 'button', onclick: () => requestDialog(it, 'private-offer', `${s.edition || s.name} (${s.code})`) }, 'Request a private offer'),
            ),
          ),
        ),
      ),
    );

  // related: published related slugs first, then same subcategory
  const rel = [];
  for (const slug of d?.related || []) {
    const x = getBySlug(slug);
    if (x && x.id !== it.id && !rel.includes(x)) rel.push(x);
  }
  for (const x of all()) {
    if (rel.length >= 6) break;
    if (x.id !== it.id && !rel.includes(x) && x.c === it.c && x.sc.some((s) => it.sc.includes(s))) rel.push(x);
  }
  if (rel.length) add('related', 'Related', section('related', 'Keep exploring', 'Related solutions', h('div', { class: 'grid' }, rel.slice(0, 3).map((x) => card(x)))));

  // ---------- sidebar ----------
  const reqType = h('div', { class: 'req-opts', role: 'radiogroup', 'aria-label': 'Request type' }, REQUEST_TYPES.slice(0, 3).map((t, i) => h('label', { class: 'req-opt' }, h('input', { type: 'radio', name: 'side-type', value: t.key, checked: i === 0 }), h('div', null, h('b', null, t.label.replace(/^Request an? |^Submit /, '').replace(/^./, (c) => c.toUpperCase())), h('span', null, t.hint)))));
  const side = h(
    'aside',
    { class: 'side' },
    h(
      'div',
      { class: 'panel' },
      h('h3', null, 'Work with Redington'),
      h('p', { class: 'muted small', style: { margin: 0 } }, 'Choose what you need. A specialist replies with next steps.'),
      reqType,
      h('button', { class: 'btn primary', style: { width: '100%' }, type: 'button', onclick: () => requestDialog(it, reqType.querySelector('input:checked').value) }, 'Continue', h('span', { class: 'arr' }, '→')),
    ),
    h(
      'div',
      { class: 'panel' },
      h(
        'dl',
        { class: 'facts' },
        fact('Practice', h('a', { class: 'link', href: `#/catalogue?cat=${it.c}` }, catLabel(it.c)) , it.pr && it.pr !== catLabel(it.c) ? ` · ${it.pr}` : ''),
        it.sc.length ? fact('Capability', it._subs.map((s, i) => [i ? ', ' : '', h('a', { class: 'link', href: `#/catalogue?sub=${encodeURIComponent(it.sc[i])}` }, s)])) : null,
        fact('Industries', it.i.map((k, i) => [i ? ', ' : '', h('a', { class: 'link', href: `#/catalogue?ind=${k}` }, industryLabel(k))])),
        it.pl.length ? fact('Platforms', it.pl.join(', ')) : null,
        it.r.length ? fact('Regions', it.r.join(', ')) : null,
        d?.residency ? fact('Data residency', d.residency) : null,
      ),
    ),
    toc.length > 2 ? h('nav', { class: 'panel toc', 'aria-label': 'On this page' }, h('p', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'On this page'), toc.map(([id, name]) => h('a', { href: '#', 'data-to': 's-' + id }, name))) : null,
  );
  side.addEventListener('click', (e) => {
    const a = e.target.closest('[data-to]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // highlight the section in view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) for (const a of side.querySelectorAll('[data-to]')) a.classList.toggle('on', a.dataset.to === e.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    requestAnimationFrame(() => main.querySelectorAll('section[id]').forEach((s) => io.observe(s)));
  }

  if (!d) main.prepend(h('p', { class: 'note', style: { marginBottom: '24px' } }, 'Full details for this listing are not in this snapshot yet. The summary is shown; request a discovery call for the rest.'));

  return h('div', { class: 'wrap lbody' }, main, side);
}

function fact(name, ...v) {
  return h('div', null, h('dt', null, name), h('dd', null, ...v));
}
