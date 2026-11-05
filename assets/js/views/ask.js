import { h, fmt } from '../ui.js';
import { match, industryLabel, catLabel } from '../data.js';
import { pick } from './discover.js';
import { go } from '../main.js';

const EXAMPLES = ['Reduce customer churn for a telco in the UAE', 'Zero trust for a bank in Riyadh', 'Predict stockouts across our grocery stores', 'Move SAP to Azure with a landing zone', 'A GenAI assistant for our call centre', 'Ransomware recovery for a hospital'];

export default function ask(route) {
  const q = (route.params.get('q') || '').trim();
  const input = h('input', { type: 'text', value: q, placeholder: 'Describe the outcome you want, in your own words', 'aria-label': 'Ask Buzzar', maxlength: 400, autocomplete: 'off' });
  const form = h('form', { class: 'ask-box', role: 'search' }, h('span', { class: 'spark', 'aria-hidden': 'true' }, '✦'), input, h('button', { class: 'btn primary', type: 'submit' }, q ? 'Ask again' : 'Ask', h('span', { class: 'arr' }, '→')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v) go('ask?q=' + encodeURIComponent(v));
  });
  if (!q) requestAnimationFrame(() => input.focus());

  const results = h('div', { class: 'wrap', style: { paddingBottom: '90px', maxWidth: '980px' }, 'aria-live': 'polite' });
  if (q) {
    results.append(h('div', { class: 'thinking', 'aria-label': 'Thinking' }, h('span'), h('span'), h('span')));
    // a short pause so the answer reads as an answer, not a flicker
    setTimeout(() => results.replaceChildren(...answer(q)), 450);
  }

  return h(
    'div',
    null,
    h(
      'section',
      { class: 'ask-hero' },
      h(
        'div',
        { class: 'wrap' },
        h('p', { class: 'eyebrow', style: { justifyContent: 'center' } }, 'Ask Buzzar'),
        h('h1', null, q ? 'Here’s where I’d start.' : 'A question. A clearer direction.'),
        q ? null : h('p', { class: 'lede', style: { margin: '0 auto' } }, 'Describe the outcome you want. Buzzar reads your industry, the capability and the platform from your words, and explains every match.'),
        form,
        q ? null : h('div', { class: 'prompts' }, EXAMPLES.map((e) => h('button', { type: 'button', onclick: () => go('ask?q=' + encodeURIComponent(e)) }, e))),
      ),
    ),
    results,
  );
}

function answer(q) {
  const { u, picks, total } = match(q, { limit: 6 });
  const refine = (extra) => go('ask?q=' + encodeURIComponent(`${q} ${extra}`));
  const understood = [
    ...u.industries.map((k) => ['Industry', industryLabel(k)]),
    ...u.categories.map((c) => ['Practice', catLabel(c)]),
    ...u.platforms.map((p) => ['Platform', p]),
    ...u.regions.map((r) => ['Region', r]),
    ...u.types.map((t) => ['Looking for', t]),
  ];
  const out = [];
  out.push(
    h(
      'div',
      { class: 'understood' },
      h('b', null, 'What I understood:'),
      understood.length ? understood.map(([k, v]) => h('span', { class: 'chip green' }, `${k}: ${v}`)) : h('span', { class: 'muted' }, 'the capability you described'),
      u.terms.length ? h('span', { class: 'muted small' }, `· key words: ${u.terms.slice(0, 6).join(', ')}`) : null,
    ),
  );

  if (!picks.length) {
    out.push(h('div', { class: 'empty', style: { marginTop: '20px' } }, h('h3', null, 'No published listing fits that closely enough.'), h('p', null, 'Try naming the outcome (“reduce fraud losses”) or the capability (“identity and access”), or start with guided discovery.'), h('a', { class: 'btn primary', href: '#/discover' }, 'Guided discovery')));
    return out;
  }

  const strong = picks.filter((p) => p.fit === 'strong').length;
  out.push(h('h2', { style: { marginTop: '30px' } }, strong ? `${strong === 1 ? 'One strong match' : `${strong} strong matches`}${picks.length > strong ? `, plus ${picks.length - strong} worth a look` : ''}.` : 'The closest published matches.'));
  out.push(h('div', { class: 'picks' }, picks.map(pick)));

  // honest gaps and follow-up questions
  const follow = [];
  if (!u.industries.length) follow.push(['Which industry are you in?', ['retail', 'financial services', 'healthcare', 'public sector', 'telecom', 'manufacturing'].map((x) => [x, x])]);
  if (!u.platforms.length && (u.categories.includes('CLD') || u.categories.includes('SEC') || u.categories.includes('DNA'))) follow.push(['Where does it need to run?', [['AWS', 'on AWS'], ['Azure', 'on Azure'], ['On-premises', 'on premises']]]);
  if (!u.regions.length) follow.push(['Where do you operate?', [['UAE', 'in the UAE'], ['Saudi Arabia', 'in Saudi Arabia'], ['India', 'in India'], ['Africa', 'in Africa']]]);
  if (follow.length)
    out.push(
      h(
        'div',
        { class: 'panel', style: { marginTop: '28px' } },
        h('h3', null, 'Sharpen the shortlist'),
        h('p', { class: 'muted small' }, 'Adding one detail usually moves a partial fit to a strong one.'),
        follow.map(([qq, opts]) => h('div', { style: { margin: '14px 0 0' } }, h('p', { style: { margin: '0 0 8px', fontWeight: 600, fontSize: '0.92rem' } }, qq), h('div', { class: 'prompts', style: { marginTop: 0 } }, opts.map(([l, add]) => h('button', { type: 'button', onclick: () => refine(add) }, l))))),
      ),
    );

  out.push(
    h(
      'div',
      { class: 'chips', style: { marginTop: '28px', gap: '10px' } },
      total > picks.length ? h('a', { class: 'btn', href: `#/catalogue?q=${encodeURIComponent(u.terms.join(' '))}${u.industries.length ? '&ind=' + u.industries.join(',') : ''}` }, `See all ${fmt(total)} related listings`, h('span', { class: 'arr' }, '→')) : null,
      h('a', { class: 'btn ghost', href: '#/discover' }, 'Try guided discovery'),
    ),
    h('p', { class: 'muted small', style: { marginTop: '20px' } }, 'Ask Buzzar matches on your device against the published catalogue. Your question is not stored or sent anywhere.'),
  );
  return out;
}
