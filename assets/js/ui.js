// DOM helpers, icons, art and small UI pieces. Data from the catalogue is only ever written with
// textContent (through h()), never as HTML. innerHTML is used only for the constant SVG strings below.

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else el.style[sk] = sv;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v; // constant markup only
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const fmt = (n) => new Intl.NumberFormat('en').format(n);
export const plural = (n, one, many = one + 's') => `${fmt(n)} ${n === 1 ? one : many}`;

// ---------- icons (stroke icons drawn on a 24px grid) ----------
const P = {
  SW: '<path d="M8 8 4 12l4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  DNA: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/>',
  CLD: '<path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.2 9.2 4.5 4.5 0 0 0 7 18Z"/>',
  SEC: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  AI: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  bank: '<path d="M3 10h18L12 4 3 10ZM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  cap: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  tower: '<path d="M12 10v11M8 21h8M8.5 6.5a5 5 0 0 1 7 0M5.6 3.6a9 9 0 0 1 12.8 0"/><circle cx="12" cy="9" r="1"/>',
  pad: '<path d="M7 8h10a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L14 14h-4l-1.6 1.8A3 3 0 0 1 3 14v-2a4 4 0 0 1 4-4Z"/><path d="M8 11v2M7 12h2M16 11h.01M17 13h.01"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 13h18"/>',
  columns: '<path d="M3 9h18L12 4 3 9ZM5 9v9M10 9v9M14 9v9M19 9v9M3 20h18"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
  truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  plane: '<path d="M21 15.5 13 11V5.5a1.5 1.5 0 0 0-3 0V11l-8 4.5V17l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-4.5l8 2.5v-1.5Z"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19 13 11"/>',
  car: '<path d="M5 16V12l2-5h10l2 5v4M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1"/><circle cx="16.5" cy="16" r="1"/>',
  crane: '<path d="M6 21V4h2v17M4 21h8M8 5h13M17 5v6M15 11h4v3h-4z"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  drop: '<path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  compare: '<path d="M4 7h11M4 12h16M4 17h8"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 13l-3-3 4-5c3-3 7-3 10-3 0 3 0 7-3 10l-5 4-3-3Z"/><circle cx="15" cy="9" r="1.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
};
export function icon(name, cls) {
  const s = h('span', { class: cls || 'i', 'aria-hidden': 'true' });
  s.innerHTML = `<svg viewBox="0 0 24 24">${P[name] || P.spark}</svg>`;
  return s.firstChild;
}
export const iconMarkup = (name) => P[name] || P.spark;

// ---------- brand mark: a bee inside a honeycomb cell ----------
export const MARK = `<svg viewBox="0 0 40 44" aria-hidden="true">
  <path d="M20 1.5 37.5 11.5v21L20 42.5 2.5 32.5v-21Z" fill="var(--green)"/>
  <path d="M20 6.5 33 14v16l-13 7.5L7 30V14Z" fill="none" stroke="var(--honey)" stroke-width="1.4" opacity=".55"/>
  <g transform="translate(20 23)">
    <g class="bee-wing" fill="var(--paper)" opacity=".92">
      <ellipse cx="-3.5" cy="-8" rx="4.2" ry="6.4" transform="rotate(-28 -3.5 -8)"/>
      <ellipse cx="3.5" cy="-8" rx="4.2" ry="6.4" transform="rotate(28 3.5 -8)"/>
    </g>
    <ellipse cx="0" cy="1" rx="7" ry="8.6" fill="var(--honey)"/>
    <path d="M-6.6 -1.5h13.2M-6.6 3.5h13.2" stroke="var(--green)" stroke-width="2.4"/>
    <circle cx="0" cy="-8.4" r="3.6" fill="var(--honey)"/>
  </g>
</svg>`;

export const BEE = `<svg viewBox="-24 -24 48 48" aria-hidden="true">
  <g class="bee-wing" fill="#fff" opacity=".85" stroke="#1d5a39" stroke-width=".8">
    <ellipse cx="-3" cy="-10" rx="5" ry="9" transform="rotate(-25 -3 -10)"/>
    <ellipse cx="4" cy="-9" rx="4" ry="7.5" transform="rotate(20 4 -9)"/>
  </g>
  <ellipse cx="-2" cy="0" rx="11" ry="7.5" fill="#f2b54e" stroke="#1b1405" stroke-width="1.2"/>
  <path d="M-6 -6.6v13.2M-1 -7.4v14.8M4 -6.6v13.2" stroke="#1b1405" stroke-width="2.2"/>
  <path d="M-13 0l-4 0" stroke="#1b1405" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="10" cy="-1" r="5" fill="#1b1405"/>
  <circle cx="12" cy="-2.5" r="1.3" fill="#fff"/>
  <path d="M11 -5q3 -6 6 -5M13 -3q5 -3 6 -1" stroke="#1b1405" stroke-width="1.1" fill="none" stroke-linecap="round"/>
</svg>`;

// ---------- deterministic art per listing ----------
function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return x >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), (s >>> 0) / 4294967296);
}
const hexPath = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
};
export { hexPath };

export function listingArt(item) {
  const r = rng(hash(item.id));
  const W = 500;
  const H = 400;
  const R = 34;
  const dx = R * 1.5;
  const dy = R * Math.sqrt(3);
  let cells = '';
  for (let col = -1; col < W / dx + 1; col++) {
    for (let row = -1; row < H / dy + 1; row++) {
      const cx = col * dx;
      const cy = row * dy + (col % 2 ? dy / 2 : 0);
      const v = r();
      const dist = Math.hypot(cx - W * 0.62, cy - H * 0.5) / W;
      if (v < 0.13 - dist * 0.05) cells += `<path d="${hexPath(cx, cy, R - 3)}" fill="#f2b54e" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
      else if (v < 0.42) cells += `<path d="${hexPath(cx, cy, R - 3)}" fill="#fff" opacity="${(0.03 + r() * 0.08).toFixed(2)}"/>`;
      else cells += `<path d="${hexPath(cx, cy, R - 3)}" fill="none" stroke="#fff" stroke-opacity=".08"/>`;
    }
  }
  const glyph = iconMarkup(item.c);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id="g${item.id.slice(0, 6)}" cx=".62" cy=".5" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    ${cells}
    <rect width="${W}" height="${H}" fill="url(#g${item.id.slice(0, 6)})"/>
    <g transform="translate(${W * 0.62} ${H * 0.5})">
      <path d="${hexPath(0, 0, 96)}" fill="#fffdf8" opacity=".96"/>
      <path d="${hexPath(0, 0, 112)}" fill="none" stroke="#f2b54e" stroke-width="2" stroke-dasharray="3 7"/>
      <g transform="translate(-48 -48) scale(4)" fill="none" stroke="#15241b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
    </g>
  </svg>`;
}

// ---------- imagery ----------
const CAT_IMG = { CLD: 'cloud', DNA: 'data', AI: 'ai', SEC: 'security', SW: 'software' };
export const catImg = (code) => `assets/img/${CAT_IMG[code] || 'hero'}.webp`;
// every industry has its own photograph; every sub capability has its own glass object
export const indImg = (k) => `assets/img/photo/${k}.webp`;
export const itemImg = (it) => it?._img || (it?.sc?.[0] ? `assets/img/sub/${it.sc[0].replace(':', '-')}.webp` : catImg(it?.c));
export function img(src, alt = '', attrs = {}) {
  const el = h('img', { src, alt, loading: 'lazy', decoding: 'async', ...attrs });
  // a listing photo that is not there yet falls back: service photo, then product photo, then the capability picture
  if (src.includes('img/svc/') || src.includes('img/prod/'))
    el.addEventListener('error', () => {
      const s = el.getAttribute('src');
      if (s.includes('img/svc/')) el.src = s.replace('img/svc/', 'img/prod/');
      else if (s.includes('img/prod/')) el.src = s.replace(/img\/prod\/(.+?)--.*$/, 'img/sub/$1.webp');
    });
  return el;
}

// ---------- monogram for providers ----------
export function monogram(name) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const txt = ((words[0] || '?')[0] + (words[1] ? words[1][0] : (words[0] || '')[1] || '')).toUpperCase();
  const hue = hash(name) % 360;
  return h('span', { class: 'mono', style: { background: `oklch(0.52 0.09 ${hue})` }, 'aria-hidden': 'true' }, txt);
}

// ---------- toast & dialog ----------
let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}
export function openDialog(...content) {
  const d = $('#dlg');
  const body = $('#dlg-body');
  body.replaceChildren(...content);
  if (!d.open) d.showModal();
  return d;
}
export const closeDialog = () => $('#dlg').close();

// ---------- local lists (saved, compare, journey) ----------
const KEY = { saved: 'bz:saved', compare: 'bz:compare', journey: 'bz:journey', requests: 'bz:requests' };
function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode: keep working for this page view */
  }
}
const listeners = new Set();
export const onListChange = (fn) => listeners.add(fn);
const emit = (which) => listeners.forEach((fn) => fn(which));

export const lists = {
  get: (k) => read(KEY[k], k === 'journey' ? {} : []),
  has: (k, id) => lists.get(k).includes(id),
  toggle(k, id, max) {
    const a = lists.get(k);
    const i = a.indexOf(id);
    if (i > -1) a.splice(i, 1);
    else {
      if (max && a.length >= max) return { ok: false, full: true };
      a.push(id);
    }
    write(KEY[k], a);
    emit(k);
    return { ok: true, on: i === -1 };
  },
  set(k, v) {
    write(KEY[k], v);
    emit(k);
  },
  stage(id, stage) {
    const j = lists.get('journey');
    if (stage) j[id] = { stage, at: new Date().toISOString() };
    else delete j[id];
    write(KEY.journey, j);
    emit('journey');
  },
  addRequest(r) {
    const a = lists.get('requests');
    a.unshift(r);
    write(KEY.requests, a.slice(0, 50));
    emit('requests');
  },
};

// ---------- highlight query terms inside text ----------
export function highlight(text, terms) {
  if (!terms || !terms.length) return [text];
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return String(text)
    .split(re)
    .map((part, i) => (i % 2 ? h('mark', null, part) : part));
}

// ---------- count-up animation ----------
export function countUp(el, to, ms = 1400) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmt(to);
    return;
  }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// reveal elements as they scroll in
const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.dispatchEvent(new CustomEvent('reveal'));
              io.unobserve(e.target);
            }
          }),
        { threshold: 0.3 },
      )
    : null;
// rise and fade sections in once as they enter the viewport (skill B7)
const rio =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              rio.unobserve(e.target);
            }
          }),
        { threshold: 0.12 },
      )
    : null;
export function revealIn(root) {
  for (const el of root.querySelectorAll('.reveal')) {
    if (!rio || matchMedia('(prefers-reduced-motion: reduce)').matches) el.classList.add('in');
    else rio.observe(el);
  }
}

export function onReveal(el, fn) {
  if (!io) return fn();
  el.addEventListener('reveal', fn, { once: true });
  io.observe(el);
}

// ---------- provider coin: a logo in a white disc, or a typographic mark ----------
export const coin = (name, size, opts) => coinSync(name, size, opts);
let _logoParts = null;
export function bindLogos(fn) {
  _logoParts = fn;
}
export function coinSync(name, size = 40, { stack = true } = {}) {
  const parts = _logoParts ? _logoParts(name) : [{ name, file: null }];
  const withLogo = parts.filter((p) => p.file);
  const show = stack && withLogo.length > 1 ? withLogo.slice(-2) : [withLogo[withLogo.length - 1] || parts[parts.length - 1]];
  const one = (p) => {
    const el = h('span', { class: 'coin' + (p.file ? '' : ' type'), style: { width: size + 'px', height: size + 'px' }, title: p.name });
    if (p.file) el.append(h('img', { src: p.file, alt: '', loading: 'lazy', decoding: 'async' }));
    else {
      const words = p.name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
      el.append(h('b', { style: { fontSize: Math.max(9, Math.round(size * 0.34)) + 'px' } }, ((words[0] || '?')[0] + (words[1] ? words[1][0] : (words[0] || '')[1] || '')).toUpperCase()));
    }
    return el;
  };
  if (show.length === 1) return one(show[0]);
  return h('span', { class: 'coins', 'aria-label': name }, show.map(one));
}
