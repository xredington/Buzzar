// Product page — a product sheet. The top screen answers "what is it, who makes it, how do I buy it":
// key facts on the left, a buy box with every edition on the right. Tabs hold the rest, so nothing
// needed is omitted and nothing forces a long scroll: Overview, Features, Pricing, Delivery, Fit, Readiness.
import { h, toast, img, catImg, itemImg, lists, coin } from '../ui.js?v=202611090654';
import { getBySlug, get, detail, TYPE, catLabel, industryLabel, label, readiness, all, plain } from '../data.js?v=202611090654';
import { card, requestDialog, KIND, kindTag, providerLine } from '../components.js?v=202611090654';
import { buildPlan, renderPlan, downloadPlan, scopeSteps, scopeMeta, prerequisites } from '../plan.js?v=202611090654';

const DATE = (s) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const ENGAGE = { time_and_materials: 'Time and materials', managed_retainer: 'Managed or retainer', fixed_scope_project: 'Fixed scope project', assessment: 'Assessment', workshop: 'Workshop' };
const PRICING = { day_rate: 'Day rate', fixed_price: 'Fixed price', monthly_fee: 'Monthly fee', per_user_per_month: 'Per user per month', outcome_based: 'Outcome based', no_charge: 'No charge' };
const ROUTE_ICON = { aws_marketplace_private_offer: 'ph-shopping-bag', redington_resale: 'ph-storefront', redington_service: 'ph-handshake' };
const nice = (s) => (s ? plain(String(s).replace(/_/g, ' ')).replace(/^./, (c) => c.toUpperCase()) : '');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const TABS = [
  ['overview', 'Overview'],
  ['features', 'Features'],
  ['pricing', 'Pricing'],
  ['delivery', 'Delivery'],
  ['fit', 'Who it fits'],
  ['ready', 'Readiness'],
];

function readMore(text, lines = 3) {
  const p = h('p', { class: 'body-3 muted clamp3', style: { margin: 0, maxWidth: '760px', WebkitLineClamp: String(lines) } }, text);
  const b = h('button', { type: 'button', class: 'linkbtn' }, 'Read more');
  b.addEventListener('click', () => {
    const open = p.classList.toggle('clamp3');
    b.textContent = open ? 'Read more' : 'Show less';
  });
  return h('div', null, p, b);
}

export default async function listing(route) {
  const it = getBySlug(route.args[0] || '');
  if (!it) return h('section', { class: 'wrap nf' }, h('div', null, h('h1', { class: 'heading-3' }, 'This listing is not in the catalogue.'), h('p', { class: 'muted' }, 'It may have been retired or renamed.'), h('a', { class: 'btn primary', href: '#/catalogue' }, 'Search the catalogue')));
  const d = await detail(it.id);
  if (!lists.get('journey')[it.id]) lists.stage(it.id, 'exploring');
  const skus = d?.skus || [];
  let tab = TABS.some(([k]) => k === route.params.get('tab')) ? route.params.get('tab') : 'overview';
  let sel = 0;
  const rd = readiness(it, d);

  // ---------- top screen: facts (left) and buy box (right) ----------
  const duration = d?.delivery?.weeks ? `${d.delivery.weeks[0]} to ${d.delivery.weeks[1]} weeks` : it.db || (d?.effort ? d.effort.split(/[;.]/)[0] : null);
  const facts = [
    ['ph-squares-four', 'Category', `${catLabel(it.c)}${it._subs[0] ? ' · ' + it._subs[0] : ''}`],
    ['ph-buildings', 'Industries', it.i.map(industryLabel).join(', ')],
    ['ph-cloud', 'Runs on', [...it.pl, ...(it.dm || []).filter((x) => !it.pl.includes(x))].map(plain).join(', ') || 'Not specified'],
    ['ph-globe-hemisphere-east', 'Regions', it.r.join(', ') || 'Not specified'],
    duration ? ['ph-timer', it.y === 'service' ? 'Duration' : 'Time to value', cap(duration).replace(/(\d)\s*-\s*(\d)/g, '$1 to $2')] : null,
    ['ph-gauge', 'Readiness', `${rd.pct}% published`],
  ].filter(Boolean);

  const toggle = (kind) => {
    const b = h('button', { class: 'btn', type: 'button', 'data-act': kind === 'saved' ? 'save' : 'compare', 'data-id': it.id, 'aria-pressed': String(lists.has(kind, it.id)), 'aria-label': kind === 'saved' ? 'Save' : 'Compare', title: kind === 'saved' ? 'Save' : 'Compare' }, h('i', { class: `ph ${kind === 'saved' ? 'ph-heart' : 'ph-scales'}`, 'aria-hidden': 'true' }));
    b.addEventListener('click', () => {
      const r = lists.toggle(kind, it.id, kind === 'compare' ? 3 : 0);
      if (r.full) return toast('Compare holds three listings. Remove one first.');
      toast(r.on ? (kind === 'saved' ? 'Saved' : 'Added to compare') : kind === 'saved' ? 'Removed from saved' : 'Removed from compare');
    });
    return b;
  };
  const copy = h('button', { class: 'btn', type: 'button', 'aria-label': 'Copy link', title: 'Copy link' }, h('i', { class: 'ph ph-link', 'aria-hidden': 'true' }));
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    } catch {
      toast('Copy the address from your browser bar');
    }
  });

  // buy box
  const buy = h('aside', { class: 'buybox', 'aria-label': 'Ways to buy' });
  function paintBuy() {
    if (!skus.length) {
      buy.replaceChildren(h('p', { class: 'bb-label' }, 'Ways to buy'), h('p', { class: 'body-6 muted' }, 'Editions and pricing are agreed in a proposal for this listing.'), h('button', { class: 'btn primary lg wide', type: 'button', onclick: () => requestDialog(it, 'standard') }, 'Request a proposal'), h('button', { class: 'btn lg wide', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Book a discovery call'), h('div', { class: 'bb-tools' }, toggle('compare'), toggle('saved'), copy));
      return;
    }
    const s = skus[sel];
    buy.replaceChildren(
      h('div', { class: 'bb-head' }, h('p', { class: 'bb-label' }, `Choose an edition · ${skus.length}`), s.sample ? h('span', { class: 'tag-sample', title: 'Illustrative editions until partner data replaces them.' }, 'Sample') : null),
      h(
        'div',
        { class: 'editions', role: 'radiogroup', 'aria-label': 'Edition' },
        skus.map((x, i) => {
          const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(i === sel), class: 'edition' }, h('span', { class: 'radio', 'aria-hidden': 'true' }), h('span', null, h('b', null, x.edition || x.name), h('small', null, `${label.model(x.model)} · ${label.unit(x.unit).toLowerCase()}`)), h('code', null, x.code));
          b.addEventListener('click', () => ((sel = i), paintBuy()));
          return b;
        }),
      ),
      h(
        'dl',
        { class: 'bb-dl' },
        h('div', null, h('dt', null, 'Pricing model'), h('dd', null, label.model(s.model))),
        h('div', null, h('dt', null, 'Billed'), h('dd', null, label.unit(s.unit))),
        h('div', null, h('dt', null, 'Term'), h('dd', null, s.terms.map(label.term).join(' or ') || 'In the offer')),
      ),
      s.routes.length ? h('div', { class: 'routes' }, s.routes.map((r) => h('span', null, h('i', { class: `ph ${ROUTE_ICON[r] || 'ph-shopping-cart'}`, 'aria-hidden': 'true' }), label.route(r)))) : null,
      s.included.length ? h('ul', { class: 'bb-inc' }, s.included.slice(0, 2).map((x) => h('li', null, h('i', { class: 'ph ph-check', 'aria-hidden': 'true' }), plain(x)))) : null,
      h('div', { class: 'bb-price' }, h('span', null, 'Price'), h('b', null, 'Private offer'), h('small', null, 'Shared by Redington, never shown as an amount')),
      h('button', { class: 'btn primary lg wide', type: 'button', onclick: () => requestDialog(it, 'private-offer', `${s.edition || s.name} (${s.code})`) }, `Request a private offer`),
      h('button', { class: 'btn lg wide', type: 'button', onclick: () => requestDialog(it, 'discovery') }, 'Book a discovery call'),
      h('div', { class: 'bb-tools' }, toggle('compare'), toggle('saved'), copy, h('a', { class: 'btn', href: `#/advisor?q=${encodeURIComponent('Tell me about ' + it.t)}`, title: 'Ask Sami', 'aria-label': 'Ask Sami about this' }, h('i', { class: 'ph ph-chats-circle', 'aria-hidden': 'true' }))),
    );
  }
  paintBuy();

  const head = h(
    'section',
    { class: 'wrap sheet-top' },
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: `#/catalogue?type=${it.y}` }, TYPE[it.y].plural), h('span', { 'aria-hidden': 'true' }, '/'), h('a', { href: `#/catalogue?type=${it.y}&cat=${it.c}` }, catLabel(it.c)), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, it.t)),
    h(
      'div',
      { class: 'sheet-grid' },
      h(
        'div',
        { class: 'sheet-main' },
        h(
          'div',
          { class: 'sheet-id' },
          h('figure', { class: 'sheet-img' }, img(itemImg(it), '', { width: 120, height: 120, loading: 'eager' })),
          h(
            'div',
            null,
            h('div', { class: 'chips', style: { alignItems: 'center', gap: '8px' } }, kindTag(it.y), h('span', { class: 'chip' }, `Version ${d?.version || it.v || 1}`), it.aws ? h('span', { class: 'badge-sku' }, h('i', { class: 'ph ph-shopping-bag', 'aria-hidden': 'true' }), 'Buyable on AWS Marketplace') : null),
            h('h1', { class: 'grad-text' }, it.t),
            h('p', { class: 'by withcoin' }, coin(it.p, 24), h('span', null, providerLine(it))),
          ),
        ),
        h('p', { class: 'sheet-outcome' }, d?.outcome || it.s),
        h('dl', { class: 'facts6' }, facts.map(([ic, k, v]) => h('div', null, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' }), h('dt', null, k), h('dd', null, v)))),
        h('span', { class: 'review-badge', title: 'Only listings approved by a Buzzar checker are published. A freshness review rechecks claims on a schedule.' }, h('i', { class: 'ph ph-seal-check', 'aria-hidden': 'true' }), h('span', null, h('b', null, 'Approved for publication'), it.rd ? ` · freshness review ${DATE(it.rd)}` : '')),
      ),
      buy,
    ),
  );

  // ---------- tabs ----------
  const panelEl = h('div', { class: 'lpanel', role: 'tabpanel' });
  const tabsEl = h('div', { class: 'ltabs', role: 'tablist', 'aria-label': 'Product sections' });
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
    panelEl.replaceChildren(...PANELS[k]().filter(Boolean));
    panelEl.style.animation = 'none';
    void panelEl.offsetWidth;
    panelEl.style.animation = '';
    const top = tabsEl.getBoundingClientRect().top;
    if (top < 80 || top > innerHeight * 0.6) window.scrollTo({ top: scrollY + top - 92, behavior: 'smooth' });
  }
  tabsEl.addEventListener('keydown', (e) => {
    const i = TABS.findIndex(([k]) => k === tab);
    if (e.key === 'ArrowRight') select(TABS[(i + 1) % TABS.length][0]);
    if (e.key === 'ArrowLeft') select(TABS[(i + TABS.length - 1) % TABS.length][0]);
  });
  const block = (title, ...kids) => h('section', null, title ? h('h3', null, title) : null, ...kids);
  const kv = (rows) => h('dl', { class: 'kv' }, rows.filter(Boolean).map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))));
  const checks = (rows, icon = 'ph-check-circle') => h('ul', { class: 'checks' }, rows.map((x) => h('li', null, h('i', { class: `ph ${icon}`, 'aria-hidden': 'true' }), h('span', null, cap(plain(x))))));

  // the union of everything any edition includes, for the comparison matrix
  const incRows = [...new Set(skus.flatMap((s) => s.included.map(plain)))];

  const PANELS = {
    overview: () => [
      it.tw?.length ? h('p', { class: 'twin' }, 'Also on Buzzar: ', it.tw.map(get).filter(Boolean).map((t, i) => [i ? ', ' : '', h('a', { class: 'textlink', href: `#/listing/${t.slug}` }, `this as a ${KIND[t.y].label.toLowerCase()}`), ` from ${t.p}`]), '.') : null,
      d?.overview ? block('The problem and the fix', readMore(d.overview)) : null,
      d?.kpi ? h('div', { class: 'kpi2' }, h('i', { class: 'ph ph-target', 'aria-hidden': 'true' }), h('div', null, h('small', null, 'How value is measured'), h('b', null, cap(d.kpi)))) : null,
      d?.benefits?.length
        ? block(
            h('span', null, 'Benefits ', h('span', { class: 'tag-estimate', title: 'Estimates until your own pilot measures them. No uplift is promised.' }, 'Estimates')),
            h('div', { class: 'benefits2' }, d.benefits.map((b) => h('div', null, h('i', { class: 'ph ph-trend-up', 'aria-hidden': 'true' }), h('b', null, cap(b.text)), h('p', null, b.limits || b.source || '')))),
          )
        : null,
    ],
    features: () => {
      const out = [];
      const feats = [...(d?.deliverables || []), ...scopeSteps(d?.scope).slice(0, d?.deliverables?.length ? 0 : 6)];
      if (feats.length) out.push(block(it.y === 'service' ? 'What the engagement covers' : 'What you get', checks(feats)));
      if (incRows.length && skus.length > 1)
        out.push(
          block(
            'Included by edition',
            h(
              'div',
              { class: 'matrix-wrap' },
              h(
                'table',
                { class: 'matrix' },
                h('thead', null, h('tr', null, h('th', null, ''), skus.map((s) => h('th', { scope: 'col' }, s.edition || s.name)))),
                h('tbody', null, incRows.map((row) => h('tr', null, h('th', { scope: 'row' }, cap(row)), skus.map((s) => h('td', null, s.included.map(plain).includes(row) ? h('i', { class: 'ph ph-check', 'aria-label': 'Included' }) : h('span', { class: 'dash', 'aria-label': 'Not included' }, '—')))))),
              ),
            ),
          ),
        );
      else if (incRows.length) out.push(block('Included', checks(incRows, 'ph-check')));
      if (d?.audience?.length) out.push(block('Built for', h('div', { class: 'chips', style: { gap: '8px' } }, d.audience.map((a) => h('span', { class: 'chip lg' }, h('i', { class: 'ph ph-user', 'aria-hidden': 'true' }), a)))));
      return out.length ? out : [h('div', { class: 'empty' }, h('p', null, 'Features are not published yet. A discovery call will cover them.'))];
    },
    pricing: () =>
      skus.length
        ? [
            h('div', { class: 'howbuy' }, [
              ['ph-list-checks', 'Choose an edition', 'Compare editions below.'],
              ['ph-paper-plane-tilt', 'Request a private offer', 'Redington replies with pricing for your scope.'],
              ['ph-shopping-bag', 'Buy your way', skus.some((s) => s.routes.includes('aws_marketplace_private_offer')) ? 'Through AWS Marketplace or Redington.' : 'Through Redington.'],
            ].map(([ic, t, dsc], i) => h('div', null, h('span', { class: 'hn num' }, String(i + 1)), h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' }), h('b', null, t), h('small', null, dsc)))),
            h(
              'div',
              { class: 'matrix-wrap' },
              h(
                'table',
                { class: 'matrix price' },
                h('thead', null, h('tr', null, h('th', null, h('span', { class: 'tag-sample', title: 'Illustrative editions until partner data replaces them.' }, 'Sample editions')), skus.map((s) => h('th', { scope: 'col' }, h('b', null, s.edition || s.name), h('small', { class: 'mono' }, s.code))))),
                h(
                  'tbody',
                  null,
                  [
                    ['Pricing model', (s) => label.model(s.model)],
                    ['Billed', (s) => label.unit(s.unit)],
                    ['Term', (s) => s.terms.map(label.term).join(' or ') || 'Agreed in the offer'],
                    ['Buying route', (s) => s.routes.map(label.route).join(', ')],
                    ['Price', () => h('b', null, 'Private offer')],
                  ].map(([k, fn]) => h('tr', null, h('th', { scope: 'row' }, k), skus.map((s) => h('td', null, fn(s))))),
                  h('tr', { class: 'ctarow' }, h('th', null, ''), skus.map((s) => h('td', null, h('button', { class: 'btn sm', type: 'button', onclick: () => requestDialog(it, 'private-offer', `${s.edition || s.name} (${s.code})`) }, 'Request offer')))),
                ),
              ),
            ),
            d?.delivery?.pricing ? h('p', { class: 'caption-2' }, `Service pricing model: ${PRICING[d.delivery.pricing] || nice(d.delivery.pricing)}. Amounts are never listed.`) : null,
          ]
        : [h('div', { class: 'empty' }, h('p', null, 'Pricing is agreed in a proposal for this listing.'), h('button', { class: 'btn primary', type: 'button', onclick: () => requestDialog(it, 'standard') }, 'Request a standard proposal'))],
    delivery: () => {
      const out = [];
      const dv = d?.delivery;
      if (dv)
        out.push(
          block(
            h('span', null, 'How this service is delivered ', dv.sample ? h('span', { class: 'tag-sample', title: 'Sample delivery details.' }, 'Sample') : null),
            kv([dv.model && ['Engagement model', ENGAGE[dv.model] || nice(dv.model)], (dv.weeks || it.db) && ['Duration', dv.weeks ? `${dv.weeks[0]} to ${dv.weeks[1]} weeks` : it.db], dv.method?.length && ['Delivery method', dv.method.map(nice).join(', ')], dv.pricing && ['Pricing model', PRICING[dv.pricing] || nice(dv.pricing)]]),
          ),
        );
      const pre = prerequisites(d);
      if (pre.length) out.push(block('What you provide', checks(pre, 'ph-arrow-circle-right')));
      if (d?.scope) {
        const steps = scopeSteps(d.scope);
        const meta = scopeMeta(d.scope).filter(([k]) => !/delivery model/i.test(k));
        out.push(block('Delivery plan', steps.length ? h('ol', { class: 'steps2' }, steps.map((s) => h('li', null, h('span', null, cap(s))))) : h('p', { class: 'body-6' }, d.scope), meta.length ? h('div', { style: { marginTop: '8px' } }, kv(meta.slice(0, 4).map(([k, v]) => [k, cap(v)]))) : null));
      }
      if (d?.effort) out.push(block('Estimated effort', h('div', { class: 'pcard' }, h('p', { class: 'body-6' }, d.effort))));
      return out.length ? out : [h('div', { class: 'empty' }, h('p', null, 'Delivery details are not published yet.'))];
    },
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
        kv([
          d?.audience?.length && ['Target roles', d.audience.join(', ')],
          ['Industries', it.i.map(industryLabel).join(', ')],
          d?.orgSizes?.length && ['Organisation size', d.orgSizes.map(label.size).join(', ')],
          d?.maturity?.length && ['Maturity', d.maturity.map(cap).join(', ')],
          d?.residency && ['Data residency', d.residency],
          d?.languages && ['Languages', [].concat(d.languages).join('; ')],
          d?.presales && ['Pre sales team', `${d.presales.team} · ${d.presales.practice}`],
        ]),
        d?.notFor?.length ? block('Not a fit when', h('ul', { class: 'checks neg' }, d.notFor.map((n) => h('li', null, h('i', { class: 'ph ph-minus-circle', 'aria-hidden': 'true' }), h('span', null, n.situation))))) : null,
        rel.length ? block('Related listings', h('div', { class: 'grid' }, rel.slice(0, 3).map((x) => card(x)))) : null,
      ];
    },
    ready: () => {
      const ctx = h('textarea', { placeholder: 'Optional context, for example: 40 stores in the UAE, pilot by June', 'aria-label': 'Your context (optional)', maxlength: 400 });
      const out = h('div', { 'aria-live': 'polite' });
      const draft = h('button', { class: 'btn dark', type: 'button' }, h('i', { class: 'ph ph-sparkle', 'aria-hidden': 'true' }), 'Draft my mission plan');
      draft.addEventListener('click', () => {
        const sections = buildPlan(it, d, ctx.value);
        out.replaceChildren(renderPlan(it, sections), h('div', { class: 'chips', style: { marginTop: '12px', gap: '8px' } }, h('button', { class: 'btn', type: 'button', onclick: () => downloadPlan(it, sections) }, h('i', { class: 'ph ph-download-simple', 'aria-hidden': 'true' }), 'Download')));
      });
      return [
        h('div', { class: 'ready-sum' }, h('div', null, h('b', null, `${rd.pct}%`), h('span', { class: 'caption-2', style: { marginLeft: '8px' } }, rd.pct >= 70 ? 'Ready to explore and define' : rd.pct >= 45 ? 'Ready to explore' : 'Early: ask before you plan'))),
        h('div', { class: 'ready', role: 'list' }, rd.stages.map((s, i) => h('div', { class: s.ok === 1 ? 'on' : s.ok > 0 ? 'part' : '', role: 'listitem' }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('b', null, s.name), h('small', null, s.prog), h('small', null, s.text), h('span', { class: 'st' }, s.ok === 1 ? 'Ready' : s.ok > 0 ? 'Partly ready' : 'Not published yet')))),
        block('Draft a mission plan with AI', h('div', { class: 'planbox2' }, ctx, h('div', null, draft), out)),
      ];
    },
  };

  paintTabs();
  panelEl.replaceChildren(...PANELS[tab]().filter(Boolean));
  head.querySelector('.sheet-main').append(tabsEl, h('div', { class: 'sheet-body' }, panelEl));
  return h('div', { class: 'sheet' }, head);
}
