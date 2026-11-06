// Listing page — a compact header and five tabs instead of one long scroll.
// Content and order follow the UI & CX handover; layout follows the design skill.
import { h, toast, img, catImg, lists } from '../ui.js';
import { getBySlug, get, detail, TYPE, catLabel, industryLabel, label, readiness, all, plain } from '../data.js';
import { card, requestDialog, REQUEST_TYPES, KIND, kindTag, providerLine } from '../components.js';
import { buildPlan, renderPlan, downloadPlan, scopeSteps, scopeMeta } from '../plan.js';

const DATE = (s) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ENGAGE = { time_and_materials: 'Time and materials', managed_retainer: 'Managed or retainer', fixed_scope_project: 'Fixed scope project', assessment: 'Assessment', workshop: 'Workshop' };
const PRICING = { day_rate: 'Day rate', fixed_price: 'Fixed price', monthly_fee: 'Monthly fee', per_user_per_month: 'Per user per month', outcome_based: 'Outcome based', no_charge: 'No charge' };
const nice = (s) => (s ? plain(String(s).replace(/_/g, ' ')).replace(/^./, (c) => c.toUpperCase()) : '');
const TABS = [
  ['overview', 'Overview'],
  ['fit', 'Who it fits'],
  ['delivery', 'Delivery'],
  ['buy', 'Ways to buy'],
  ['ready', 'Readiness and plan'],
];

export default async function listing(route) {
  const it = getBySlug(route.args[0] || '');
  if (!it) {
    return h('section', { class: 'wrap nf' }, h('div', null, h('h1', { class: 'heading-3' }, 'This listing is not in the catalogue.'), h('p', { class: 'muted' }, 'It may have been retired or renamed.'), h('a', { class: 'btn primary', href: '#/catalogue' }, 'Search the catalogue')));
  }
  const d = await detail(it.id);
  if (!lists.get('journey')[it.id]) lists.stage(it.id, 'exploring');
  let tab = TABS.some(([k]) => k === route.params.get('tab')) ? route.params.get('tab') : 'overview';

  // ---------- header ----------
  const toggle = (kind) => {
    const b = h('button', { class: 'btn', type: 'button', 'data-act': kind === 'saved' ? 'save' : 'compare', 'data-id': it.id, 'aria-pressed': String(lists.has(kind, it.id)) }, h('i', { class: `ph ${kind === 'saved' ? 'ph-heart' : 'ph-scales'}`, 'aria-hidden': 'true' }), kind === 'saved' ? 'Save' : 'Compare');
    b.addEventListener('click', () => {
      const r = lists.toggle(kind, it.id, kind === 'compare' ? 3 : 0);
      if (r.full) return toast('Compare holds three listings. Remove one first.');
      toast(r.on ? (kind === 'saved' ? 'Saved' : 'Added to compare') : kind === 'saved' ? 'Removed from saved' : 'Removed from compare');
    });
    return b;
  };
  const copy = h('button', { class: 'btn', type: 'button', 'aria-label': 'Copy link' }, h('i', { class: 'ph ph-link', 'aria-hidden': 'true' }));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    } catch {
      toast('Copy the address from your browser bar');
    }
  });
  const head = h(
    'section',
    { class: 'lhero' },
    h(
      'div',
      { class: 'wrap' },
      h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: `#/catalogue?type=${it.y}` }, TYPE[it.y].plural), h('span', { 'aria-hidden': 'true' }, '/'), h('a', { href: `#/catalogue?type=${it.y}&cat=${it.c}` }, catLabel(it.c)), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, it.t)),
      h(
        'div',
        { class: 'lhead' },
        h(
          'div',
          null,
          h('div', { class: 'chips', style: { alignItems: 'center', gap: '8px' } }, kindTag(it.y), h('span', { class: 'chip' }, catLabel(it.c)), it._subs[0] ? h('span', { class: 'chip' }, it._subs[0]) : null, h('span', { class: 'chip' }, `Version ${d?.version || it.v || 1}`), it.aws ? h('span', { class: 'badge-sku' }, h('i', { class: 'ph ph-shopping-bag', 'aria-hidden': 'true' }), 'Buyable on AWS Marketplace') : null),
          h('h1', { class: 'grad-text' }, it.t),
          h('p', { class: 'by' }, providerLine(it)),
          h('span', { class: 'review-badge', title: 'Only listings approved by a Buzzar checker are published. A freshness review rechecks claims on a schedule.' }, h('i', { class: 'ph ph-seal-check', 'aria-hidden': 'true' }), h('span', null, h('b', null, 'Approved for publication'), it.rd ? ` · freshness review ${DATE(it.rd)}` : '')),
        ),
        h('div', { class: 'acts' }, toggle('compare'), toggle('saved'), copy, h('button', { class: 'btn dark', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Request a discovery call')),
      ),
    ),
  );

  // ---------- tabs ----------
  const panelEl = h('div', { class: 'lpanel', role: 'tabpanel' });
  const tabsEl = h('div', { class: 'ltabs', role: 'tablist', 'aria-label': 'Listing sections' });
  const paintTabs = () =>
    tabsEl.replaceChildren(
      ...TABS.map(([k, l]) => {
        const b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === k), id: 'tab-' + k }, l);
        b.addEventListener('click', () => select(k));
        return b;
      }),
    );
  function select(k) {
    tab = k;
    paintTabs();
    const p = new URLSearchParams(location.hash.split('?')[1] || '');
    p.set('tab', k);
    history.replaceState(null, '', `#/listing/${it.slug}?${p}`);
    panelEl.setAttribute('aria-labelledby', 'tab-' + k);
    panelEl.replaceChildren(...PANELS[k]());
    panelEl.style.animation = 'none';
    void panelEl.offsetWidth;
    panelEl.style.animation = '';
  }
  tabsEl.addEventListener('keydown', (e) => {
    const i = TABS.findIndex(([k]) => k === tab);
    if (e.key === 'ArrowRight') select(TABS[(i + 1) % TABS.length][0]);
    if (e.key === 'ArrowLeft') select(TABS[(i + TABS.length - 1) % TABS.length][0]);
  });

  const block = (title, ...kids) => h('section', null, title ? h('h3', null, title) : null, ...kids);
  const kv = (rows) => h('dl', { class: 'kv' }, rows.filter(Boolean).map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))));

  const PANELS = {
    overview: () => [
      it.tw?.length ? h('p', { class: 'twin' }, 'Also on Buzzar: ', it.tw.map(get).filter(Boolean).map((t, i) => [i ? ', ' : '', h('a', { class: 'textlink', href: `#/listing/${t.slug}` }, `this as a ${KIND[t.y].label.toLowerCase()}`), ` from ${t.p}`]), '.') : null,
      h('p', { class: 'outcome' }, d?.outcome || it.s),
      d?.overview ? h('p', { class: 'body-3 muted', style: { margin: 0, maxWidth: '760px' } }, d.overview) : null,
      d?.kpi ? h('div', { class: 'pcard' }, h('p', { class: 'caption-4', style: { marginBottom: '4px' } }, 'Main measure of value'), h('p', { class: 'title-2' }, d.kpi[0].toUpperCase() + d.kpi.slice(1))) : null,
      d?.benefits?.length
        ? block(
            'Benefits, with their limits',
            h('p', { class: 'honest', style: { marginBottom: '8px' } }, h('span', { class: 'tag-estimate', title: 'An estimate is a hypothesis to validate against your own baseline.' }, 'Estimate'), h('span', null, 'Each benefit shows its basis and its limits. No uplift is promised until your pilot measures it.')),
            h('div', { class: 'benefits2' }, d.benefits.map((b) => h('div', null, h('b', null, b.text), h('p', null, b.source || 'Source not stated'), b.limits ? h('p', null, b.limits) : null))),
          )
        : null,
    ],
    fit: () => {
      const rel = [];
      for (const s of d?.related || []) {
        const x = getBySlug(s);
        if (x && x.id !== it.id && !rel.includes(x)) rel.push(x);
      }
      for (const x of all()) {
        if (rel.length >= 3) break;
        if (x.id !== it.id && !rel.includes(x) && x.c === it.c && x.sc.some((s) => it.sc.includes(s))) rel.push(x);
      }
      return [
        block(
          'Who it is for',
          kv([
            d?.audience?.length && ['Target roles', d.audience.join(', ')],
            ['Industries', it.i.map(industryLabel).join(', ')],
            d?.orgSizes?.length && ['Organisation size', d.orgSizes.map(label.size).join(', ')],
            d?.maturity?.length && ['Maturity', d.maturity.map((m) => m[0].toUpperCase() + m.slice(1)).join(', ')],
            (it.pl.length || it.dm?.length) && ['Platforms', [...it.pl, ...(it.dm || []).filter((x) => !it.pl.includes(x))].map(plain).join(', ')],
            it.r.length && ['Regions', it.r.join(', ')],
            d?.residency && ['Data residency', d.residency],
            d?.languages && ['Languages', [].concat(d.languages).join('; ')],
          ]),
        ),
        d?.notFor?.length ? block('Not a fit when', h('ul', { class: 'notfor2' }, d.notFor.map((n) => h('li', null, h('i', { class: 'ph ph-minus-circle', 'aria-hidden': 'true' }), h('span', null, n.situation, n.why && !/outside the intended fit/i.test(n.why) ? h('span', { class: 'muted' }, `. ${n.why[0].toUpperCase() + n.why.slice(1)}`) : null))))) : null,
        rel.length ? block('Related listings', h('div', { class: 'grid' }, rel.slice(0, 3).map((x) => card(x)))) : null,
      ];
    },
    delivery: () => {
      const out = [];
      const dv = d?.delivery;
      if (dv)
        out.push(
          block(
            'How this service is delivered',
            dv.sample ? h('p', { class: 'honest', style: { marginBottom: '8px' } }, h('span', { class: 'tag-sample' }, 'Sample'), h('span', null, 'Sample delivery details. Pricing is shown as a type only; amounts are not listed.')) : null,
            kv([dv.model && ['Engagement model', ENGAGE[dv.model] || nice(dv.model)], (dv.weeks || it.db) && ['Duration', dv.weeks ? `${dv.weeks[0]} to ${dv.weeks[1]} weeks` : it.db], dv.method?.length && ['Delivery method', dv.method.map(nice).join(', ')], dv.pricing && ['Pricing model', PRICING[dv.pricing] || nice(dv.pricing)]]),
            dv.prerequisites?.length ? h('ul', { class: 'notfor2', style: { marginTop: '8px' } }, dv.prerequisites.map((p) => h('li', null, h('i', { class: 'ph ph-check-circle', 'aria-hidden': 'true' }), h('span', null, `You provide: ${p[0].toLowerCase() + p.slice(1)}`)))) : null,
          ),
        );
      if (d?.scope) {
        const steps = scopeSteps(d.scope);
        const meta = scopeMeta(d.scope);
        out.push(block('Scope of work', meta.length ? kv(meta.slice(0, 4).map(([k, v]) => [k, v[0].toUpperCase() + v.slice(1)])) : null, steps.length ? h('ol', { class: 'steps2', style: { marginTop: meta.length ? '8px' : 0 } }, steps.map((s) => h('li', null, h('span', null, s)))) : h('p', { class: 'body-6' }, d.scope)));
      }
      if (d?.deliverables?.length) out.push(block('Key deliverables', h('ul', { class: 'notfor2' }, d.deliverables.map((x) => h('li', null, h('i', { class: 'ph ph-check-circle', 'aria-hidden': 'true' }), h('span', null, x))))));
      if (d?.effort) out.push(block('Estimated effort', h('div', { class: 'pcard' }, h('p', { class: 'body-6' }, d.effort))));
      return out.length ? out : [h('div', { class: 'empty' }, h('p', null, 'Delivery details are not published yet. A discovery call will cover them.'))];
    },
    buy: () =>
      d?.skus?.length
        ? [
            d.skus.some((s) => s.sample) ? h('p', { class: 'honest' }, h('span', { class: 'tag-sample', title: 'Demonstration data' }, 'Sample'), h('span', null, h('b', null, 'Editions are illustrative. '), 'Prices are shared as a private offer, never as an amount on Buzzar.')) : null,
            h(
              'div',
              { class: 'skus2' },
              d.skus.map((s) =>
                h(
                  'div',
                  { class: 'sku2' },
                  h('div', null, h('h4', null, s.edition || s.name), h('code', null, s.code)),
                  h('dl', null, h('dt', null, 'Pricing'), h('dd', null, label.model(s.model)), h('dt', null, 'Billing'), h('dd', null, label.unit(s.unit)), s.terms.length ? [h('dt', null, 'Term'), h('dd', null, s.terms.map(label.term).join(' or '))] : null, s.routes.length ? [h('dt', null, 'Route'), h('dd', null, s.routes.map(label.route).join(', '))] : null),
                  h('p', { class: 'price' }, 'Price on private offer'),
                  h('button', { class: 'btn', type: 'button', onclick: () => requestDialog(it, 'private-offer', `${s.edition || s.name} (${s.code})`) }, 'Request a private offer'),
                ),
              ),
            ),
          ]
        : [h('div', { class: 'empty' }, h('p', null, 'Ways to buy are agreed in a proposal for this listing.'), h('button', { class: 'btn primary', type: 'button', onclick: () => requestDialog(it, 'standard') }, 'Request a standard proposal'))],
    ready: () => {
      const r = readiness(it, d);
      const next = r.stages.find((s) => s.ok < 1);
      const nextAct = next?.key === 'define' ? ['Request a standard proposal', 'standard'] : ['Request a discovery call', 'discovery'];
      const ctx = h('textarea', { placeholder: 'Optional context, for example: 40 grocery stores in the UAE, pilot by June', 'aria-label': 'Your context (optional)', maxlength: 400 });
      const out = h('div', { 'aria-live': 'polite' });
      const draft = h('button', { class: 'btn dark', type: 'button' }, h('i', { class: 'ph ph-sparkle', 'aria-hidden': 'true' }), 'Draft my mission plan');
      draft.addEventListener('click', () => {
        const sections = buildPlan(it, d, ctx.value);
        out.replaceChildren(renderPlan(it, sections), h('div', { class: 'chips', style: { marginTop: '12px', gap: '8px' } }, h('button', { class: 'btn', type: 'button', onclick: () => downloadPlan(it, sections) }, h('i', { class: 'ph ph-download-simple', 'aria-hidden': 'true' }), 'Download'), h('button', { class: 'btn', type: 'button', onclick: () => (lists.stage(it.id, 'shortlisted'), toast('Added to My journey as shortlisted')) }, 'Keep in My journey')));
      });
      return [
        h('div', { class: 'ready-sum' }, h('div', null, h('b', null, `${r.pct}%`), h('span', { class: 'caption-2', style: { marginLeft: '8px' } }, r.pct >= 70 ? 'Ready to explore and define' : r.pct >= 45 ? 'Ready to explore' : 'Early: ask before you plan')), next ? h('button', { class: 'btn', type: 'button', onclick: () => requestDialog(it, nextAct[1]) }, `Next step: ${nextAct[0].toLowerCase()}`) : null),
        h('div', { class: 'ready', role: 'list', 'aria-label': 'Outcome Network readiness' }, r.stages.map((s, i) => h('div', { class: s.ok === 1 ? 'on' : s.ok > 0 ? 'part' : '', role: 'listitem' }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('b', null, s.name), h('small', null, s.prog), h('small', null, s.text), h('span', { class: 'st' }, s.ok === 1 ? 'Ready' : s.ok > 0 ? 'Partly ready' : 'Not published yet')))),
        block('Draft a mission plan with AI', h('div', { class: 'planbox2' }, h('p', { class: 'body-6 muted', style: { margin: 0 } }, 'Objective, what you need in place, how success is measured, and who does what. Advisory only, built from this published listing.'), ctx, h('div', null, draft), out)),
      ];
    },
  };

  // ---------- side: work with Redington ----------
  const reqType = h('div', { class: 'req-opts', role: 'radiogroup', 'aria-label': 'Request type' }, REQUEST_TYPES.slice(0, 3).map((t, i) => h('label', { class: 'req-opt' }, h('input', { type: 'radio', name: 'side-type', value: t.key, checked: i === 0 }), h('div', null, h('b', null, t.label), h('span', null, t.hint)))));
  const side = h(
    'aside',
    { class: 'side2' },
    h('figure', null, img(catImg(it.c), '', { width: 150, height: 150, loading: 'eager' })),
    h(
      'div',
      { class: 'box' },
      h('h3', null, 'Work with Redington'),
      h('p', { class: 'body-6 muted', style: { margin: 0 } }, 'A specialist replies with next steps. Every request carries a CRM reference.'),
      reqType,
      h('button', { class: 'btn primary', type: 'button', onclick: () => requestDialog(it, reqType.querySelector('input:checked').value) }, 'Continue'),
      h('a', { class: 'btn ghost', href: `#/advisor?q=${encodeURIComponent(`Tell me about ${it.t}`)}` }, h('i', { class: 'ph ph-chats-circle', 'aria-hidden': 'true' }), d?.presales ? `Ask ${d.presales.team}` : 'Ask a Redington specialist'),
    ),
  );

  paintTabs();
  panelEl.replaceChildren(...PANELS[tab]());
  return h('div', null, head, h('div', { class: 'wrap' }, tabsEl, h('div', { class: 'lgrid' }, panelEl, side)));
}
