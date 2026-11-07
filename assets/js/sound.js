// Tech interface sounds, made in the browser with the Web Audio API (no audio files).
// Off until the visitor turns them on; the choice is remembered on this device.

let ctx = null, master = null, lastTick = 0;
const KEY = 'bz:sound';
// on by default; the browser still keeps it silent until the first click or key press
const read = () => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};
let on = read();

let unlocked = false, unlockedAt = 0;
const unlockers = new Set();
export const audioReady = () => unlocked;
export const onUnlock = (fn) => unlockers.add(fn);
function unlock() {
  if (unlocked) return;
  unlocked = true;
  unlockedAt = performance.now();
  if (on) audio();
  unlockers.forEach((f) => f());
  ['pointerdown', 'keydown', 'touchstart'].forEach((t) => removeEventListener(t, unlock, true));
}
['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, unlock, true));

function audio() {
  if (!unlocked) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// tech interface sounds: short filtered square blips with a slight pitch drop and a whisper of static.
// Soft edged (low pass, quick fades) so they never get harsh.
let noiseBuf = null;
function noise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  }
  return noiseBuf;
}
function out(pan) {
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(master);
    return p;
  }
  return master;
}
function blip(freq, start, { dur = 0.045, vol = 0.05, type = 'square', drop = 0.82, cut = 2400, pan = 0 } = {}) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  o.frequency.exponentialRampToValueAtTime(freq * drop, start + dur);
  f.type = 'lowpass';
  f.frequency.value = cut;
  f.Q.value = 2;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(f).connect(g).connect(out(pan));
  o.start(start);
  o.stop(start + dur + 0.02);
}
function hiss(start, { vol = 0.02, cut = 5000, pan = 0 } = {}) {
  const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  n.buffer = noise();
  f.type = 'highpass';
  f.frequency.value = cut;
  g.gain.value = vol;
  n.connect(f).connect(g).connect(out(pan));
  n.start(start);
}

// pitch comes from a fixed grid of tones (not a melody): position on the hive picks one
const GRID = [440, 520, 620, 740, 880, 1040, 1240, 1480];
let lastCell = 0;
export function sound(kind, o = {}) {
  if (!on || !audio()) return;
  const t = ctx.currentTime;
  if (kind === 'cell') {
    if (t - lastCell < 0.03) return;
    lastCell = t;
    const k = Math.min(GRID.length - 1, Math.floor((o.x * 0.7 + (1 - o.y) * 0.3) * GRID.length));
    const pan = (o.x - 0.5) * 1.4;
    const v = 0.022 + 0.022 * (o.edge ?? 1);
    blip(GRID[k], t, { vol: v, pan, cut: 1800 + o.x * 1600 });
    hiss(t, { vol: v * 0.5, pan });
    // a node answers with a quick double data ping
    if (o.node) {
      blip(GRID[k] * 2, t + 0.06, { vol: 0.03, type: 'triangle', drop: 1, dur: 0.035, pan });
      blip(GRID[k] * 2, t + 0.12, { vol: 0.025, type: 'triangle', drop: 1, dur: 0.035, pan });
    }
    return;
  }
  if (kind === 'tick') {
    // typing: a dry keyboard tick, never more than one every 45ms
    if (t - lastTick < 0.045) return;
    lastTick = t;
    hiss(t, { vol: 0.05, cut: 3500 });
    blip(1900 + Math.random() * 300, t, { dur: 0.018, vol: 0.02, cut: 4000 });
  } else if (kind === 'pop') {
    blip(780, t, { dur: 0.05, vol: 0.04, cut: 2200 });
  } else if (kind === 'chime') {
    // send: three rising data blips
    [620, 880, 1240].forEach((f, i) => blip(f, t + i * 0.055, { dur: 0.06, vol: 0.045, drop: 1, cut: 3000 }));
  } else if (kind === 'on') {
    // power up: a short rising sweep
    const osc = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.22);
    f.type = 'lowpass';
    f.frequency.value = 1800;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(f).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.3);
    blip(1480, t + 0.24, { dur: 0.04, vol: 0.03, drop: 1 });
  }
}

export function soundToggle() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'snd-toggle';
  const paint = () => {
    const wait = on && !unlocked;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('wait', wait);
    b.setAttribute('aria-label', on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
    b.innerHTML = `<i class="ph ${on ? 'ph-speaker-high' : 'ph-speaker-slash'}" aria-hidden="true"></i><span>${wait ? 'Click anywhere to hear the hive' : on ? 'Sound on' : 'Sound off'}</span>`;
  };
  onUnlock(paint);
  b.addEventListener('click', () => {
    // the click that woke the audio up just confirms 'on'
    if (on && performance.now() - unlockedAt < 800) return paint(), sound('on');
    on = !on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {}
    paint();
    if (on) sound('on');
  });
  paint();
  return b;
}

// ---------- voice: Sami reads aloud (when sound is on) and listens (on request) ----------
export const soundOn = () => on;

export function speak(text) {
  if (!on || !('speechSynthesis' in window) || !text) return;
  const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ' ').slice(0, 400));
  u.rate = 1.02;
  const v = speechSynthesis.getVoices().find((x) => /en[-_](GB|US)/i.test(x.lang) && /female|samantha|google uk english female|serena|libby|sonia/i.test(x.name)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
export const hush = () => 'speechSynthesis' in window && speechSynthesis.cancel();

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
let active = null;

// listen once; onText gets the words as they come, onFinal the finished sentence
export function listen({ onText, onFinal, onState, onError } = {}) {
  if (!SR) {
    onError?.('Voice input works in Chrome, Edge and Safari.');
    return null;
  }
  if (active) {
    active.stop();
    return null;
  }
  hush();
  const rec = new SR();
  rec.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let done = false;
  rec.onstart = () => {
    active = rec;
    onState?.(true);
    sound('pop');
  };
  rec.onresult = (e) => {
    const text = [...e.results].map((r) => r[0].transcript).join(' ').trim();
    onText?.(text);
    if (e.results[e.results.length - 1].isFinal && !done) {
      done = true;
      onFinal?.(text);
    }
  };
  rec.onerror = (e) => onError?.(e.error === 'not-allowed' ? 'Allow the microphone to talk to Sami.' : e.error === 'no-speech' ? 'I did not hear anything. Tap the mic and try again.' : 'I could not hear that. Try again.');
  rec.onend = () => {
    active = null;
    onState?.(false);
  };
  try {
    rec.start();
  } catch {
    onError?.('The microphone is busy. Try again.');
  }
  return rec;
}
