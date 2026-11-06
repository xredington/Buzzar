// The Sami B orb: the Buzzar "B" rendered as a field of particles that react to Sami's state.
//   idle      particles rest on the letterform and breathe
//   listening particles ripple outward from the centre
//   thinking  particles loosen into a slow swirl and re-form
//   talking   the letterform pulses in rhythm
// Purposeful motion only: it tells the buyer what Sami is doing. Honours prefers-reduced-motion.

const LOGO = 'assets/img/logo.png';
let maskPromise;

function loadMask() {
  if (!maskPromise)
    maskPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const S = 96;
        const c = document.createElement('canvas');
        c.width = S;
        c.height = S;
        const x = c.getContext('2d', { willReadFrequently: true });
        const w = (img.width / img.height) * S * 0.86;
        x.drawImage(img, (S - w) / 2, S * 0.07, w, S * 0.86);
        const data = x.getImageData(0, 0, S, S).data;
        const pts = [];
        for (let y = 0; y < S; y++)
          for (let xx = 0; xx < S; xx++) {
            const a = data[(y * S + xx) * 4 + 3];
            const g = data[(y * S + xx) * 4 + 1];
            if (a > 140 && g > 90 && data[(y * S + xx) * 4] < 120) pts.push([xx / S - 0.5, y / S - 0.5]);
          }
        resolve(pts);
      };
      img.onerror = () => resolve([]);
      img.src = LOGO;
    });
  return maskPromise;
}

export function createOrb(canvas, { density = 1, halo = true } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state = 'idle';
  let particles = [];
  let raf = 0;
  let t0 = performance.now();
  let stateAt = t0;

  const size = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(16, r.width || canvas.width);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    return w;
  };
  let W = size();

  loadMask().then((pts) => {
    const step = Math.max(1, Math.round((pts.length / (W > 80 ? 900 : 260)) / density));
    particles = pts
      .filter((_, i) => i % step === 0)
      .map(([x, y], i) => ({
        tx: x,
        ty: y,
        x: x + (Math.random() - 0.5) * 0.6,
        y: y + (Math.random() - 0.5) * 0.6,
        seed: Math.random() * Math.PI * 2,
        r: 0.6 + Math.random() * 0.9,
        hue: Math.random(),
        i,
      }));
    if (reduce) draw(performance.now(), true);
    else loop();
  });

  function colour(p, a) {
    // AI purple through to Buzzar green, like a hologram catching light
    const mix = (p.hue + p.ty + 0.5) / 2;
    const r = Math.round(90 + (34 - 90) * mix);
    const g = Math.round(62 + (113 - 62) * mix);
    const b = Math.round(180 + (73 - 180) * mix);
    return `rgba(${r},${g},${b},${a})`;
  }

  function draw(now, still) {
    const t = (now - t0) / 1000;
    const since = (now - stateAt) / 1000;
    const S = canvas.width;
    const scale = S * 0.86;
    const cx = S / 2;
    const cy = S / 2;
    ctx.clearRect(0, 0, S, S);

    if (halo) {
      const pulse = state === 'talking' ? 0.12 + 0.06 * Math.sin(t * 9) : state === 'listening' ? 0.1 : 0.07;
      const g = ctx.createRadialGradient(cx, cy, S * 0.05, cx, cy, S * 0.5);
      g.addColorStop(0, `rgba(90,62,180,${pulse})`);
      g.addColorStop(1, 'rgba(90,62,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }

    for (const p of particles) {
      let tx = p.tx;
      let ty = p.ty;
      let a = 0.85;
      let rr = p.r;
      if (!still) {
        // breathing
        const br = 1 + 0.015 * Math.sin(t * 1.6);
        tx *= br;
        ty *= br;
        tx += 0.004 * Math.sin(t * 2 + p.seed);
        ty += 0.004 * Math.cos(t * 2.3 + p.seed);
        if (state === 'listening') {
          const d = Math.hypot(p.tx, p.ty);
          const wave = Math.sin(d * 28 - t * 7);
          tx += p.tx * 0.06 * wave;
          ty += p.ty * 0.06 * wave;
          a = 0.6 + 0.4 * (0.5 + 0.5 * wave);
        } else if (state === 'thinking') {
          const ang = Math.atan2(p.ty, p.tx) + t * 1.4 + p.seed * 0.15;
          const d = Math.hypot(p.tx, p.ty);
          const loosen = 0.5 + 0.5 * Math.sin(t * 1.8);
          const rad = d * (1 - 0.25 * loosen) + 0.05 * loosen;
          tx = tx * (1 - loosen * 0.7) + Math.cos(ang) * rad * loosen * 0.7;
          ty = ty * (1 - loosen * 0.7) + Math.sin(ang) * rad * loosen * 0.7;
          a = 0.55 + 0.35 * Math.sin(t * 3 + p.seed);
        } else if (state === 'talking') {
          const k = 1 + 0.05 * Math.sin(t * 10 + p.ty * 6) * Math.sin(t * 2.7);
          tx *= k;
          ty *= k;
          rr *= 1 + 0.25 * Math.max(0, Math.sin(t * 10 + p.seed));
        }
        // ease toward the target (re-forming after a state change feels deliberate, not jumpy)
        const ease = Math.min(1, 0.08 + since * 0.05);
        p.x += (tx - p.x) * ease;
        p.y += (ty - p.y) * ease;
      } else {
        p.x = tx;
        p.y = ty;
      }
      ctx.fillStyle = colour(p, a);
      ctx.beginPath();
      ctx.arc(cx + p.x * scale, cy + p.y * scale, rr * dpr * (S > 120 ? 1.15 : 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // keep waiting while the canvas is still being attached; stop for good once it has been removed
  let attached = false;
  let waited = 0;
  function loop() {
    if (canvas.isConnected) {
      if (!attached) W = size();
      attached = true;
      draw(performance.now());
    } else if (attached || ++waited > 600) return;
    raf = requestAnimationFrame(loop);
  }

  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => (W = size())) : null;
  ro?.observe(canvas);

  return {
    setState(s) {
      if (s === state) return;
      state = s;
      stateAt = performance.now();
      if (reduce) draw(performance.now(), true);
    },
    get state() {
      return state;
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    },
  };
}
