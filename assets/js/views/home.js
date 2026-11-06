import { h, fmt, img, catImg, IND_IMG } from '../ui.js';
import { all, getMeta, industryLabel, detail, getBySlug } from '../data.js';
import { card } from '../components.js';
import { go } from '../main.js';

export const PATH = [
  ['Explore', 'Discover the fit', 'Outcome, audience and what it is not for, published up front.', 'RACE'],
  ['Experience', 'See it working', 'Demonstrations and reference stories.', 'Experience Centres'],
  ['Define', 'Agree the blueprint', 'Scope, deliverables and success measures you can sign.', 'Blueprint Studios'],
  ['Build', 'Prove it', 'A bounded pilot against your own baseline.', 'Protoverse'],
  ['Deploy', 'Buy and deploy', 'Marketplace private offer or Redington resale.', 'Tech Citadel / Marketplace'],
  ['Adopt', 'Measure the value', 'Track the agreed outcome and scale what works.', 'Adoption Factory'],
];

const STARTS = ['Fewer fraud losses', 'A first AI use case', 'Move our ERP to Azure', 'Zero trust for a bank'];

export default function home() {
  const meta = getMeta();
  const items = all();
  return h('div', null, hero(meta, items), journey(), practices(meta), samiFeature(), industries(meta), providers(meta), latest(items), audiences());
}

// ---------- hero: strapline, search, promises, and the information model with live counts ----------
function hero(meta, items) {
  const input = h('input', { type: 'search', placeholder: 'Describe an outcome, or search “Kubernetes”, “firewall”…', 'aria-label': 'Search the catalogue or ask Buzzar', autocomplete: 'off', maxlength: 300 });
  const form = h('form', { class: 'hero-search', role: 'search' }, input, h('button', { class: 'btn', type: 'submit', name: 'search', value: 'search' }, 'Search'), h('button', { class: 'btn primary', type: 'button', onclick: () => go('advisor?q=' + encodeURIComponent(input.value.trim())) }, 'Ask Sami', h('span', { class: 'arr' }, '→')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    go(q ? 'catalogue?q=' + encodeURIComponent(q) : 'catalogue');
  });
  const c = meta.counts.type;
  const skus = items.reduce((a, x) => a + (x.ns || 0), 0);
  const aws = items.filter((x) => x.aws).length;
  const model = h(
    'figure',
    { class: 'model', 'aria-label': 'What Buzzar holds' },
    h('div', { class: 'model-title' }, h('b', null, 'What Buzzar holds'), h('small', null, 'Live counts from the published catalogue')),
    h('a', { class: 'm-box m-provider', href: '#/providers' }, h('b', null, 'Providers', h('span', null, fmt(meta.providers.length))), h('small', null, 'A vendor (ISV) or Redington, behind every listing')),
    h('div', { class: 'm-link' }),
    h('div', { class: 'm-link fan', style: { height: '2px', margin: '0 0 14px' } }),
    h(
      'div',
      { class: 'm-row three' },
      h('a', { class: 'm-box m-product', href: '#/catalogue?type=product' }, h('b', null, 'Products', h('span', null, fmt(c.product || 0))), h('small', null, 'Software you license')),
      h('a', { class: 'm-box m-service', href: '#/catalogue?type=service' }, h('b', null, 'Services', h('span', null, fmt(c.service || 0))), h('small', null, 'Work done for you')),
      h('a', { class: 'm-box m-accel', href: '#/catalogue?type=accelerator' }, h('b', null, 'Accelerators', h('span', null, fmt(c.accelerator || 0))), h('small', null, 'Packaged programme stages')),
    ),
    h('div', { class: 'm-link' }),
    h('a', { class: 'm-box m-fit', href: '#/industries' }, h('b', null, 'Fit and discovery'), h('small', null, `${Object.keys(meta.industries).length} industries · sizes · platforms · regions · not a fit when`)),
    h('div', { class: 'm-link' }),
    h('a', { class: 'm-box m-sku', href: '#/catalogue?buy=1' }, h('b', null, 'Ways to buy', h('span', null, `${fmt(skus)} SKUs`)), h('small', null, `Editions, terms and buying routes · ${fmt(aws)} listings buyable on AWS Marketplace · always “Price on private offer”`)),
    h('figcaption', { class: 'm-foot' }, 'Select any box to browse it.'),
  );
  return h(
    'section',
    { class: 'hero-e' },
    h(
      'div',
      { class: 'wrap hero-e-grid' },
      h(
        'div',
        null,
        h('p', { class: 'eyebrow' }, 'The business solution marketplace'),
        h('h1', null, 'Where Expertise ', h('span', null, 'Meets Opportunity')),
        h('p', { class: 'lede' }, 'Find technology and expertise, compare your options side by side, and ask Redington to deliver. Every listing is governed, so you can see what fits before you talk to anyone.'),
        form,
        h('div', { class: 'hero-quick' }, h('span', null, 'Start from:'), STARTS.map((s) => h('a', { href: `#/advisor?q=${encodeURIComponent(s)}` }, s))),
        h(
          'ul',
          { class: 'promise', 'aria-label': 'Our promise to buyers' },
          h('li', null, 'Every listing is reviewed by a Buzzar checker'),
          h('li', null, 'Benefits are shown with their limits'),
          h('li', null, 'Prices are never shown as amounts'),
          h('li', null, 'You make every choice'),
        ),
      ),
      model,
    ),
  );
}

// ---------- Discover → Compare → Connect ----------
function journey() {
  const dot = (label, colour) => h('span', { class: 'fn-dot', style: { '--fc': colour } }, label);
  const step = (n, title, text, how, href, dots) => h('a', { href }, h('span', { class: 'n' }, n), h('h3', null, title), h('p', null, text), h('span', { class: 'how' }, how, ' →'), h('div', { class: 'fn' }, dots));
  return h(
    'section',
    { class: 'section-tight' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'How a buyer moves'), h('h2', null, 'Discover. Compare. Connect.'))),
      h(
        'div',
        { class: 'dcc' },
        step('01', 'Discover', 'Answer four guided questions, ask in your own words, talk to Sami, or search the catalogue.', 'Start guided discovery', '#/discover', [dot('Fit', 'var(--f-fit)'), dot('AI guidance', 'var(--f-ai)')]),
        step('02', 'Compare', 'Put up to three offerings side by side. See outcome, limits, readiness and ways to buy.', 'Open compare', '#/compare', [dot('Products', 'var(--f-product)'), dot('Services', 'var(--f-service)'), dot('Accelerators', 'var(--f-accel)')]),
        step('03', 'Connect', 'Request a proposal, a discovery call or a private offer. Each request carries a CRM reference.', 'See how requests work', '#/how-it-works', [dot('Buyer actions', 'var(--f-action)'), dot('Ways to buy', 'var(--f-sku)')]),
      ),
    ),
  );
}

// ---------- practices ----------
function practices(meta) {
  const order = ['CLD', 'DNA', 'AI', 'SEC', 'SW'];
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Five categories'), h('h2', null, 'Start from the capability you need.')), h('a', { class: 'btn', href: '#/catalogue' }, 'Search the catalogue', h('span', { class: 'arr' }, '→'))),
      h(
        'div',
        { class: 'practices' },
        order.map((code) => {
          const cat = meta.categories.find((x) => x.code === code);
          const subs = [...cat.subs].sort((a, b) => (meta.counts.sub[b.key] || 0) - (meta.counts.sub[a.key] || 0)).slice(0, 3);
          return h(
            'a',
            { class: 'prac', href: `#/catalogue?cat=${code}` },
            h('figure', null, img(catImg(code), '', { width: 112, height: 112 })),
            h('div', null, h('h3', null, cat.label), h('small', null, `${fmt(meta.counts.category[code] || 0)} listings`), h('ul', null, subs.map((s) => h('li', null, s.label)))),
          );
        }),
      ),
    ),
  );
}

// ---------- Sami: the discovery board and its Solution step ----------
function samiFeature() {
  const canvas = h('canvas', { width: 88, height: 88, 'aria-hidden': 'true' });
  import('../orb.js').then(({ createOrb }) => {
    const orb = createOrb(canvas, { halo: false });
    const states = ['listening', 'thinking', 'talking', 'idle'];
    let i = 0;
    const tick = setInterval(() => {
      if (!canvas.isConnected) return clearInterval(tick);
      orb.setState(states[i++ % states.length]);
    }, 2600);
  });
  const cell = (label, rows) => h('div', { class: 'bp-cell' }, h('p', { class: 'label' }, label), rows.map(([k, v]) => h('div', null, h('span', { class: 'muted' }, k + ': '), v)));
  const solList = h('ul', null, h('li', null, h('span', null, 'Loading example…')));
  // a real example from the catalogue: forecasting product + markdown service
  const pickA = getBySlug('demand-forecasting-and-inventory-optimisation');
  const pickB = getBySlug('waste-sustainability-and-markdown-optimisation-service') || getBySlug('waste-sustainability-and-markdown-optimisation');
  Promise.all([pickA, pickB].filter(Boolean).map(async (it) => ({ it, d: await detail(it.id) }))).then((rows) => {
    solList.replaceChildren(...rows.map(({ it, d }) => h('li', null, h('span', null, h('b', { style: { display: 'inline' } }, it.y === 'product' ? 'Product · ' : 'Service · '), it.t), d?.skus?.[0] ? h('code', null, d.skus[0].code) : null)));
  });
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap sami-feature' },
      h(
        'div',
        null,
        h('p', { class: 'eyebrow', style: { color: 'var(--f-ai)' } }, 'AI guidance'),
        h('h2', null, 'Talk to Sami. It asks before it answers.'),
        h('p', { class: 'lede' }, 'Describe the change you want, by typing or out loud. Sami fills a discovery board as it listens, asks only the questions that change the answer, and ends with a Solution: the products and services that fit, each with its first way to buy.'),
        h('ul', { class: 'ticks', style: { gridTemplateColumns: '1fr', margin: '18px 0 24px' } }, h('li', null, 'Advisory only: generated from published Buzzar listings'), h('li', null, 'Answers grouped into Products, Services and Accelerators'), h('li', null, 'Send a whole Solution as one private-offer request')),
        h('a', { class: 'btn primary', href: '#/advisor' }, 'Talk to Sami', h('span', { class: 'arr' }, '→')),
      ),
      h(
        'div',
        { class: 'board-preview', 'aria-label': 'Example discovery board' },
        h('header', null, canvas, h('div', null, h('b', null, 'Discovery board'), h('small', null, 'Example · retail'))),
        h(
          'div',
          { class: 'bp-grid' },
          cell('Your world', [
            ['Industry', 'Retail & e-commerce'],
            ['Region', 'UAE'],
          ]),
          cell('The challenge', [['Need', 'Stockouts with high fresh-food waste']]),
          cell('The dream', [['Success', 'Fewer stockouts, less markdown waste']]),
          cell('Reality check', [
            ['Timeline', '3–6 months'],
            ['Platform', 'Azure'],
          ]),
        ),
        h('div', { class: 'bp-sol' }, h('b', null, 'Solution'), solList),
      ),
    ),
  );
}

// ---------- industries ----------
function industries(meta) {
  const feat = Object.keys(IND_IMG);
  const rest = Object.entries(meta.counts.industry)
    .filter(([k]) => !feat.includes(k) && meta.industries[k])
    .sort((a, b) => b[1] - a[1]);
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Industries'), h('h2', null, 'Built for the way your sector works.')), h('a', { class: 'btn', href: '#/industries' }, 'All industries', h('span', { class: 'arr' }, '→'))),
      h(
        'div',
        { class: 'inds' },
        feat.map((k) => h('a', { class: 'indc', href: `#/catalogue?ind=${k}` }, img(`assets/img/${IND_IMG[k]}.webp`, '', { width: 820, height: 513 }), h('div', null, h('b', null, industryLabel(k)), h('small', null, `${fmt(meta.counts.industry[k] || 0)} listings`)))),
      ),
      h('div', { class: 'ind-more' }, rest.map(([k, n]) => h('a', { href: `#/catalogue?ind=${k}` }, industryLabel(k), h('span', null, fmt(n))))),
    ),
  );
}

// ---------- providers ----------
function providers(meta) {
  const top = meta.providers.filter((p) => p.name !== 'Redington').slice(0, 11);
  const red = meta.providers.find((p) => p.name === 'Redington');
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow', style: { color: 'var(--f-trust)' } }, 'Provider and trust'), h('h2', null, `${fmt(meta.providers.length)} providers stand behind the catalogue.`), h('p', null, 'Vendors license the products. Redington and approved partners deliver the services. Every listing names who is behind it.')), h('a', { class: 'btn', href: '#/providers' }, 'All providers', h('span', { class: 'arr' }, '→'))),
      h('div', { class: 'provwall' }, red ? h('a', { href: '#/catalogue?prov=Redington' }, 'Redington', h('small', null, fmt(red.n))) : null, top.map((p) => h('a', { href: `#/catalogue?prov=${encodeURIComponent(p.name)}` }, p.name, h('small', null, fmt(p.n))))),
    ),
  );
}

// ---------- recently published ----------
function latest(items) {
  const pick = ['product', 'service', 'accelerator'].map((y) => [...items].filter((x) => x.y === y).sort((a, b) => (b.u || '').localeCompare(a.u || ''))[0]).filter(Boolean);
  return h(
    'section',
    { class: 'section band' },
    h(
      'div',
      { class: 'wrap' },
      h('div', { class: 'section-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Recently published'), h('h2', null, 'New on the shelves.')), h('a', { class: 'btn', href: '#/catalogue?sort=new' }, 'Everything new', h('span', { class: 'arr' }, '→'))),
      h('div', { class: 'grid' }, pick.map((it) => card(it))),
    ),
  );
}

// ---------- audiences ----------
function audiences() {
  const col = (label, title, text, href, cta) => h('div', { class: 'panel', style: { padding: '24px' } }, h('p', { class: 'eyebrow' }, label), h('h3', { style: { fontSize: '1.3rem' } }, title), h('p', { class: 'muted' }, text), h('a', { class: 'btn', href }, cta, h('span', { class: 'arr' }, '→')));
  return h(
    'section',
    { class: 'section' },
    h(
      'div',
      { class: 'wrap two' },
      col('Buzzar for partners', 'List your solution with Redington.', 'Publish products and services in Provider studio. A Buzzar checker reviews every listing before it goes public.', '#/partners', 'How listing works'),
      col('Buzzar for agents', 'A read-only catalogue for AI agents.', 'Approved, publicly granted listings as JSON and plain text. Agents can read and cite; only people can request.', '#/agents', 'Read the endpoints'),
    ),
  );
}
