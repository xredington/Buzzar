import { h, icon, fmt } from '../ui.js';
import { getMeta, all } from '../data.js';
import { PATH } from './home.js';
import { CONFIG } from '../config.js';

export default function about(route) {
  if (route.name === 'partners') return partners();
  if (route.name === 'agents') return agents();
  return how();
}

function head(eyebrow, title, lede, extra) {
  return h('header', { class: 'phead' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), h('p', { class: 'lede' }, lede), extra || null));
}

// ---------- how it works ----------
function how() {
  const meta = getMeta();
  return h(
    'div',
    null,
    head('How it works', 'Find it. Ask Redington to deliver it.', 'Buzzar is a governed catalogue: what you read here is what a Redington checker has allowed to be published, and every claim says what it is based on.'),
    h(
      'section',
      { class: 'section' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'Four steps'),
        h('h2', null, 'From a hunch to a signed scope.'),
        h(
          'div',
          { class: 'steps', style: { marginTop: '28px' } },
          [
            ['Describe or discover', 'Ask in your own words, or answer three questions. You get a ranked shortlist with reasons, not a wall of logos.'],
            ['Compare honestly', 'Line up to three options. See the outcome, the success measure, who it is not for and how ready each one is.'],
            ['Talk to a specialist', 'Request a discovery call, a standard proposal or a custom one. Redington replies with next steps.'],
            ['Buy the way you buy', 'Through your AWS or Azure marketplace commitment, or through Redington resale, with delivery by Redington or an approved partner.'],
          ].map(([t, p]) => h('div', { class: 'step' }, h('h3', null, t), h('p', null, p))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section band' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'The Outcome Network'),
        h('h2', null, 'Six stages, one journey.'),
        h('p', { class: 'lede', style: { marginBottom: '34px' } }, 'Every listing shows how far it has published along this path, so you know whether to plan, pilot or ask more questions first.'),
        h(
          'div',
          { class: 'path6' },
          PATH.map(([n, s, p], i) => h('div', { class: 'p6 on' }, h('div', { class: 'hx' }, String(i + 1)), h('h4', null, n), h('p', null, h('b', null, s)), h('p', null, p))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'What each practice covers'),
        h('h2', null, `${meta.categories.length} practices, ${meta.categories.reduce((a, c) => a + c.subs.length, 0)} capabilities.`),
        h(
          'div',
          { class: 'grid', style: { marginTop: '24px' } },
          meta.categories.map((c) =>
            h(
              'div',
              { class: 'card', style: { '--cat': `var(--c-${c.code})` } },
              h('div', { class: 'card-top' }, h('span', { class: 'chip cat', style: { '--cat': `var(--c-${c.code})` } }, c.label), h('span', { class: 'chip' }, `${fmt(meta.counts.category[c.code] || 0)} listings`)),
              h('div', { class: 'chips', style: { marginTop: '6px' } }, c.subs.map((s) => h('a', { class: 'chip', href: `#/catalogue?sub=${encodeURIComponent(s.key)}` }, `${s.label} · ${meta.counts.sub[s.key] || 0}`))),
            ),
          ),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section-tight band' },
      h(
        'div',
        { class: 'wrap two' },
        h('div', { class: 'can' }, h('h3', null, 'What governance means here'), h('ul', null, h('li', null, 'Benefits are labelled as estimates or evidence, with their source.'), h('li', null, 'Every listing states who it is not for.'), h('li', null, 'Readiness is computed from what is published, never self-declared.'), h('li', null, 'Popularity signals that have not been reviewed are never shown.'))),
        h('div', { class: 'cannot' }, h('h3', null, 'What Buzzar will not do'), h('ul', null, h('li', null, 'Rank listings because a vendor paid for it.'), h('li', null, 'Promise an uplift before your baseline is measured.'), h('li', null, 'Store or send what you type into Ask Buzzar.'), h('li', null, 'Share your details until you submit a request.'))),
      ),
    ),
  );
}

// ---------- partners ----------
function partners() {
  const meta = getMeta();
  const isv = meta.providers.filter((p) => p.kind === 'isv').length;
  return h(
    'div',
    null,
    head('For partners', 'List your solution on Buzzar.', 'Reach enterprise and public-sector buyers across the GCC, Africa and India, with Redington’s distribution, marketplace private offers and delivery capacity behind you.', h('div', { class: 'chips', style: { marginTop: '22px', gap: '10px' } }, h('a', { class: 'btn primary', href: `${CONFIG.liveApi}/partners`, rel: 'noopener' }, 'Start your listing', h('span', { class: 'arr' }, '→')), h('a', { class: 'btn', href: '#/how-it-works' }, 'How governance works'))),
    h(
      'section',
      { class: 'section-tight' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'On Buzzar today'),
        h(
          'div',
          { class: 'stats', style: { marginTop: 0 } },
          [
            [meta.total, 'published listings'],
            [isv, 'vendors and partners'],
            [Object.keys(meta.counts.region).length, 'regions served'],
            [meta.counts.type.accelerator || 0, 'accelerators'],
          ].map(([n, l]) => h('div', { class: 'stat' }, h('b', null, fmt(n)), h('span', null, l))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section band' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'How a listing goes live'),
        h('h2', null, 'Draft, check, publish, keep fresh.'),
        h(
          'div',
          { class: 'steps', style: { marginTop: '28px' } },
          [
            ['Draft in the studio', 'Describe the outcome, the evidence, the scope and who it is not for. Add tiers and buying routes.'],
            ['Checker review', 'A Redington checker tests every claim against its source and asks for changes where needed.'],
            ['Publish', 'Approved listings go live to buyers, to Ask Buzzar and to the machine-readable feed for agents.'],
            ['Keep it fresh', 'Each listing has an owner and a review date. Stale claims are flagged before buyers rely on them.'],
          ].map(([t, p]) => h('div', { class: 'step' }, h('h3', null, t), h('p', null, p))),
        ),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h(
        'div',
        { class: 'wrap two' },
        h('div', { class: 'can' }, h('h3', null, 'What buyers see about you'), h('ul', null, h('li', null, 'Your name, outcome and success measure'), h('li', null, 'Benefits with their evidence basis'), h('li', null, 'Scope, deliverables and effort'), h('li', null, 'Tiers and buying routes (not prices)'), h('li', null, 'How ready the listing is across the journey'))),
        h('div', { class: 'cannot' }, h('h3', null, 'What buyers never see'), h('ul', null, h('li', null, 'Your margins or private-offer pricing'), h('li', null, 'Draft or rejected versions'), h('li', null, 'Checker comments'), h('li', null, 'Other buyers’ requests'), h('li', null, 'Unreviewed ratings or review counts'))),
      ),
    ),
  );
}

// ---------- agents ----------
function agents() {
  const api = CONFIG.liveApi;
  const sample = all()[0];
  const code = `<span class="k">curl</span> <span class="s">${api}/api/catalogue/feed.json</span>

{
  <span class="s">"schema"</span>: "buzzar.catalogue-list/v1",
  <span class="s">"audience"</span>: "public",
  <span class="s">"items"</span>: [
    { <span class="s">"id"</span>: "${sample.id}",
      <span class="s">"title"</span>: "${sample.t.replace(/[<>&"]/g, '')}",
      <span class="s">"offeringType"</span>: "${sample.y}", <span class="s">"category"</span>: "${sample.c}", … }
  ]
}`;
  const eps = [
    ['GET', '/api/catalogue/feed.json', 'Every public listing in one response. Best for indexing.'],
    ['GET', '/api/catalogue?limit=50&cursor=…', 'The same listings, paginated. Filter with offering=product|service|accelerator.'],
    ['GET', '/api/catalogue/{id}', 'One listing in full: outcome, benefits, not-for, scope, deliverables and tiers.'],
    ['GET', '/api/catalogue/slug/{slug}', 'One listing by its readable slug.'],
    ['GET', '/api/taxonomy', 'The five practices and their forty capabilities.'],
    ['GET', '/llms.txt', 'A plain-text index of the catalogue for language models.'],
  ];
  return h(
    'div',
    null,
    head('For agents & developers', 'Read the Buzzar catalogue.', 'The public catalogue is open, read-only and machine-readable. Agents can search and cite it; only people can request proposals.'),
    h(
      'section',
      { class: 'section-tight' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow' }, 'Endpoints'),
        h('div', { class: 'endpoints' }, eps.map(([m, p, d]) => h('div', { class: 'ep' }, h('span', { class: 'm' }, m), h('div', null, h('code', null, p), h('p', null, d))))),
        h('p', { class: 'muted small', style: { marginTop: '14px' } }, `Base URL: ${api}. Rate limit: 120 requests a minute. Responses are JSON with a versioned schema field.`),
      ),
    ),
    h('section', { class: 'section-tight' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, 'Try it'), h('pre', { class: 'code', html: code }))),
    h(
      'section',
      { class: 'section-tight', style: { paddingBottom: '90px' } },
      h(
        'div',
        { class: 'wrap two' },
        h('div', { class: 'can' }, h('h3', null, 'What agents can do'), h('ul', null, h('li', null, 'Read every public listing and the taxonomy'), h('li', null, 'Recommend and link to listings, citing their outcome and limits'), h('li', null, 'Send a person here to request a proposal'))),
        h('div', { class: 'cannot' }, h('h3', null, 'What agents cannot do'), h('ul', null, h('li', null, 'Submit requests on a buyer’s behalf'), h('li', null, 'See drafts, reviews or private pricing'), h('li', null, 'Write to the catalogue'))),
      ),
    ),
  );
}
