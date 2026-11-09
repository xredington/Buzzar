// Mission plan: objective, prerequisites, success measures and who does what, from Explore to Adopt.
// Built only from the listing's published record (and the buyer's own context). Nothing is invented:
// where the record is silent, the plan says what to agree in the discovery call instead.
import { h } from './ui.js?v=202611090654';
import { readiness, label } from './data.js?v=202611090654';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function scopeSteps(scope) {
  const text = String(scope || '');
  const lines = text
    .split(/\n+/)
    .map((l) => l.match(/^\s*\d+[).]\s*(.+)$/)?.[1])
    .filter(Boolean);
  if (lines.length) return lines;
  // inline "Workplan: 1) a 2) b 3) c"
  const inline = text.match(/\d\)\s*[^\d]+/g);
  if (inline && inline.length > 1) return inline.map((x) => cap(x.replace(/^\d\)\s*/, '').trim().replace(/[.;]$/, '')));
  // services list their phases as plain lines before "Delivery sequence:"
  const plain = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !/^[A-Z][A-Za-z ]{2,24}:/.test(l));
  return plain.slice(0, 6);
}

export function scopeMeta(scope) {
  return String(scope || '')
    .split(/\n+/)
    .map((l) => l.trim().match(/^([A-Z][A-Za-z ]{2,24}):\s*(.+)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]);
}

export function prerequisites(d) {
  const out = [];
  for (const n of d?.notFor || []) {
    const m = n.situation.match(/^(?:Organisations|Organizations|Sites|Teams|Buyers)\s+without\s+(.+)$/i);
    if (m) out.push(cap(m[1].replace(/^an?\s+/i, '')));
  }
  for (const p of d?.delivery?.prerequisites || []) out.push(cap(p));
  return [...new Set(out)];
}

export function buildPlan(it, d, context = '') {
  const rd = readiness(it, d);
  const steps = scopeSteps(d?.scope);
  const owner = (d?.audience || [])[0] || (d?.roles || [])[0] || 'Your executive sponsor';
  const delivery = scopeMeta(d?.scope).find(([k]) => /delivery model/i.test(k))?.[1] || (it.y === 'service' ? `${it.p === 'Redington' ? 'Redington' : it.p} with Redington` : 'Redington or an approved implementation partner');
  const ctx = context.trim();
  return [
    ['Objective', [ctx ? `${cap(ctx.replace(/[.]+$/, ''))}, using ${it.t}.` : d?.outcome || it.s]],
    ['What you need in place', prerequisites(d).length ? prerequisites(d) : ['A named owner for the outcome', 'Access to the source data and systems involved']],
    ['How success is measured', [d?.kpi ? `${cap(d.kpi)}, measured against your own baseline before any improvement is claimed.` : 'Agree one measurable outcome and its baseline in the discovery call.', ...(d?.benefits || []).slice(0, 2).map((b) => `${b.text} (${b.kind})`)]],
    ['Plan', steps.length ? steps : ['Discovery and baseline', 'Design and approvals', 'Bounded pilot', 'Measure and decide']],
    [
      'Who does what',
      [
        `${owner}: owns the decision and approves each stage.`,
        `${delivery}: discovery, build and handover.`,
        d?.presales ? `${d.presales.team} · ${d.presales.practice}: answers questions before you commit.` : 'Redington pre-sales: answers questions before you commit.',
        'Your data and security owners: grant access and sign off controls.',
      ],
    ],
    ['Readiness today', [`${rd.pct}% published. Still to confirm: ${rd.stages.filter((s) => s.ok < 1).map((s) => s.name).join(', ') || 'nothing'}.`]],
  ];
}

export function renderPlan(it, sections) {
  return h(
    'div',
    { class: 'plan' },
    sections.map(([t, rows]) => [h('h4', null, t), rows.length > 1 ? h(t === 'Plan' ? 'ol' : 'ul', null, rows.map((r) => h('li', null, r))) : h('p', { style: { margin: 0, fontSize: '.9rem' } }, rows[0])]),
  );
}

export function downloadPlan(it, sections) {
  const md =
    `# Mission plan: ${it.t}\n\n_Drafted on Buzzar · ${new Date().toLocaleDateString('en-GB')} · advisory only, generated from the published listing_\n\n` +
    sections.map(([t, rows]) => `## ${t}\n\n${rows.map((r, i) => (t === 'Plan' ? `${i + 1}. ${r}` : `- ${r}`)).join('\n')}\n`).join('\n') +
    `\nListing: ${location.origin}${location.pathname}#/listing/${it.slug}\n`;
  const a = h('a', { href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), download: `buzzar-mission-plan-${it.slug}.md` });
  document.body.append(a);
  a.click();
  a.remove();
}

export const skuLine = (s) => (s ? `${s.code} · ${s.edition || s.name} · ${label.model(s.model)}, ${label.unit(s.unit).toLowerCase()}` : '');
