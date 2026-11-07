// Soft interface sounds, made in the browser with the Web Audio API (no audio files).
// Off until the visitor turns them on; the choice is remembered on this device.

let ctx = null, master = null, lastTick = 0;
const KEY = 'bz:sound';
const read = () => {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
};
let on = read();

function audio() {
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

// one soft sine note with a quick attack and a gentle tail
function note(freq, start, dur, vol, type = 'sine') {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.05);
}

export function sound(kind) {
  if (!on || !audio()) return;
  const t = ctx.currentTime;
  if (kind === 'tick') {
    // typing: a tiny glassy tick, never more than one every 45ms
    if (t - lastTick < 0.045) return;
    lastTick = t;
    note(1800 + Math.random() * 500, t, 0.05, 0.035, 'triangle');
  } else if (kind === 'pop') {
    note(660, t, 0.12, 0.05);
    note(990, t + 0.02, 0.1, 0.025);
  } else if (kind === 'chime') {
    // a rising three note chime in C major
    [523.25, 659.25, 783.99].forEach((f, i) => note(f, t + i * 0.07, 0.6, 0.07));
  } else if (kind === 'on') {
    note(587.33, t, 0.25, 0.06);
    note(880, t + 0.08, 0.35, 0.05);
  }
}

export function soundToggle() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'snd-toggle';
  const paint = () => {
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on');
    b.innerHTML = `<i class="ph ${on ? 'ph-speaker-high' : 'ph-speaker-slash'}" aria-hidden="true"></i><span>${on ? 'Sound on' : 'Sound off'}</span>`;
  };
  b.addEventListener('click', () => {
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
