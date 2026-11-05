import { h, icon, lists, toast, highlight, openDialog, closeDialog, $ } from './ui.js';
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

export function card(it, opts = {}) {
  const terms = opts.terms || [];
  const href = `#/listing/${it.slug}`;
  return h(
    'article',
    { class: 'card', style: { '--cat': `var(--c-${it.c})` } },
    h('div', { class: 'card-top' }, catChip(it.c), h('span', { class: 'chip' }, TYPE[it.y]?.label || it.y), it.b ? h('span', { class: 'chip honey' }, 'Marketplace') : null),
    h('h3', null, h('a', { href }, ...highlight(it.t, terms))),
    h('p', { class: 'by' }, it.k === 'distributor' ? `Redington` : `By ${it.p}`),
    h('p', { class: 'sum' }, ...highlight(it.s, terms)),
    h(
      'div',
      { class: 'card-foot' },
      h('span', { class: 'meta' }, it.i[0] && it.i[0] !== 'cross-industry' ? industryLabel(it.i[0]) + (it.i.length > 1 ? ` +${it.i.length - 1}` : '') : 'Cross-industry'),
      h('div', { class: 'card-acts' }, toggleBtn('compare', it.id, true), toggleBtn('saved', it.id, true)),
    ),
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
    h('a', { class: 'btn honey sm', href: '#/compare' }, 'Compare', h('span', { class: 'arr' }, '→')),
    h('button', { class: 'x', type: 'button', onclick: () => lists.set('compare', []) }, 'Clear'),
  );
}

export const REQUEST_TYPES = [
  { key: 'discovery', label: 'Request a discovery call', hint: 'Talk your need through with a Redington specialist.' },
  { key: 'standard', label: 'Request a standard proposal', hint: 'Scope and pricing for the solution as listed.' },
  { key: 'custom', label: 'Submit requirements for a custom proposal', hint: 'Describe what you need changed or combined.' },
  { key: 'private-offer', label: 'Request a private offer', hint: 'Pricing for a specific tier through your marketplace.' },
];

export function requestDialog(it, preset = 'discovery', sku) {
  const form = h(
    'form',
    { class: 'form' },
    h('div', { class: 'req-opts', role: 'radiogroup', 'aria-label': 'Request type' }, REQUEST_TYPES.filter((t) => t.key !== 'private-offer' || sku).map((t) => h('label', { class: 'req-opt' }, h('input', { type: 'radio', name: 'type', value: t.key, checked: t.key === preset }), h('div', null, h('b', null, t.label), h('span', null, t.hint))))),
    h('div', { class: 'row' }, h('label', null, 'Your name', h('input', { name: 'name', required: true, autocomplete: 'name' })), h('label', null, 'Work email', h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email' }))),
    h('div', { class: 'row' }, h('label', null, 'Company', h('input', { name: 'company', required: true, autocomplete: 'organization' })), h('label', null, 'Country', h('select', { name: 'country' }, ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain', 'India', 'Egypt', 'Kenya', 'Nigeria', 'South Africa', 'Other'].map((c) => h('option', null, c))))),
    h('label', null, 'What are you trying to achieve?', h('textarea', { name: 'need', rows: 3, placeholder: 'The outcome you want, timelines, and anything we should know.' })),
    h('p', { class: 'note' }, 'This prototype keeps your request on this device under My journey. Connect a CRM endpoint in assets/js/config.js to send it to Redington.'),
    h('button', { class: 'btn primary', type: 'submit' }, 'Send request', h('span', { class: 'arr' }, '→')),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    const req = { id: crypto.randomUUID?.() || String(Date.now()), listing: it.id, title: it.t, sku: sku || null, ...fd, at: new Date().toISOString(), status: 'Submitted' };
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
    lists.stage(it.id, 'talking');
    closeDialog();
    toast(`Request saved. Track it in My journey.`);
  });
  openDialog(h('p', { class: 'eyebrow' }, 'Work with Redington'), h('h2', { id: 'dlg-title' }, it.t), sku ? h('p', { class: 'muted small' }, `Tier: ${sku}`) : null, form);
}
