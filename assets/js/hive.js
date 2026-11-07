// The live hive behind the home question: a honeycomb that is dense at the edges and quiet behind the text.
// Cells glow as a bee drifts through, sparkle at random, light up near the pointer and ripple out as you type.
// Paused when off screen or in a hidden tab; drawn once, still, when the visitor prefers reduced motion.

const GREEN = '31 107 69';
const HONEY = '214 158 46';

export function mountHive(host, { input } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'hive-bg';
  cv.setAttribute('aria-hidden', 'true');
  host.prepend(cv);
  const ctx = cv.getContext('2d');
  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1, R = 24, cells = [], raf = 0, visible = true, last = 0;
  const ripples = [];
  const ptr = { x: -9999, y: -9999, on: false };
  const bee = { x: 0, y: 0, t: Math.random() * 1000 };

  function layout() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    R = W < 640 ? 18 : 24;
    for (const c of [cv, base]) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    // flat topped hexagons
    const w = R * 1.5, hh = Math.sqrt(3) * R;
    const cx = W / 2, cy = H * 0.46;
    const narrow = W < 640;
    const rx = narrow ? W * 0.62 : Math.min(W * 0.34, 560), ry = narrow ? H * 0.42 : Math.min(H * 0.3, 330);
    cells = [];
    for (let col = -1, x = 0; x < W + R * 2; col++, x = col * w)
      for (let row = -1; row * hh < H + hh; row++) {
        const y = row * hh + (col & 1 ? hh / 2 : 0);
        // 0 behind the text, 1 at the edges
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        const m = Math.min(1, Math.max(0, (d - 0.55) / 0.9));
        cells.push({ x, y, m, e: 0, honey: Math.random() < 0.05 });
      }
    paintBase();
  }

  function hex(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  }

  function paintBase() {
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.lineWidth = 1;
    for (const c of cells) {
      const a = 0.07 + c.m * 0.3;
      hex(bctx, c.x, c.y, R - 2.5);
      if (c.honey && c.m > 0.35) {
        bctx.fillStyle = `rgb(${HONEY} / ${0.1 + c.m * 0.12})`;
        bctx.fill();
      } else if (c.m > 0.6 && (c.x * 7 + c.y * 3) % 11 < 1.2) {
        bctx.fillStyle = `rgb(${GREEN} / ${0.05 + c.m * 0.06})`;
        bctx.fill();
      }
      bctx.strokeStyle = `rgb(${GREEN} / ${a})`;
      bctx.stroke();
    }
  }

  function energise(x, y, radius, amount) {
    for (const c of cells) {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < radius) c.e = Math.max(c.e, amount * (1 - d / radius));
    }
  }

  function frame(t) {
    raf = 0;
    if (!cv.isConnected) return stop();
    const dt = Math.min(64, t - (last || t));
    last = t;
    // the bee: a smooth wandering path across the whole hero
    bee.t += dt * 0.00018;
    bee.x = W * (0.5 + 0.45 * Math.sin(bee.t * 1.3) * Math.cos(bee.t * 0.47));
    bee.y = H * (0.5 + 0.42 * Math.sin(bee.t * 0.9 + 1.7));
    energise(bee.x, bee.y, R * 2.6, 1);
    // sparkles
    if (Math.random() < dt / 70) {
      const c = cells[(Math.random() * cells.length) | 0];
      if (c.m > 0.15) c.e = 1;
    }
    if (ptr.on) energise(ptr.x, ptr.y, R * 4, 0.9);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += dt * 0.55;
      for (const c of cells) {
        const d = Math.abs(Math.hypot(c.x - rp.x, c.y - rp.y) - rp.r);
        if (d < R) c.e = Math.max(c.e, 0.8 * (1 - d / R) * (1 - rp.r / rp.max));
      }
      if (rp.r > rp.max) ripples.splice(i, 1);
    }
    draw(dt);
    schedule();
  }

  function draw(dt = 16) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = Math.pow(0.9975, dt);
    for (const c of cells) {
      if (c.e < 0.02) {
        c.e = 0;
        continue;
      }
      const vis = 0.3 + c.m * 0.7;
      const col = c.honey ? HONEY : GREEN;
      hex(ctx, c.x, c.y, R - 2.5);
      ctx.fillStyle = `rgb(${col} / ${c.e * 0.3 * vis})`;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgb(${col} / ${Math.min(1, 0.15 + c.e * 0.7) * vis})`;
      ctx.stroke();
      c.e *= k;
    }
    if (!still) {
      // the bee itself: a small warm glow
      const g = ctx.createRadialGradient(bee.x, bee.y, 0, bee.x, bee.y, 16);
      g.addColorStop(0, 'rgb(214 158 46 / 0.9)');
      g.addColorStop(0.35, 'rgb(214 158 46 / 0.35)');
      g.addColorStop(1, 'rgb(214 158 46 / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bee.x, bee.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function schedule() {
    if (!raf && visible && !document.hidden && !still) raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  }
  const onVis = () => ((last = 0), schedule());

  const ro = new ResizeObserver(() => {
    layout();
    draw();
  });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    last = 0;
    schedule();
  });
  io.observe(cv);
  document.addEventListener('visibilitychange', onVis);

  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    ptr.x = e.clientX - r.left;
    ptr.y = e.clientY - r.top;
    ptr.on = true;
  });
  host.addEventListener('pointerleave', () => (ptr.on = false));
  if (input)
    input.addEventListener('input', () => {
      const hr = host.getBoundingClientRect(), ir = input.getBoundingClientRect();
      ripples.push({ x: ir.left - hr.left + ir.width / 2, y: ir.top - hr.top + ir.height / 2, r: 0, max: Math.max(W, H) * 0.6 });
      if (ripples.length > 4) ripples.shift();
    });

  layout();
  if (still) {
    for (const c of cells) if (c.m > 0.3 && Math.random() < 0.06) c.e = 0.6 + Math.random() * 0.4;
    draw();
  } else schedule();
}
