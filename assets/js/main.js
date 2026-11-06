import { $, $$, h, onListChange, fmt, revealIn, bindLogos } from './ui.js';
import { load, getMeta, all, match, TYPE, catLabel, logoParts } from './data.js';
import { compareTray, syncToggles } from './components.js';

const routes = {
  '': () => import('./views/home.js'),
  catalogue: () => import('./views/catalogue.js'),
  listing: () => import('./views/listing.js'),
  discover: () => import('./views/discover.js'),
  ask: () => import('./views/advisor.js'),
  advisor: () => import('./views/advisor.js'),
  compare: () => import('./views/lists.js'),
  saved: () => import('./views/lists.js'),
  journey: () => import('./views/lists.js'),
  industries: () => import('./views/browse.js'),
  providers: () => import('./views/providers.js'),
  'how-it-works': () => import('./views/about.js'),
  partners: () => import('./views/about.js'),
  agents: () => import('./views/about.js'),
  privacy: () => import('./views/about.js'),
  terms: () => import('./views/about.js'),
};

export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', args: parts.slice(1), params: new URLSearchParams(qs || '') };
}

export function go(path, { replace } = {}) {
  const url = '#/' + path.replace(/^#?\/?/, '');
  if (replace) history.replaceState(null, '', url);
  else location.hash = url;
  if (replace) render();
}

let renderId = 0;
async function render() {
  const id = ++renderId;
  const r = parseHash();
  const main = $('#main');
  const loader = routes[r.name];
  let view;
  try {
    view = loader ? await loader() : null;
  } catch (e) {
    console.error(e);
  }
  if (id !== renderId) return;
  const node = view ? await view.default(r) : notFound();
  if (id !== renderId) return;
  const wrap = h('div', { class: 'view' }, node);
  main.replaceChildren(wrap);
  const type = r.params.get('type');
  for (const a of $$('.nav a')) {
    const on = (r.name === 'catalogue' && a.dataset.nav === type) || a.dataset.nav === r.name;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (!r.params.get('keep')) window.scrollTo({ top: 0, behavior: 'instant' });
  const h1 = wrap.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ');
  document.title = r.name === '' ? 'Buzzar · Where expertise meets opportunity' : `${h1 ? h1 + ' · ' : ''}Buzzar`;
  closeMenu();
  compareTray();
  revealIn(wrap);
  main.focus({ preventScroll: true });
}

function notFound() {
  return h(
    'section',
    { class: 'wrap nf' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Page not found'), h('h1', { class: 'heading-2' }, 'This aisle is empty.'), h('p', { class: 'muted', style: { margin: '0 0 24px' } }, 'The page you followed has moved or never existed. Search the catalogue, or tell Sami what you were looking for.'), h('div', { class: 'chips', style: { justifyContent: 'center', gap: '8px' } }, h('a', { class: 'btn primary', href: '#/advisor' }, 'Talk to Sami'), h('a', { class: 'btn', href: '#/' }, 'Back to home'))),
  );
}

// ---------- menu (full height, staggered links) ----------
function openMenu() {
  const d = $('#drawer');
  d.hidden = false;
  $$('.drawer-panel a').forEach((a, i) => (a.style.transitionDelay = `${Math.min(i * 60, 400)}ms`));
  requestAnimationFrame(() => d.classList.add('open'));
  $('[data-action="menu"]').setAttribute('aria-expanded', 'true');
}
function closeMenu() {
  const d = $('#drawer');
  if (d.hidden) return;
  d.classList.remove('open');
  $$('.drawer-panel a').forEach((a) => (a.style.transitionDelay = '0ms'));
  $('[data-action="menu"]').setAttribute('aria-expanded', 'false');
  setTimeout(() => !d.classList.contains('open') && (d.hidden = true), 300);
}

// ---------- command menu (⌘K) ----------
const PAGES = [
  ['Talk to Sami', '#/advisor', 'ph-chats-circle', 'Advisor'],
  ['Search the catalogue', '#/catalogue', 'ph-squares-four', 'Catalogue'],
  ['Products', '#/catalogue?type=product', 'ph-package', 'Catalogue'],
  ['Services', '#/catalogue?type=service', 'ph-handshake', 'Catalogue'],
  ['Accelerators', '#/catalogue?type=accelerator', 'ph-lightning', 'Catalogue'],
  ['Buyable on AWS Marketplace', '#/catalogue?buy=1', 'ph-shopping-bag', 'Catalogue'],
  ['Guided discovery', '#/discover', 'ph-compass', 'Discover'],
  ['Industries', '#/industries', 'ph-buildings', 'Discover'],
  ['Providers', '#/providers', 'ph-identification-badge', 'Discover'],
  ['Compare', '#/compare', 'ph-scales', 'Your lists'],
  ['Saved', '#/saved', 'ph-heart', 'Your lists'],
  ['My journey', '#/journey', 'ph-path', 'Your lists'],
  ['How it works', '#/how-it-works', 'ph-info', 'About'],
  ['For partners', '#/partners', 'ph-storefront', 'About'],
  ['For agents', '#/agents', 'ph-code', 'About'],
];
let cmdSel = 0;
let cmdItems = [];
function cmdkOpen() {
  const c = $('#cmdk');
  c.hidden = false;
  requestAnimationFrame(() => c.classList.add('open'));
  const i = $('#cmdk-input');
  i.value = '';
  cmdkPaint('');
  setTimeout(() => i.focus(), 20);
}
function cmdkClose() {
  const c = $('#cmdk');
  if (c.hidden) return;
  c.classList.remove('open');
  setTimeout(() => (c.hidden = true), 300);
}
function cmdkPaint(q) {
  const list = $('#cmdk-list');
  const items = [];
  const t = q.trim();
  if (t) items.push({ group: 'Ask', label: `Ask Sami: “${t}”`, href: '#/advisor?q=' + encodeURIComponent(t), icon: 'ph-chats-circle', meta: 'Advisor' });
  if (t.length > 1) {
    const r = match(t, { limit: 6 });
    for (const p of r.picks) items.push({ group: 'Listings', label: p.it.t, href: `#/listing/${p.it.slug}`, icon: 'ph-cube', meta: `${TYPE[p.it.y].label} · ${catLabel(p.it.c)}` });
    if (r.total > 6) items.push({ group: 'Listings', label: `See all ${fmt(r.total)} results`, href: '#/catalogue?q=' + encodeURIComponent(t), icon: 'ph-arrow-right', meta: 'Catalogue' });
  }
  const low = t.toLowerCase();
  for (const [label, href, icon, meta] of PAGES) if (!t || label.toLowerCase().includes(low)) items.push({ group: t ? 'Pages' : meta, label, href, icon, meta: t ? meta : '' });
  cmdItems = items;
  cmdSel = 0;
  list.replaceChildren();
  let lastGroup = '';
  items.forEach((it, i) => {
    if (it.group !== lastGroup) {
      list.append(h('div', { class: 'cmdk-group' }, it.group));
      lastGroup = it.group;
    }
    const b = h('button', { type: 'button', class: 'cmdk-item', role: 'option', 'aria-selected': String(i === 0), 'data-i': i }, h('i', { class: `ph ${it.icon}`, 'aria-hidden': 'true' }), h('span', null, it.label), it.meta ? h('small', null, it.meta) : null);
    b.addEventListener('click', () => cmdkGo(i));
    b.addEventListener('pointermove', () => cmdkSelect(i));
    list.append(b);
  });
  if (!items.length) list.append(h('p', { class: 'caption-2', style: { padding: '12px' } }, 'Nothing matches. Press Enter to ask Sami instead.'));
}
function cmdkSelect(i) {
  cmdSel = Math.max(0, Math.min(cmdItems.length - 1, i));
  for (const b of $$('.cmdk-item')) b.setAttribute('aria-selected', String(+b.dataset.i === cmdSel));
  $(`.cmdk-item[data-i="${cmdSel}"]`)?.scrollIntoView({ block: 'nearest' });
}
function cmdkGo(i) {
  const it = cmdItems[i];
  const q = $('#cmdk-input').value.trim();
  cmdkClose();
  if (it) location.hash = it.href;
  else if (q) go('advisor?q=' + encodeURIComponent(q));
}

function updateBadges() {
  for (const k of ['compare', 'saved']) {
    let n = 0;
    try {
      n = (JSON.parse(localStorage.getItem('bz:' + k)) || []).length;
    } catch {}
    const b = $(`[data-count="${k}"]`);
    b.textContent = n;
    b.toggleAttribute('data-zero', !n);
  }
}

function wire() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'menu') ($('#drawer').hidden ? openMenu() : closeMenu());
    else if (act === 'cmdk') cmdkOpen();
  });
  $('#drawer').addEventListener('click', (e) => {
    if (e.target.closest('a')) closeMenu();
  });
  $('#cmdk').addEventListener('click', (e) => {
    if (e.target === $('#cmdk')) cmdkClose();
  });
  $('#cmdk-input').addEventListener('input', (e) => cmdkPaint(e.target.value));
  $('#cmdk-input').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), cmdkSelect(cmdSel + 1));
    else if (e.key === 'ArrowUp') (e.preventDefault(), cmdkSelect(cmdSel - 1));
    else if (e.key === 'Enter') (e.preventDefault(), cmdkGo(cmdSel));
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#cmdk').hidden ? cmdkOpen() : cmdkClose();
    } else if (e.key === 'Escape') {
      cmdkClose();
      closeMenu();
    } else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      cmdkOpen();
    }
  });
  const hdr = $('#hdr');
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), { passive: true });
  onListChange(() => {
    updateBadges();
    syncToggles();
    compareTray();
  });
  addEventListener('storage', () => {
    updateBadges();
    syncToggles();
    compareTray();
  });
  updateBadges();
  addEventListener('hashchange', render);
}

(async function boot() {
  wire();
  $('#main').replaceChildren(h('div', { class: 'wrap', style: { padding: '96px 0' } }, h('div', { class: 'live-skel', style: { height: '48px', width: '50%' } }), h('div', { class: 'live-skel', style: { height: '24px', width: '70%', marginTop: '16px' } }), h('div', { class: 'live-skel', style: { height: '240px', marginTop: '32px' } })));
  try {
    await load();
  } catch (e) {
    console.error(e);
    $('#main').replaceChildren(h('section', { class: 'wrap nf' }, h('div', null, h('h1', { class: 'heading-3' }, 'The catalogue could not load.'), h('p', { class: 'muted' }, 'Serve this folder over HTTP, for example with python3 -m http.server, and reload.'))));
    return;
  }
  bindLogos(logoParts);
  const m = getMeta();
  // "NEW" only when it distinguishes something (in a bulk import every listing shares one date)
  const latest = all().reduce((a, x) => (x.u > a ? x.u : a), '');
  const recent = all().filter((x) => latest && (new Date(latest) - new Date(x.u)) / 864e5 <= 7).length;
  window.__bzBuilt = recent / Math.max(1, all().length) < 0.25 ? latest : null;
  const mini = $('.mini-orb');
  if (mini) import('./orb.js').then(({ createOrb }) => createOrb(mini, { halo: false, density: 1 }));
  $('#ftr-meta').textContent = `Buzzar is a business solution marketplace run by Redington · ${fmt(m.total)} listings · snapshot ${new Date(m.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  render();
})();
