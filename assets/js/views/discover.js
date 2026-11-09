import { h, icon } from '../ui.js?v=202611090654';
import { DISCOVERY, discoverMatch, industryLabel, industryIcon, TYPE } from '../data.js?v=202611090654';
import { catChip, toggleBtn } from '../components.js?v=202611090654';
import { go } from '../main.js?v=202611090654';

const STEP_ICONS = { exec: 'target', cio: 'chip', ops: 'gear', cx: 'heart', risk: 'SEC', data: 'DNA', cost: 'coins', forecast: 'DNA', secure: 'SEC', comply: 'columns', cloud: 'CLD', ai: 'AI', modern: 'SW', resilience: 'pulse' };

export function pick(r, i) {
  const it = r.it;
  return h(
    'article',
    { class: 'pick', style: { animationDelay: `${i * 90}ms` } },
    h('div', { class: 'rank', 'aria-hidden': 'true' }, String(i + 1)),
    h(
      'div',
      null,
      h('div', { class: 'chips', style: { marginBottom: '8px' } }, catChip(it.c), h('span', { class: 'chip' }, TYPE[it.y].label), h('span', { class: 'fit ' + r.fit }, r.fit === 'strong' ? 'Strong fit' : 'Partial fit')),
      h('h3', null, h('a', { href: `#/listing/${it.slug}` }, it.t)),
      h('p', { class: 'muted small', style: { margin: 0 } }, it.k === 'distributor' ? 'Redington' : `By ${it.p}`),
      h('p', { style: { margin: '8px 0 0', fontSize: '0.94rem' } }, it.s),
      r.why.length ? h('p', { class: 'why' }, h('b', null, 'Why it’s here: '), r.why.slice(0, 3).join(' · ')) : null,
    ),
    h('div', { class: 'card-acts', style: { flexDirection: 'column' } }, h('a', { class: 'btn sm primary', href: `#/listing/${it.slug}` }, 'View'), h('div', { style: { display: 'flex', gap: '4px' } }, toggleBtn('compare', it.id, true), toggleBtn('saved', it.id, true))),
  );
}

export default function discover(route) {
  const p = route.params;
  const sel = { industry: p.get('industry'), role: p.get('role'), challenge: p.get('challenge') };
  if (sel.industry && !DISCOVERY.industries.includes(sel.industry)) sel.industry = null;
  const step = !sel.industry ? 0 : !sel.role ? 1 : !sel.challenge ? 2 : 3;
  const url = (o) => {
    const q = new URLSearchParams(Object.entries({ ...sel, ...o }).filter(([, v]) => v));
    return 'discover?' + q;
  };

  const role = DISCOVERY.roles.find((r) => r.key === sel.role);
  const ch = DISCOVERY.challenges.find((c) => c.key === sel.challenge);
  const stepsMeta = [
    ['Industry', sel.industry ? industryLabel(sel.industry) : 'What world do you work in?', { industry: null, role: null, challenge: null }],
    ['Perspective', role ? role.label : 'What is your role?', { role: null, challenge: null }],
    ['Challenge', ch ? ch.label : 'What would you like to change?', { challenge: null }],
    ['Matches', step === 3 ? 'Your shortlist' : 'Ranked, with reasons', null],
  ];
  const stepsEl = h(
    'ol',
    { class: 'disc-steps' },
    stepsMeta.map(([name, sub, reset], i) => {
      const cls = i < step ? 'done' : i === step ? 'cur' : '';
      const inner = [h('span', { class: 'hx' }, i < step ? '✓' : String(i + 1)), h('span', null, h('b', null, name), h('small', null, sub))];
      return h('li', { class: cls, 'aria-current': i === step ? 'step' : null }, i < step && reset ? h('button', { type: 'button', onclick: () => go(url(reset)), 'aria-label': `Change ${name.toLowerCase()}` }, inner) : inner);
    }),
  );

  let panel;
  if (step === 0) {
    panel = question(
      'Step 1 of 3',
      'What world do you work in?',
      'Pick the industry closest to yours. Cross-industry solutions are included automatically.',
      DISCOVERY.industries.map((k) => [industryLabel(k), null, industryIcon(k), url({ industry: k }), `assets/img/photo/${k}.webp`]),
    );
  } else if (step === 1) {
    panel = question(
      'Step 2 of 3',
      'What is your perspective?',
      'This shapes how we read your challenge, not who can buy.',
      DISCOVERY.roles.map((r) => [r.label, r.hint, STEP_ICONS[r.key], url({ role: r.key })]),
    );
  } else if (step === 2) {
    panel = question(
      'Step 3 of 3',
      'What would you like to change?',
      'Choose the outcome that matters most right now.',
      DISCOVERY.challenges.map((c) => [c.label, c.hint, STEP_ICONS[c.key], url({ challenge: c.key })]),
    );
  } else {
    const picks = discoverMatch(sel);
    const sentence = `I work in ${industryLabel(sel.industry).toLowerCase()}, from a ${role.label.toLowerCase()} perspective, and I want to ${ch.label.toLowerCase()}.`;
    panel = h(
      'div',
      null,
      h('p', { class: 'eyebrow' }, 'Your matches'),
      h('h2', null, picks.length ? `${picks.length} solutions worth a closer look.` : 'Nothing close enough yet.'),
      h('div', { class: 'understood' }, h('span', { class: 'spark' }, '✦'), h('span', null, `“${sentence}”`)),
      picks.length ? h('div', { class: 'picks' }, picks.map(pick)) : h('div', { class: 'empty' }, h('p', null, 'Try a different challenge, or describe it in your own words.')),
      h('div', { class: 'chips', style: { marginTop: '28px', gap: '10px' } }, h('a', { class: 'btn primary', href: `#/ask?q=${encodeURIComponent(sentence)}` }, 'Refine in Ask Buzzar', h('span', { class: 'arr' }, '→')), h('a', { class: 'btn', href: `#/catalogue?ind=${sel.industry}` }, `Everything for ${industryLabel(sel.industry)}`), h('a', { class: 'btn ghost', href: '#/discover' }, 'Start over')),
      h('p', { class: 'muted small', style: { marginTop: '22px' } }, 'Matching runs on your device using the published catalogue. Nothing you choose is stored or sent.'),
    );
  }

  return h(
    'div',
    null,
    h('header', { class: 'phead' }, h('div', { class: 'wrap' }, h('p', { class: 'eyebrow' }, 'Guided discovery'), h('h1', null, 'Start with your world.'), h('p', { class: 'lede' }, 'A few details turn a broad marketplace into a useful direction. You pick every answer. Nothing is saved.'))),
    h('div', { class: 'wrap disc' }, stepsEl, h('div', { 'aria-live': 'polite' }, panel)),
  );
}

function question(eyebrow, title, lede, options) {
  return h(
    'div',
    null,
    h('p', { class: 'eyebrow' }, eyebrow),
    h('h2', null, title),
    h('p', { class: 'muted' }, lede),
    h(
      'div',
      { class: 'choices' },
      options.map(([label, hint, ic, href, photo], i) =>
        photo
          ? h('a', { class: 'choice photo', href: '#/' + href, style: { animationDelay: `${i * 40}ms` } }, h('img', { src: photo, alt: '', loading: 'lazy', decoding: 'async' }), h('span', { class: 'cp-shade', 'aria-hidden': 'true' }), h('span', { class: 'ci' }, icon(ic)), h('b', null, label), h('span', { class: 'cp-go', 'aria-hidden': 'true' }, h('i', { class: 'ph ph-arrow-right' })))
          : h('a', { class: 'choice', href: '#/' + href, style: { animationDelay: `${i * 40}ms` } }, h('span', { class: 'ci' }, icon(ic)), h('b', null, label), hint ? h('small', null, hint) : null),
      ),
    ),
  );
}
