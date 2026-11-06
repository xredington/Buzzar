// Listing page — anatomy follows the UI & CX handover, top to bottom.
import { h, toast, fmt, img, catImg, lists } from '../ui.js';
import { getBySlug, get, detail, TYPE, catLabel, industryLabel, label, readiness, all } from '../data.js';
import { card, requestDialog, REQUEST_TYPES, KIND, kindTag, providerLine } from '../components.js';
import { buildPlan, renderPlan, downloadPlan, scopeSteps, scopeMeta } from '../plan.js';

const DATE = (s) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ENGAGE = { time_and_materials: 'Time and materials', managed_retainer: 'Managed or retainer', fixed_scope_project: 'Fixed-scope project', assessment: 'Assessment', workshop: 'Workshop' };
const PRICING = { day_rate: 'Day rate', fixed_price: 'Fixed price', monthly_fee: 'Monthly fee', per_user_per_month: 'Per user per month', outcome_based: 'Outcome-based', no_charge: 'No charge' };
const nice = (s) => (s ? String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');

export default async function listing(route) {
  const it = getBySlug(route.args[0] || '');
  if (!it) {
    return h('section', { class: 'wrap section' }, h('div', { class: 'empty' }, h('h1', null, 'Listing not found'), h('p', null, 'It may have been retired or renamed.'), h('a', { class: 'btn primary', href: '#/catalogue' }, 'Search the catalogue')));
  }
  const d = await detail(it.id);
  const j = lists.get('journey');
  if (!j[it.id]) lists.stage(it.id, 'exploring');
  return h('div', null, hero(it, d), body(it, d));
}

// ---------- 1–3: breadcrumb, title, provider, review status, summary, request buttons ----------
function hero(it, d) {
  const share = h('button', { class: 'btn ghost sm', type: 'button' }, 'Copy link');
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    } catch {
      toast('Copy the address from your browser bar');
    }
  });
  const summary = d?.outcome && d.outcome.trim() !== it.s.trim() ? it.s : it.s;
  const toggle = (kind) => {
    const on = lists.has(kind, it.id);
    const b = h('button', { class: 'btn sm', type: 'button', 'data-act': kind === 'saved' ? 'save' : 'compare', 'data-id': it.id, 'aria-pressed': String(on) }, kind === 'saved' ? 'Save' : 'Compare');
    b.addEventListener('click', () => {
      const r = lists.toggle(kind, it.id, kind === 'compare' ? 3 : 0);
      if (r.full) return toast('Compare holds 3. Remove one first.');
      toast(r.on ? (kind === 'saved' ? 'Saved' : 'Added to compare') : kind === 'saved' ? 'Removed from saved' : 'Removed from compare');
    });
    return b;
  };
  return h(
    'section',
    { class: `lhero k-${it.y}` },
    h(
      'div',
      { class: 'wrap' },
      h(
        'nav',
        { class: 'crumbs', 'aria-label': 'Breadcrumb' },
        h('a', { href: `#/catalogue?type=${it.y}` }, TYPE[it.y].plural),
        h('span', { 'aria-hidden': 'true' }, '/'),
        h('a', { href: `#/catalogue?type=${it.y}&cat=${it.c}` }, catLabel(it.c)),
        h('span', { 'aria-hidden': 'true' }, '/'),
        h('span', null, it.t),
      ),
      h(
        'div',
        { class: 'lhero-grid' },
        h(
          'div',
          null,
          h('div', { class: 'chips', style: { alignItems: 'center', gap: '10px' } }, kindTag(it.y), h('span', { class: 'chip' }, catLabel(it.c)), it._subs[0] ? h('span', { class: 'chip' }, it._subs[0]) : null, h('span', { class: 'chip' }, `Version ${d?.version || it.v || 1}`), it.aws ? h('span', { class: 'badge-sku' }, 'Buyable on AWS Marketplace') : null),
          h('h1', null, it.t),
          h('p', { class: 'by' }, it.k === 'distributor' ? 'Provided by ' : 'By ', h('a', { class: 'link', style: { color: 'inherit' }, href: `#/catalogue?prov=${encodeURIComponent(it.p)}` }, it.p), it.k === 'distributor' ? null : ' · listing provided by Redington'),
          h('div', { class: 'review-badge', title: 'Only listings approved by a Buzzar checker are published. The freshness review re-checks claims on a schedule.' }, h('span', null, h('b', null, 'Approved for publication'), ' by a Buzzar checker', it.rd ? ` · next freshness review ${DATE(it.rd)}` : '')),
          h('p', { class: 'lsummary' }, summary),
          h(
            'div',
            { class: 'req-row' },
            h('button', { class: 'btn primary', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Request a discovery call'),
            h('button', { class: 'btn', type: 'button', onclick: () => requestDialog(it, 'standard') }, 'Request a standard proposal'),
            h('button', { class: 'btn', type: 'button', onclick: () => requestDialog(it, 'custom') }, 'Submit requirements for a custom proposal'),
          ),
          h('div', { class: 'chips acts', style: { gap: '8px' } }, toggle('compare'), toggle('saved'), share),
        ),
        h(
          'aside',
          { class: 'l-aside', 'aria-label': 'Key facts' },
          h('figure', null, img(catImg(it.c), '', { width: 140, height: 140, loading: 'eager' })),
          h(
            'dl',
            null,
            fact('Provider', it.p, it.k === 'distributor' ? ' (Redington)' : ' (vendor)'),
            d?.presales ? fact('Pre-sales team', `${d.presales.team} · ${d.presales.practice}`) : null,
            fact('Industries', it.i.map(industryLabel).join(', ')),
            it.pl.length ? fact('Platforms', it.pl.join(', ')) : null,
            it.r.length ? fact('Regions', it.r.join(', ')) : null,
            it.dm?.length ? fact('Deployment model', it.dm.join(', ')) : null,
            d?.skus?.length ? fact('Ways to buy', `${d.skus.length} edition${d.skus.length === 1 ? '' : 's'} · price on private offer`) : null,
          ),
        ),
      ),
    ),
  );
}

function fact(name, ...v) {
  return h('div', null, h('dt', null, name), h('dd', null, ...v));
}

function section(id, eyebrow, title, colour, ...kids) {
  return h('section', { id: 's-' + id, 'aria-labelledby': 'h-' + id, style: colour ? { '--fc': colour } : null }, h('p', { class: 'eyebrow' }, eyebrow), h('h2', { id: 'h-' + id }, title), ...kids);
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
    main.append(h('div', { class: 'twin' }, h('span', null, 'Also on Buzzar: ', twins.map((t, i) => [i ? ', ' : '', h('a', { class: 'link', href: `#/listing/${t.slug}` }, `${it.t} as a ${KIND[t.y].label.toLowerCase()}`), ` from ${t.p}`]), '.')));
  }

  // 4. readiness
  const r = readiness(it, d);
  const C = 2 * Math.PI * 30;
  const ring = h('div', { html: `<svg class="ring" viewBox="0 0 74 74" aria-hidden="true"><circle class="bg" cx="37" cy="37" r="30"/><circle class="fg" cx="37" cy="37" r="30" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r.pct / 100)}"/><text x="37" y="37">${r.pct}%</text></svg>` });
  const next = r.stages.find((s) => s.ok < 1);
  const nextAct = next?.key === 'experience' ? ['Request a discovery call to see it working', 'discovery'] : next?.key === 'define' ? ['Ask for a standard proposal with scope', 'standard'] : next?.key === 'adopt' ? ['Agree a baseline in a discovery call', 'discovery'] : ['Request a discovery call', 'discovery'];
  add(
    'journey',
    'Readiness',
    section(
      'journey',
      'Outcome Network',
      'Where this stands in your journey',
      null,
      h('div', { class: 'readiness' }, ring, h('div', null, h('b', null, r.pct >= 70 ? 'Ready to explore and define' : r.pct >= 45 ? 'Ready to explore' : 'Early: ask before you plan'), h('p', { class: 'muted small', style: { margin: 0 } }, 'Scored only from what this listing has published at each step.'))),
      h(
        'div',
        { class: 'path6' },
        r.stages.map((s, i) => h('div', { class: 'p6' + (s.ok === 1 ? ' on' : s.ok > 0 ? ' part' : '') }, h('div', { class: 'hx' }, String(i + 1)), h('h4', null, s.name), h('span', { class: 'prog' }, s.prog), h('p', null, s.text), h('span', { class: 'st' }, s.ok === 1 ? 'Ready' : s.ok > 0 ? 'Partly ready' : 'Not published yet'))),
      ),
      h('div', { class: 'next-step' }, h('span', null, h('b', null, 'Suggested next step: '), nextAct[0], '.'), h('button', { class: 'btn primary sm', type: 'button', onclick: () => requestDialog(it, nextAct[1]) }, nextAct[0].split(' to ')[0].replace(/^Ask for/, 'Request'))),
    ),
  );

  // 5. mission plan with AI
  const ctx = h('textarea', { placeholder: 'Optional: your context, e.g. “40 grocery stores in the UAE, pilot by Q2”', 'aria-label': 'Your context (optional)', maxlength: 400 });
  const out = h('div', { class: 'planout', 'aria-live': 'polite' });
  const draft = h('button', { class: 'btn sm', type: 'button', style: { borderColor: 'var(--f-ai)', color: 'var(--f-ai)' } }, 'Draft my mission plan');
  draft.addEventListener('click', () => {
    const sections = buildPlan(it, d, ctx.value);
    const dl = h('button', { class: 'btn sm', type: 'button', onclick: () => downloadPlan(it, sections) }, 'Download (.md)');
    const save = h('button', { class: 'btn sm', type: 'button', onclick: () => (lists.stage(it.id, 'shortlisted'), toast('Plan noted in My journey')) }, 'Keep in My journey');
    out.replaceChildren(renderPlan(it, sections), h('div', { class: 'chips', style: { marginTop: '12px' } }, dl, save));
  });
  add(
    'plan',
    'Mission plan',
    section(
      'plan',
      'AI guidance',
      'Draft a mission plan with AI',
      'var(--f-ai)',
      h('div', { class: 'planbox' }, h('p', { class: 'muted small', style: { margin: 0 } }, 'Objective, what you need in place, how success is measured, and who does what from Explore to Adopt. Advisory only: built from this published listing.'), ctx, draft, out),
    ),
  );

  // 6. ways to buy
  if (d?.skus?.length) {
    const sample = d.skus.some((s) => s.sample);
    add(
      'buy',
      'Ways to buy',
      section(
        'buy',
        'Ways to buy',
        'Ways to buy',
        'var(--f-sku)',
        sample ? h('p', { class: 'honest' }, h('span', { class: 'tag-sample', title: 'Demonstration data: replace with partner data before any external showcase.' }, 'Sample'), h('span', null, h('b', null, 'Editions are illustrative. '), 'Pricing is shared as a private offer, never as an amount on Buzzar.')) : null,
        h(
          'div',
          { class: 'skus' },
          d.skus.map((s) =>
            h(
              'div',
              { class: 'sku' },
              h('div', null, h('h4', null, s.edition || s.name), h('code', null, s.code)),
              h(
                'dl',
                null,
                h('dt', null, 'Pricing model'),
                h('dd', null, label.model(s.model)),
                h('dt', null, 'Billing unit'),
                h('dd', null, label.unit(s.unit)),
                s.terms.length ? [h('dt', null, 'Term'), h('dd', null, s.terms.map(label.term).join(' or '))] : null,
                s.routes.length ? [h('dt', null, 'Buying route'), h('dd', null, s.routes.map(label.route).join(' · '))] : null,
              ),
              s.included.length ? h('ul', { class: 'ticks', style: { gridTemplateColumns: '1fr', fontSize: '0.84rem' } }, s.included.slice(0, 3).map((x) => h('li', null, x))) : null,
              h('div', { class: 'price' }, 'Price on private offer'),
              h('button', { class: 'btn sm', type: 'button', onclick: () => requestDialog(it, 'private-offer', `${s.edition || s.name} (${s.code})`) }, 'Request a private offer'),
            ),
          ),
        ),
      ),
    );
  }

  // 8. long content
  if (d?.overview || d?.outcome)
    add(
      'overview',
      'Overview',
      section('overview', KIND[it.y].label, 'Overview', `var(--f-${it.y === 'accelerator' ? 'accel' : it.y})`, h('p', { class: 'outcome', style: { '--kc': `var(--f-${it.y === 'accelerator' ? 'accel' : it.y})` } }, d.outcome || it.s), d.overview ? h('p', { class: 'muted' }, d.overview) : null, d.kpi ? h('div', { class: 'kpi' }, h('span', { class: 'hexdot', 'aria-hidden': 'true' }), h('div', null, h('b', null, 'Main measure of value'), h('span', null, d.kpi[0].toUpperCase() + d.kpi.slice(1)))) : null),
    );

  if (d?.delivery) {
    const dv = d.delivery;
    add(
      'delivery',
      'How it is delivered',
      section(
        'delivery',
        'Service',
        'How this service is delivered',
        'var(--f-service)',
        dv.sample ? h('p', { class: 'honest' }, h('span', { class: 'tag-sample', title: 'Demonstration data' }, 'Sample'), h('span', null, 'Sample delivery details. Pricing is shown as a type only; amounts are not listed.')) : null,
        h(
          'dl',
          { class: 'delivery' },
          dv.model ? h('div', null, h('dt', null, 'Engagement model'), h('dd', null, ENGAGE[dv.model] || nice(dv.model))) : null,
          dv.weeks ? h('div', null, h('dt', null, 'Duration'), h('dd', null, `${dv.weeks[0]}–${dv.weeks[1]} weeks`)) : it.db ? h('div', null, h('dt', null, 'Duration'), h('dd', null, it.db)) : null,
          dv.method?.length ? h('div', null, h('dt', null, 'Delivery method'), h('dd', null, dv.method.map(nice).join(', '))) : null,
          dv.pricing ? h('div', null, h('dt', null, 'Pricing model'), h('dd', null, PRICING[dv.pricing] || nice(dv.pricing))) : null,
        ),
        dv.prerequisites?.length ? h('div', { style: { marginTop: '14px' } }, h('b', { class: 'small' }, 'What you provide'), h('ul', { class: 'ticks', style: { marginTop: '8px' } }, dv.prerequisites.map((p) => h('li', null, p)))) : null,
      ),
    );
  }

  if (d?.scope) {
    const steps = scopeSteps(d.scope);
    const meta = scopeMeta(d.scope);
    add('scope', 'Scope of work', section('scope', 'Delivery', 'Scope of work', null, meta.length ? h('div', { class: 'scope-meta' }, meta.map(([k, v]) => h('p', { style: { margin: '0 0 6px' } }, h('b', null, k + ': '), v))) : null, steps.length ? h('ol', { class: 'scope' }, steps.map((s) => h('li', null, s))) : h('p', { class: 'muted' }, d.scope)));
  }

  if (d?.deliverables?.length) add('deliverables', 'Key deliverables', section('deliverables', 'Delivery', 'Key deliverables', null, h('ul', { class: 'ticks' }, d.deliverables.map((x) => h('li', null, x)))));
  if (d?.effort) add('effort', 'Estimated effort', section('effort', 'Delivery', 'Estimated effort', null, h('p', null, d.effort)));

  if (d?.benefits?.length)
    add(
      'benefits',
      'Benefits',
      section(
        'benefits',
        'Provider and trust',
        'Benefits, with their limits',
        'var(--f-trust)',
        h('p', { class: 'honest' }, h('span', { class: 'tag-estimate', title: 'An estimate is a hypothesis to validate against your own baseline.' }, 'Estimate'), h('span', null, 'Each benefit shows its basis and its limits. No uplift is promised until it is measured in your pilot.')),
        h('div', { class: 'benefits' }, d.benefits.map((b) => h('div', { class: 'benefit' }, h('h4', null, b.text), h('p', null, h('b', null, 'Source: '), b.source || 'Not stated'), b.limits ? h('p', null, h('b', null, 'Limits: '), b.limits.replace(/^Basis:\s*/i, 'Basis: ')) : null))),
      ),
    );

  if (d && (d.audience.length || d.orgSizes.length || d.maturity.length || it.i.length))
    add(
      'fit',
      'Who it is for',
      section(
        'fit',
        'Fit and discovery',
        'Who it is for',
        'var(--f-fit)',
        h(
          'dl',
          { class: 'delivery' },
          d.audience.length ? h('div', null, h('dt', null, 'Target roles'), h('dd', null, d.audience.join(', '))) : null,
          h('div', null, h('dt', null, 'Industries'), h('dd', null, it.i.map(industryLabel).join(', '))),
          d.orgSizes.length ? h('div', null, h('dt', null, 'Organisation size'), h('dd', null, d.orgSizes.map(label.size).join(', '))) : null,
          d.maturity.length ? h('div', null, h('dt', null, 'Maturity'), h('dd', null, d.maturity.map((m) => m[0].toUpperCase() + m.slice(1)).join(' → '))) : null,
        ),
      ),
    );

  if (it.pl.length || it.dm?.length) add('platforms', 'Platforms', section('platforms', 'Fit and discovery', 'Platforms', 'var(--f-fit)', h('div', { class: 'chips' }, [...it.pl, ...(it.dm || []).filter((x) => !it.pl.includes(x))].map((p) => h('span', { class: 'chip' }, p)))));

  if (d?.residency || d?.languages) add('data', 'Data and language', section('data', 'Fit and discovery', 'Data and language', 'var(--f-fit)', d.residency ? h('p', null, h('b', null, 'Data residency: '), d.residency) : null, d.languages ? h('p', null, h('b', null, 'Languages: '), [].concat(d.languages).join('; ')) : null));

  if (d?.notFor?.length) add('notfor', 'Not a fit when', section('notfor', 'Fit and discovery', 'Not a fit when', 'var(--f-fit)', h('div', { class: 'notfor' }, h('ul', null, d.notFor.map((n) => h('li', null, n.situation, n.why && !/outside the intended fit/i.test(n.why) ? h('span', null, ` — ${n.why}`) : null))))));

  const rel = [];
  for (const slug of d?.related || []) {
    const x = getBySlug(slug);
    if (x && x.id !== it.id && !rel.includes(x)) rel.push(x);
  }
  for (const x of all()) {
    if (rel.length >= 6) break;
    if (x.id !== it.id && !rel.includes(x) && x.c === it.c && x.sc.some((s) => it.sc.includes(s))) rel.push(x);
  }
  if (rel.length) add('related', 'Related listings', section('related', 'Fit and discovery', 'Related listings', 'var(--f-fit)', h('p', { class: 'muted small' }, 'Products, services and accelerators in the same practice.'), h('div', { class: 'grid' }, rel.slice(0, 3).map((x) => card(x)))));

  // 7. Work with Redington (sticky side) + section index
  const reqType = h('div', { class: 'req-opts', role: 'radiogroup', 'aria-label': 'Request type' }, REQUEST_TYPES.slice(0, 3).map((t, i) => h('label', { class: 'req-opt' }, h('input', { type: 'radio', name: 'side-type', value: t.key, checked: i === 0 }), h('div', null, h('b', null, t.label), h('span', null, t.hint)))));
  const side = h(
    'aside',
    { class: 'side' },
    h(
      'div',
      { class: 'panel' },
      h('h3', null, 'Work with Redington'),
      h('p', { class: 'muted small', style: { margin: 0 } }, 'Choose a request type. A specialist replies with next steps, and your request carries a CRM reference.'),
      reqType,
      h('button', { class: 'btn primary', style: { width: '100%', justifyContent: 'center' }, type: 'button', onclick: () => requestDialog(it, reqType.querySelector('input:checked').value) }, 'Continue'),
      h('a', { class: 'btn ghost sm', style: { width: '100%', justifyContent: 'center', marginTop: '6px' }, href: `#/advisor?q=${encodeURIComponent(`Tell me about ${it.t}`)}` }, d?.presales ? `Ask ${d.presales.team}` : 'Ask a Redington specialist'),
    ),
    toc.length > 2 ? h('nav', { class: 'panel toc', 'aria-label': 'On this page' }, h('p', { class: 'eyebrow', style: { marginBottom: '8px' } }, 'On this page'), toc.map(([id, name]) => h('a', { href: '#', 'data-to': 's-' + id }, name))) : null,
  );
  side.addEventListener('click', (e) => {
    const a = e.target.closest('[data-to]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) for (const a of side.querySelectorAll('[data-to]')) a.classList.toggle('on', a.dataset.to === e.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    requestAnimationFrame(() => main.querySelectorAll('section[id]').forEach((s) => io.observe(s)));
  }
  if (!d) main.prepend(h('p', { class: 'honest' }, 'Full details for this listing are not in this snapshot. The summary is shown; request a discovery call for the rest.'));

  return h('div', { class: 'wrap lbody' }, main, side);
}
