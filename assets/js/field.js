// The catalogue field: every listing is a dot. Five category clusters, each laid out as a sunflower
// spiral with accelerators at the core, then products, then services, so kinds read as rings.
// Typing lights up matching dots; hovering names a dot; clicking opens it.
// Canvas 2D, ~1,300 dots, transform-free drawing, honours prefers-reduced-motion.

const KIND_ORDER = { accelerator: 0, product: 1, service: 2 };
const KIND_RGB = { product: [79, 114, 184], service: [185, 113, 76], accelerator: [59, 143, 123] };
const ease = (t) => 1 - Math.pow(1 - t, 3);

export function createField(host, items, { order, onDot, onCluster, onHover } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cats = order;
  const groups = Object.fromEntries(cats.map((c) => [c, []]));
  for (const it of items) groups[it.c]?.push(it);
  for (const c of cats) groups[c].sort((a, b) => KIND_ORDER[a.y] - KIND_ORDER[b.y] || a.t.localeCompare(b.t));

  const dots = [];
  for (const c of cats) groups[c].forEach((it, i) => dots.push({ it, c, i, x: 0, y: 0, tx: 0, ty: 0, a: 1, ta: 1, r: 1, tr: 1, delay: Math.random() * 500 }));
  const centres = {};
  let W = 0;
  let H = 0;
  let S = 1;
  let hover = null;
  let mouse = null;
  let lit = null; // Map id -> level (2 strong, 1 related)
  let t0 = performance.now();
  let raf = 0;
  let hoverCluster = null;

  function layout() {
    const r = host.getBoundingClientRect();
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    // clusters live in a measured band between the heading and the ask bar
    const narrow = W < 1000;
    const side = Math.max(16, (W - 1280) / 2 + 24);
    const band = { x0: side, x1: W - side, y0: narrow ? 172 : 196, y1: H - (narrow ? 236 : 252) };
    const rows = narrow ? [cats.slice(0, 3), cats.slice(3)] : [cats];
    const unit = (c) => Math.sqrt(groups[c].length) + 1; // radius in units of S
    const GAP = narrow ? 4 : 7; // gap between clusters, in units of S
    const LABEL = 46; // px reserved under each row for labels
    const sW = Math.min(...rows.map((r) => (band.x1 - band.x0) / (r.reduce((a, c) => a + 2 * unit(c), 0) + GAP * (r.length - 1))));
    const rowUnits = rows.reduce((a, r) => a + 2 * Math.max(...r.map(unit)), 0);
    const sH = (band.y1 - band.y0 - LABEL * rows.length - 16 * (rows.length - 1)) / rowUnits;
    S = Math.max(2.4, Math.min(sW, sH, 9));
    const used = rows.reduce((a, r) => a + 2 * Math.max(...r.map(unit)) * S + LABEL, 0) + 16 * (rows.length - 1);
    let y = band.y0 + Math.max(0, (band.y1 - band.y0 - used) / 2);
    for (const r of rows) {
      const rowH = 2 * Math.max(...r.map(unit)) * S;
      const rowW = r.reduce((a, c) => a + 2 * unit(c) * S, 0) + GAP * S * (r.length - 1);
      let x = (W - rowW) / 2;
      r.forEach((c, k) => {
        const R = unit(c) * S;
        // a gentle wave on the single desktop row, so it reads as a landscape, not a chart
        const wave = rows.length === 1 ? (k % 2 ? -1 : 1) * Math.min(S * 4, (rowH - 2 * R) / 2 + S * 2) : 0;
        centres[c] = { x: x + R, y: y + rowH / 2 + wave * 0.6, R: R - S * 0.4 };
        x += 2 * R + GAP * S;
      });
      y += rowH + LABEL + 16;
    }
    for (const d of dots) {
      const ce = centres[d.c];
      const rad = S * Math.sqrt(d.i + 0.5);
      const th = d.i * 2.39996323;
      d.tx = ce.x + Math.cos(th) * rad;
      d.ty = ce.y + Math.sin(th) * rad;
      d.base = Math.max(1.4, S * 0.36);
      if (!d.x) {
        d.x = W / 2 + (Math.random() - 0.5) * 40;
        d.y = H / 2 + (Math.random() - 0.5) * 40;
      }
    }
    onLayout?.(centres);
  }
  let onLayout = null;

  let attached = false;
  function frame(now) {
    if (!canvas.isConnected) {
      if (attached) return ro.disconnect();
      raf = requestAnimationFrame(frame);
      return;
    }
    if (!attached) {
      attached = true;
      t0 = now;
      layout();
    }
    const t = now - t0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // soft cluster discs
    for (const c of cats) {
      const ce = centres[c];
      ctx.beginPath();
      ctx.arc(ce.x, ce.y, ce.R + S * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = hoverCluster === c ? 'rgba(18,18,17,0.045)' : 'rgba(18,18,17,0.022)';
      ctx.fill();
    }

    for (const d of dots) {
      const k = reduce ? 1 : ease(Math.min(1, Math.max(0, (t - d.delay) / 1100)));
      let tx = d.tx;
      let ty = d.ty;
      if (!reduce) {
        tx += Math.sin(now / 1400 + d.i) * S * 0.08;
        ty += Math.cos(now / 1700 + d.i * 1.3) * S * 0.08;
        if (mouse) {
          const dx = tx - mouse.x;
          const dy = ty - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 46 && dist > 0.1) {
            const push = (1 - dist / 46) * 7;
            tx += (dx / dist) * push;
            ty += (dy / dist) * push;
          }
        }
      }
      d.x += (tx - d.x) * (k < 1 ? k * 0.25 : 0.18);
      d.y += (ty - d.y) * (k < 1 ? k * 0.25 : 0.18);
      const level = lit ? lit.get(d.it.id) || 0 : 1;
      d.ta = lit ? (level === 2 ? 1 : level === 1 ? 0.55 : 0.1) : 0.78;
      d.tr = lit && level === 2 ? 1.9 : lit && level === 1 ? 1.2 : 1;
      if (hover === d) d.tr = 2.4;
      d.a += (d.ta - d.a) * 0.14;
      d.r += (d.tr - d.r) * 0.16;
      const [r, g, b] = KIND_RGB[d.it.y] || [120, 120, 120];
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.base * d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${(d.a * k).toFixed(3)})`;
      ctx.fill();
      if (lit && level === 2) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.base * d.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    if (hover) {
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, hover.base * hover.r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(18,18,17,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (!reduce || t < 1200) raf = requestAnimationFrame(frame);
  }

  function pick(x, y) {
    let best = null;
    let bd = 12 * 12;
    for (const d of dots) {
      if (lit && !lit.get(d.it.id)) continue;
      const dx = d.x - x;
      const dy = d.y - y;
      const q = dx * dx + dy * dy;
      if (q < bd) {
        bd = q;
        best = d;
      }
    }
    return best;
  }
  function clusterAt(x, y) {
    for (const c of cats) {
      const ce = centres[c];
      if (Math.hypot(ce.x - x, ce.y - y) < ce.R + S * 1.2) return c;
    }
    return null;
  }
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  canvas.addEventListener('pointermove', (e) => {
    mouse = local(e);
    hover = pick(mouse.x, mouse.y);
    hoverCluster = hover ? hover.c : clusterAt(mouse.x, mouse.y);
    canvas.style.cursor = hover || hoverCluster ? 'pointer' : 'default';
    onHover?.(hover ? { it: hover.it, x: hover.x, y: hover.y } : null, hoverCluster);
    if (reduce) requestAnimationFrame(frame);
  });
  canvas.addEventListener('pointerleave', () => {
    mouse = null;
    hover = null;
    hoverCluster = null;
    onHover?.(null, null);
  });
  canvas.addEventListener('click', (e) => {
    const p = local(e);
    const d = pick(p.x, p.y);
    if (d) return onDot?.(d.it);
    const c = clusterAt(p.x, p.y);
    if (c) onCluster?.(c);
  });

  const ro = new ResizeObserver(() => layout());
  ro.observe(host);
  layout();
  raf = requestAnimationFrame(frame);

  return {
    centres: () => centres,
    set onLayout(fn) {
      onLayout = fn;
      fn(centres);
    },
    highlight(map) {
      lit = map && map.size ? map : map ? new Map() : null;
      if (reduce) requestAnimationFrame(frame);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}
