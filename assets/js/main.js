import { $, $$, h, onListChange, toast, fmt } from './ui.js';
import { load, getMeta, all } from './data.js';
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
  providers: () => import('./views/browse.js'),
  'how-it-works': () => import('./views/about.js'),
  partners: () => import('./views/about.js'),
  agents: () => import('./views/about.js'),
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
  // navigation state
  const type = r.params.get('type');
  for (const a of $$('.nav a')) a.classList.toggle('on', (r.name === 'catalogue' && a.dataset.nav === type) || a.dataset.nav === r.name);
  if (!r.params.get('keep')) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  document.title = (wrap.querySelector('h1')?.textContent?.trim() ? wrap.querySelector('h1').textContent.trim().replace(/\s+/g, ' ') + ' · ' : '') + 'Buzzar';
  if (r.name === '') document.title = 'Buzzar — Where expertise meets opportunity';
  closeMenu();
  compareTray();
  main.focus({ preventScroll: true });
}

function notFound() {
  return h(
    'section',
    { class: 'wrap section' },
    h('div', { class: 'empty' }, h('p', { class: 'eyebrow' }, 'Off the flight path'), h('h1', null, 'This cell is empty.'), h('p', null, 'The page you were looking for is not in the hive.'), h('a', { class: 'btn primary', href: '#/' }, 'Back to Buzzar')),
  );
}

// ---------- chrome ----------
function openMenu() {
  $('#drawer').hidden = false;
  $('[data-action="menu"]').setAttribute('aria-expanded', 'true');
  $('.drawer-x').focus();
}
function closeMenu() {
  $('#drawer').hidden = true;
  $('[data-action="menu"]').setAttribute('aria-expanded', 'false');
}

function updateBadges(bump) {
  for (const [k, sel] of [
    ['compare', '[data-count="compare"]'],
    ['saved', '[data-count="saved"]'],
  ]) {
    let n = 0;
    try {
      n = (JSON.parse(localStorage.getItem('bz:' + k)) || []).length;
    } catch {}
    const b = $(sel);
    b.textContent = n;
    b.toggleAttribute('data-zero', !n);
    if (bump === k) {
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
    }
  }
}

function wire() {
  // spotlight: cards glow where the cursor is
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target.closest?.('.spot');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action;
    if (act === 'menu') openMenu();
    else if (act === 'menu-close') closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      const i = $('#hdr-ask-input');
      if (i.offsetParent) {
        e.preventDefault();
        i.focus();
      }
    }
  });
  $('#hdr-ask').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#hdr-ask-input').value.trim();
    if (!q) return go('advisor');
    $('#hdr-ask-input').value = '';
    go('advisor?q=' + encodeURIComponent(q));
  });
  const hdr = $('#hdr');
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), { passive: true });
  onListChange((which) => {
    updateBadges(which);
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
  $('#main').replaceChildren(h('div', { class: 'thinking', style: { padding: '120px' } }, h('span'), h('span'), h('span')));
  try {
    await load();
  } catch (e) {
    console.error(e);
    $('#main').replaceChildren(h('section', { class: 'wrap section' }, h('div', { class: 'empty' }, h('h1', null, 'The hive is quiet.'), h('p', null, 'The catalogue could not be loaded. Serve this folder over HTTP (for example: npx serve .) and try again.'))));
    return;
  }
  const m = getMeta();
  // "NEW" means updated in the last week of the catalogue's own history
  // — but only when it distinguishes something (in a bulk import every listing shares one date)
  const latest = all().reduce((a, x) => (x.u > a ? x.u : a), '');
  const recent = all().filter((x) => latest && (new Date(latest) - new Date(x.u)) / 864e5 <= 7).length;
  window.__bzBuilt = recent / Math.max(1, all().length) < 0.25 ? latest : null;
  const mini = $('.mini-orb');
  if (mini) import('./orb.js').then(({ createOrb }) => createOrb(mini, { halo: false, density: 1 }));
  $('#ftr-meta').textContent = `${fmt(m.total)} listings · catalogue snapshot ${new Date(m.builtAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  render();
})();
