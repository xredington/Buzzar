// Home — the main thing Buzzar does: you ask, it asks back, it shows the solution.
//   1. Ask      what do you want to change?
//   2. Answer   up to three quick questions, as tap targets (skip any)
//   3. Solution the product, service and accelerator that fit, each with how it is bought, and more matches
import { h, fmt, img, catImg, itemImg, coin, lists, toast } from '../ui.js';
import { getMeta, understand, matchU, industryLabel, catLabel, TYPE, detail, label } from '../data.js';
import { requestDialog, KIND } from '../components.js';
import { go } from '../main.js';

export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.', 'RACE'],
  ['Experience', 'See it working', 'Demonstrations and reference stories.', 'Experience Centres'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.', 'Blueprint Studios'],
  ['Build', 'Prove it', 'A bounded pilot against your own baseline.', 'Protoverse'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offer or Redington resale.', 'Tech Citadel / Marketplace'],
  ['Adopt', 'Measure the value', 'Track the agreed outcome and scale what works.', 'Adoption Factory'],
];

const EXAMPLES = [
  ['ph-shield-check', 'Stop fraud losses', 'Reduce card and payment fraud losses'],
  ['ph-package', 'Avoid stockouts', 'We run out of stock in our stores but still waste fresh food'],
  ['ph-cloud-arrow-up', 'Move to the cloud', 'Move our ERP and file servers to the cloud'],
  ['ph-lock-key', 'Zero trust security', 'Zero trust security for our bank'],
  ['ph-sparkle', 'First AI use case', 'A first AI assistant for our customer service team'],
  ['ph-chart-bar', 'One data platform', 'One trusted data platform and dashboards for all countries'],
];

// the questions Buzzar may ask back; each one is skipped when your words already answer it
const QUESTIONS = [
  {
    key: 'industry',
    title: 'Which industry are you in?',
    why: 'It changes the ranking more than anything else.',
    opts: [
      ['retail', 'Retail', 'ph-storefront'],
      ['financial-services', 'Financial services', 'ph-bank'],
      ['healthcare', 'Healthcare', 'ph-heartbeat'],
      ['manufacturing', 'Manufacturing', 'ph-factory'],
      ['public-sector', 'Public sector', 'ph-buildings'],
      ['telecommunications', 'Telecom', 'ph-cell-signal-full'],
      ['logistics', 'Logistics', 'ph-truck'],
      ['utilities', 'Energy and utilities', 'ph-lightning'],
      ['cross-industry', 'Something else', 'ph-globe-hemisphere-east'],
    ],
  },
  {
    key: 'goal',
    title: 'What matters most?',
    why: 'So the first answer is the one that moves your number.',
    opts: [
      ['cost', 'Lower cost', 'ph-coins'],
      ['revenue', 'Grow revenue', 'ph-trend-up'],
      ['risk', 'Less risk', 'ph-shield-check'],
      ['speed', 'Move faster', 'ph-timer'],
      ['customers', 'Happier customers', 'ph-smiley'],
    ],
  },
  {
    key: 'platform',
    title: 'Where should it run?',
    why: 'Some solutions only run on one cloud.',
    opts: [
      ['AWS', 'AWS', 'ph-cloud'],
      ['Azure', 'Azure', 'ph-cloud'],
      ['Google Cloud', 'Google Cloud', 'ph-cloud'],
      ['On-premises', 'Our data centre', 'ph-hard-drives'],
      ['Hybrid', 'A mix', 'ph-arrows-split'],
      ['', 'Not sure', 'ph-question'],
    ],
  },
  {
    key: 'timeline',
    title: 'How soon?',
    why: 'Accelerators get you to a pilot fastest.',
    opts: [
      ['fast', 'Within 3 months', 'ph-lightning'],
      ['mid', '3 to 6 months', 'ph-calendar'],
      ['long', '6 to 12 months', 'ph-calendar-blank'],
      ['explore', 'Just exploring', 'ph-binoculars'],
    ],
  },
];
const GOAL_WORDS = { cost: 'automation efficiency cost', revenue: 'revenue growth conversion personalisation', risk: 'risk security compliance governance', speed: 'faster delivery automation devops', customers: 'customer experience service personalisation' };

export default function home(route) {
  const meta = getMeta();
  const root = h('div', { class: 'ask-page' });
  const S = { q: '', a: {}, step: 0, queue: [] };

  // ---------- understanding and matching ----------
  function brief() {
    const u = understand([S.q, GOAL_WORDS[S.a.goal] || ''].join(' '));
    if (S.a.industry && S.a.industry !== 'cross-industry') u.industries = [S.a.industry];
    if (S.a.platform) u.platforms = [S.a.platform];
    return u;
  }
  const run = (limit = 60) => matchU(brief(), { limit, boost: (it) => (S.a.timeline === 'fast' && it.y === 'accelerator' ? 4 : 0) });

  // ---------- 1. ask ----------
  function paintAsk() {
    const input = h('input', { type: 'text', value: S.q, placeholder: 'For example: we keep running out of stock in our stores', 'aria-label': 'What do you want to change?', autocomplete: 'off', maxlength: 300 });
    const form = h('form', { class: 'ask3' }, h('i', { class: 'ph ph-sparkle', 'aria-hidden': 'true' }), input, h('button', { class: 'btn dark lg', type: 'submit' }, 'Ask', h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' })));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) start(input.value.trim());
      else input.focus();
    });
    root.replaceChildren(
      h(
        'section',
        { class: 'ask-hero' },
        h(
          'div',
          { class: 'wrap ask-hero-in' },
          h('p', { class: 'ask-kicker' }, h('span', { class: 'num' }, fmt(meta.total)), ' governed products, services and accelerators'),
          h('h1', { class: 'grad-text' }, 'What do you want', h('br'), 'to change?'),
          form,
          h(
            'div',
            { class: 'examples' },
            EXAMPLES.map(([ic, label, q], i) => h('button', { type: 'button', style: { animationDelay: `${120 + i * 50}ms` }, onclick: () => start(q) }, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' }), label)),
          ),
          howItWorks(0),
        ),
      ),
    );
    setTimeout(() => input.focus(), 60);
  }

  function howItWorks(active) {
    const steps = [
      ['ph-chat-teardrop-text', 'Ask', 'Say what you want to change'],
      ['ph-hand-tap', 'Answer', 'Up to three quick taps'],
      ['ph-puzzle-piece', 'Get your solution', 'Product, service and how to buy'],
    ];
    return h(
      'ol',
      { class: 'how3', 'aria-label': 'How it works' },
      steps.map(([ic, t, d], i) => h('li', { class: i < active ? 'done' : i === active ? 'on' : '' }, h('span', { class: 'hi' }, h('i', { class: `ph ${i < active ? 'ph-check' : ic}`, 'aria-hidden': 'true' })), h('span', null, h('b', null, t), h('small', null, d)))),
    );
  }

  // ---------- 2. questions ----------
  function start(q) {
    S.q = q;
    S.a = {};
    const u = understand(q);
    // only ask what the sentence did not already say
    S.queue = QUESTIONS.filter((x) => !(x.key === 'industry' && u.industries.length) && !(x.key === 'platform' && u.platforms.length)).slice(0, 3);
    if (u.industries.length) S.a.industry = u.industries[0];
    if (u.platforms.length) S.a.platform = u.platforms[0];
    S.step = 0;
    S.queue.length ? paintQuestion() : paintResults();
  }

  function topBar(stage) {
    const edit = h('button', { type: 'button', class: 'qedit', onclick: () => paintAsk() }, h('i', { class: 'ph ph-pencil-simple', 'aria-hidden': 'true' }), 'Change');
    return h('div', { class: 'qbar' }, h('div', { class: 'wrap qbar-in' }, h('div', { class: 'qtext' }, h('small', null, 'You asked'), h('b', null, `“${S.q}”`)), edit, howItWorks(stage)));
  }

  function paintQuestion() {
    const Q = S.queue[S.step];
    const total = matchU(brief(), { limit: 3000 }).total;
    const opts = h(
      'div',
      { class: 'qopts' },
      Q.opts.map(([v, l, ic], i) =>
        h(
          'button',
          {
            type: 'button',
            class: 'qopt',
            style: { animationDelay: `${i * 40}ms` },
            onclick: () => {
              S.a[Q.key] = v;
              next();
            },
          },
          h('span', { class: 'qi' }, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' })),
          h('b', null, l),
        ),
      ),
    );
    root.replaceChildren(
      topBar(1),
      h(
        'section',
        { class: 'wrap qstage' },
        h(
          'div',
          { class: 'qhead' },
          h('span', { class: 'qcount' }, `Question ${S.step + 1} of ${S.queue.length}`),
          h('div', { class: 'qprog', 'aria-hidden': 'true' }, S.queue.map((_, i) => h('i', { class: i <= S.step ? 'on' : '' }))),
        ),
        h('h2', { class: 'heading-3' }, Q.title),
        h('p', { class: 'muted' }, Q.why),
        opts,
        h(
          'div',
          { class: 'qfoot' },
          h('span', { class: 'live-n' }, h('b', { class: 'num' }, fmt(total)), ' solutions relate to your need so far'),
          h('div', { class: 'chips', style: { gap: '8px' } }, S.step ? h('button', { type: 'button', class: 'btn ghost', onclick: () => (S.step--, paintQuestion()) }, h('i', { class: 'ph ph-arrow-left', 'aria-hidden': 'true' }), 'Back') : null, h('button', { type: 'button', class: 'btn ghost', onclick: next }, 'Skip'), h('button', { type: 'button', class: 'btn', onclick: paintResults }, 'Show solutions now')),
        ),
      ),
    );
  }
  function next() {
    S.step++;
    if (S.step < S.queue.length) paintQuestion();
    else paintResults();
  }

  // ---------- 3. the solution ----------
  async function paintResults() {
    root.replaceChildren(topBar(2), h('section', { class: 'wrap rstage' }, h('div', { class: 'live-skel', style: { height: '40px', width: '40%' } }), h('div', { class: 'live-skel', style: { height: '260px', marginTop: '24px' } })));
    const r = run(60);
    const best = (y) => r.picks.find((p) => p.it.y === y);
    const parts = [
      ['product', 'The software', 'you license'],
      ['service', 'The team', 'that implements it'],
      ['accelerator', 'The head start', 'that gets you to a pilot sooner'],
    ].map(([y, title, sub]) => ({ y, title, sub, p: best(y) }));
    const details = await Promise.all(parts.map((x) => (x.p ? detail(x.p.it.id) : null)));
    parts.forEach((x, i) => (x.d = details[i]));

    const chips = [
      S.a.industry && S.a.industry !== 'cross-industry' ? ['ph-buildings', industryLabel(S.a.industry), 'industry'] : null,
      S.a.goal ? ['ph-target', QUESTIONS[1].opts.find((o) => o[0] === S.a.goal)?.[1], 'goal'] : null,
      S.a.platform ? ['ph-cloud', S.a.platform.replace('-', ' '), 'platform'] : null,
      S.a.timeline ? ['ph-calendar', QUESTIONS[3].opts.find((o) => o[0] === S.a.timeline)?.[1], 'timeline'] : null,
    ].filter(Boolean);

    if (!r.picks.length) {
      root.replaceChildren(topBar(2), h('section', { class: 'wrap rstage' }, h('div', { class: 'empty', style: { textAlign: 'center' } }, h('h2', { class: 'heading-5' }, 'Nothing fits closely enough yet.'), h('p', { class: 'muted' }, 'Try naming the outcome, like “reduce fraud losses”, or the capability, like “identity and access”.'), h('button', { class: 'btn dark', type: 'button', onclick: paintAsk }, 'Ask again'))));
      return;
    }

    const inCat = parts.filter((x) => x.p);
    const send = () => requestDialog(inCat[0].p.it, 'private-offer', null, { bundle: inCat.map((x) => ({ it: x.p.it, sku: x.d?.skus?.[0] ? `${x.d.skus[0].edition} (${x.d.skus[0].code})` : null })), title: S.q, need: S.q });

    const stack = h(
      'div',
      { class: 'stack n' + inCat.length },
      inCat.map((x, i) => [i ? h('span', { class: 'plus', 'aria-hidden': 'true' }, h('i', { class: 'ph ph-plus' })) : null, solPart(x)]),
    );
    const missing = parts.filter((x) => !x.p);

    const more = moreMatches(r);
    root.replaceChildren(
      topBar(2),
      h(
        'section',
        { class: 'wrap rstage' },
        h(
          'div',
          { class: 'rhead' },
          h('div', null, h('p', { class: 'eyebrow' }, 'Your solution'), h('h2', { class: 'heading-3' }, inCat.length > 1 ? `${inCat.length} pieces that work together` : 'The closest fit'), h('div', { class: 'rchips' }, chips.map(([ic, l]) => h('span', null, h('i', { class: `ph ${ic}`, 'aria-hidden': 'true' }), l)), h('span', { class: 'n' }, `${fmt(r.total)} related listings checked`))),
          h('div', { class: 'racts2' }, h('button', { class: 'btn primary lg', type: 'button', onclick: send }, 'Request this solution', h('i', { class: 'ph ph-arrow-right arr', 'aria-hidden': 'true' })), h('a', { class: 'btn lg', href: `#/advisor?q=${encodeURIComponent(S.q)}` }, h('i', { class: 'ph ph-chats-circle', 'aria-hidden': 'true' }), 'Refine with Sami')),
        ),
        stack,
        missing.length ? h('p', { class: 'missnote' }, h('i', { class: 'ph ph-info', 'aria-hidden': 'true' }), `No ${missing.map((x) => KIND[x.y].label.toLowerCase()).join(' or ')} fits closely. Redington can add one when you request this solution.`) : null,
        h('p', { class: 'caption-5', style: { margin: '12px 0 0' } }, 'Advisory only, matched from published listings. Prices come as a private offer; editions shown are samples.'),
        more,
      ),
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function solPart(x) {
    const it = x.p.it;
    const s = x.d?.skus?.[0];
    const why = cleanWhy(x.p);
    return h(
      'a',
      { class: `spart k-${x.y}`, href: `#/listing/${it.slug}` },
      h('div', { class: 'sp-top' }, h('span', { class: `kind k-${x.y}` }, x.title), h('span', { class: 'fitpill ' + x.p.fit }, x.p.fit === 'strong' ? 'Strong fit' : 'Good fit')),
      h('p', { class: 'sp-sub' }, x.sub),
      h('div', { class: 'sp-main' }, h('span', { class: 'sp-img' }, img(itemImg(it), '', { width: 64, height: 64 })), h('div', null, h('b', null, it.t), h('span', { class: 'sp-by' }, coin(it.p, 20), it.k === 'distributor' ? 'Redington' : it.p))),
      why.length ? h('ul', { class: 'sp-why' }, why.map((w) => h('li', null, h('i', { class: 'ph ph-check', 'aria-hidden': 'true' }), w[0].toUpperCase() + w.slice(1)))) : null,
      h('div', { class: 'sp-buy' }, s ? [h('span', null, h('small', null, 'From edition'), h('b', null, s.edition || s.name)), h('span', null, h('small', null, 'Pricing'), h('b', null, `${label.model(s.model)}`))] : h('span', null, h('small', null, 'Pricing'), h('b', null, 'On request'))),
      h('span', { class: 'sp-go' }, 'See details, pricing and features', h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' })),
    );
  }

  // reasons in plain words: only meaningful matched terms, never filler like "out" or "our"
  function cleanWhy(p) {
    const out = [];
    const terms = (p.matched || []).filter((t) => t.length > 3 && !['still', 'keep', 'want', 'need', 'their', 'with', 'have'].includes(t));
    if (terms.length) out.push(`Covers ${terms.slice(0, 3).join(', ')}`);
    for (const w of p.why) if (!/^mentions /i.test(w)) out.push(w);
    return out.slice(0, 2);
  }

  function moreMatches(r) {
    let kind = '';
    const list = h('div', { class: 'mlist' });
    const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': 'Filter by kind' });
    const counts = { '': r.picks.length };
    for (const p of r.picks) counts[p.it.y] = (counts[p.it.y] || 0) + 1;
    const draw = () => {
      tabs.replaceChildren(
        ...[
          ['', 'All'],
          ['product', 'Products'],
          ['service', 'Services'],
          ['accelerator', 'Accelerators'],
        ].map(([k, l]) => {
          const b = h('button', { type: 'button', 'aria-pressed': String(kind === k), disabled: !counts[k] }, l, ` ${counts[k] || 0}`);
          b.addEventListener('click', () => ((kind = k), draw()));
          return b;
        }),
      );
      const rows = r.picks.filter((p) => !kind || p.it.y === kind).slice(0, 9);
      list.replaceChildren(
        ...rows.map((p) =>
          h(
            'a',
            { class: 'mrow', href: `#/listing/${p.it.slug}` },
            coin(p.it.p, 36),
            h('span', { class: 'mt' }, h('b', null, p.it.t), h('small', null, h('span', { class: `kind k-${p.it.y}` }, TYPE[p.it.y].label), ` · ${catLabel(p.it.c)} · ${p.it.k === 'distributor' ? 'Redington' : p.it.p}`)),
            h('span', { class: 'fitpill ' + p.fit }, p.fit === 'strong' ? 'Strong fit' : 'Good fit'),
            h('i', { class: 'ph ph-arrow-right', 'aria-hidden': 'true' }),
          ),
        ),
      );
    };
    draw();
    return h('section', { class: 'more' }, h('div', { class: 'more-head' }, h('h3', { class: 'heading-6' }, 'More matches'), tabs), list, h('a', { class: 'textlink', href: `#/catalogue?q=${encodeURIComponent(S.q)}`, style: { display: 'inline-block', marginTop: '16px' } }, `See all ${fmt(r.total)} in the catalogue`));
  }

  const q = route?.params?.get('q');
  if (q) start(q);
  else paintAsk();
  return root;
}
