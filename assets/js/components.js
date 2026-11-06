import { h, icon, lists, toast, highlight, openDialog, closeDialog, $, img, catImg } from './ui.js';
import { TYPE, catLabel, get, industryLabel } from './data.js';

export const MAX_COMPARE = 3;

export function catChip(code) {
  return h('span', { class: 'chip cat', style: { '--cat': `var(--c-${code})` } }, catLabel(code));
}

export function toggleBtn(kind, id, small) {
  const isSave = kind === 'saved';
  const b = h(
    'button',
    {
      type: 'button',
      class: small ? 'icon-btn' : 'btn',
      'data-act': isSave ? 'save' : 'compare',
      'data-id': id,
      'aria-pressed': String(lists.has(kind, id)),
      'aria-label': isSave ? 'Save' : 'Add to compare',
      title: isSave ? 'Save' : 'Compare',
    },
    icon(isSave ? 'heart' : 'compare'),
    small ? null : isSave ? 'Save' : 'Compare',
  );
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = lists.toggle(kind, id, isSave ? 0 : MAX_COMPARE);
    if (r.full) return toast(`Compare holds ${MAX_COMPARE}. Remove one first.`);
    const it = get(id);
    toast(r.on ? `${isSave ? 'Saved' : 'Added to compare'}: ${it?.t}` : `${isSave ? 'Removed from saved' : 'Removed from compare'}`);
  });
  return b;
}

// keep every save/compare button on screen in sync
export function syncToggles() {
  for (const b of document.querySelectorAll('[data-act][data-id]')) {
    const kind = b.dataset.act === 'save' ? 'saved' : 'compare';
    b.setAttribute('aria-pressed', String(lists.has(kind, b.dataset.id)));
  }
}

// ---------- shared vocabulary (one name per thing, everywhere) ----------
export const KIND = {
  product: { label: 'Product', lane: 'Products' },
  service: { label: 'Service', lane: 'Services' },
  accelerator: { label: 'Accelerator', lane: 'Accelerators' },
};
export const kindTag = (y) => h('span', { class: `kind k-${y}` }, KIND[y]?.label || y);
export const providerLine = (it) => (it.k === 'distributor' ? 'Provided by Redington' : `By ${it.p} · listing provided by Redington`);
export function fitLine(it) {
  const parts = [];
  const ind = it.i.filter((x) => x !== 'cross-industry');
  parts.push(ind.length ? ind.slice(0, 2).map(industryLabel).join(', ') + (ind.length > 2 ? ` +${ind.length - 2}` : '') : 'Cross-industry');
  if (it.r.length) parts.push(it.r.join(', '));
  if (it.pl.length) parts.push(it.pl.slice(0, 3).join(', ') + (it.pl.length > 3 ? ' +' : ''));
  return parts.join(' · ');
}
export function isNew(it) {
  const built = window.__bzBuilt;
  if (!it.u || !built) return false;
  return (new Date(built) - new Date(it.u)) / 864e5 <= 7;
}

const ACT_ICON = {
  compare: '<svg viewBox="0 0 24 24"><path d="M4 9c2.5-2 5.5-2 8 0s5.5 2 8 0M4 15c2.5-2 5.5-2 8 0s5.5 2 8 0"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
};
function tileAct(kind, id) {
  const isSave = kind === 'saved';
  const b = h('button', { type: 'button', class: 'act', 'data-act': isSave ? 'save' : 'compare', 'data-id': id, 'aria-pressed': String(lists.has(kind, id)), html: ACT_ICON[isSave ? 'save' : 'compare'] }, isSave ? 'Save' : 'Compare');
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = lists.toggle(kind, id, isSave ? 0 : MAX_COMPARE);
    if (r.full) return toast(`Compare holds ${MAX_COMPARE}. Remove one first.`);
    toast(r.on ? `${isSave ? 'Saved' : 'Added to compare'}: ${get(id)?.t}` : isSave ? 'Removed from saved' : 'Removed from compare');
  });
  return b;
}

// The catalogue tile, top to bottom as the handover describes it
export function card(it, opts = {}) {
  const terms = opts.terms || [];
  const href = `#/listing/${it.slug}`;
  return h(
    'article',
    { class: `tile k-${it.y}` },
    h('div', { class: 'tile-top' }, kindTag(it.y), h('span', { class: 'open', 'aria-hidden': 'true' }, '↗')),
    h('h3', null, h('a', { href }, ...highlight(it.t, terms))),
    it.aws || isNew(it) ? h('div', { class: 'badges' }, it.aws ? h('span', { class: 'badge-sku' }, 'Buyable on AWS Marketplace') : null, isNew(it) ? h('span', { class: 'badge-new' }, 'NEW') : null) : null,
    h('p', { class: 'shelf' }, `${catLabel(it.c)} · ${KIND[it.y].label} · Version ${it.v || 1}`),
    h('p', { class: 'fitline' }, fitLine(it)),
    h('p', { class: 'trustline' }, providerLine(it)),
    h('p', { class: 'sum' }, ...highlight(it.s, terms)),
    h('div', { class: 'tile-acts' }, tileAct('compare', it.id), tileAct('saved', it.id), h('a', { class: 'act view', href }, 'View', h('span', { 'aria-hidden': 'true' }, ' →'))),
  );
}

export function compareTray() {
  const tray = $('#compare-tray');
  const ids = lists.get('compare');
  if (!ids.length || location.hash.startsWith('#/compare')) {
    tray.hidden = true;
    return;
  }
  tray.hidden = false;
  tray.replaceChildren(
    h('div', { class: 'slots', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => h('span', { class: 'slot' + (ids[i] ? ' full' : '') }))),
    h('span', { class: 'small' }, `${ids.length} of ${MAX_COMPARE} to compare`),
    h('a', { class: 'btn primary sm', href: '#/compare' }, 'Compare', h('span', { class: 'arr' }, '→')),
    h('button', { class: 'x', type: 'button', onclick: () => lists.set('compare', []) }, 'Clear'),
  );
}

export const REQUEST_TYPES = [
  { key: 'discovery', label: 'Request a discovery call', hint: 'Talk your need through with a Redington specialist.' },
  { key: 'standard', label: 'Request a standard proposal', hint: 'Scope and pricing for the solution as listed.' },
  { key: 'custom', label: 'Submit requirements for a custom proposal', hint: 'Describe what you need changed or combined.' },
  { key: 'private-offer', label: 'Request a private offer', hint: 'Pricing for a specific tier through your marketplace.' },
];

// opts.bundle: [{ it, sku }] sends a whole Solution as one private-offer request; opts.need prefills the brief
export function requestDialog(it, preset = 'discovery', sku, opts = {}) {
  const bundle = opts.bundle || null;
  const form = h(
    'form',
    { class: 'form' },
    bundle
      ? h('div', { class: 'honest', style: { display: 'block' } }, h('b', null, 'One private-offer request for:'), h('ul', { style: { margin: '6px 0 0', paddingLeft: '1.1em' } }, bundle.map((b) => h('li', null, `${b.it.t}${b.sku ? ` — ${b.sku}` : ''}`))))
      : h('div', { class: 'req-opts', role: 'radiogroup', 'aria-label': 'Request type' }, REQUEST_TYPES.filter((t) => t.key !== 'private-offer' || sku).map((t) => h('label', { class: 'req-opt' }, h('input', { type: 'radio', name: 'type', value: t.key, checked: t.key === preset }), h('div', null, h('b', null, t.label), h('span', null, t.hint))))),
    h('div', { class: 'row' }, h('label', null, 'Your name', h('input', { name: 'name', required: true, autocomplete: 'name' })), h('label', null, 'Work email', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' }))),
    h('div', { class: 'row' }, h('label', null, 'Company', h('input', { name: 'company', required: true, autocomplete: 'organization' })), h('label', null, 'Country', h('select', { name: 'country' }, ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'India', 'Egypt', 'Kenya', 'Nigeria', 'South Africa', 'Other'].map((c) => h('option', null, c))))),
    h('label', null, 'What are you trying to achieve?', h('textarea', { name: 'need', rows: 3, placeholder: 'The outcome you want, timelines, and anything we should know.' }, opts.need || '')),
    h('p', { class: 'note' }, 'On Buzzar, requests need Microsoft Entra sign-in and receive a CRM reference. In this preview the request is kept on this device under My journey.'),
    h('button', { class: 'btn primary', type: 'submit' }, 'Send request', h('span', { class: 'arr' }, '→')),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const ref = 'BZR-' + Date.now().toString(36).toUpperCase().slice(-6);
    const req = { id: crypto.randomUUID?.() || String(Date.now()), ref, listing: it.id, title: bundle ? `Solution: ${bundle.map((b) => b.it.t).join(' + ')}` : it.t, sku: sku || null, items: bundle ? bundle.map((b) => ({ id: b.it.id, sku: b.sku })) : null, ...fd, type: bundle ? 'private-offer' : fd.type, at: new Date().toISOString(), status: 'Submitted' };
    const { CONFIG } = await import('./config.js');
    if (CONFIG.requestEndpoint) {
      try {
        const r = await fetch(CONFIG.requestEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) });
        if (!r.ok) throw new Error(r.status);
        req.status = 'Sent';
      } catch {
        req.status = 'Saved, not sent';
      }
    }
    lists.addRequest(req);
    for (const x of bundle ? bundle.map((b) => b.it) : [it]) lists.stage(x.id, 'talking');
    closeDialog();
    toast(`Request ${ref} saved. Track it in My journey.`);
  });
  openDialog(h('p', { class: 'eyebrow' }, bundle ? 'Send this solution' : 'Work with Redington'), h('h2', { id: 'dlg-title' }, bundle ? opts.title || 'Your solution' : it.t), sku ? h('p', { class: 'muted small' }, `Edition: ${sku}`) : null, form);
}
