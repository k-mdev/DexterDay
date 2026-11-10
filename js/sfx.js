// Tiny WebAudio synth: sound effects, looping chiptune music and ambient noise.
// Everything is generated at runtime so the game ships with zero audio assets.
let ctx = null, master = null, musicBus = null, ambBus = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(master);
    startWind();
    loadClips();
    setInterval(musicTick, 40);
    setInterval(ambientTick, 350);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'square', vol = 0.12, slideTo = null, delay = 0, bus = null, at = null) {
  const a = ac(); if (!a) return;
  const t = (at ?? a.currentTime) + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(bus || master);
  o.start(t); o.stop(t + dur + 0.03);
}

let noiseBuf = null;
function noise(dur, vol, at, bus, hp = 6000) {
  const a = ac(); if (!a) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  s.connect(f).connect(g).connect(bus || master);
  s.start(at, Math.random()); s.stop(at + dur + 0.02);
}

/* ---------- DexDetector clips ----------
 * Optional recorded audio. File names are listed in audio/dexdetector/clips.json;
 * anything not listed there falls back to the synthesised version. */
const CLIP_DIR = 'audio/dexdetector/';
const clips = { bark: [], sweep: [], barkVolume: 0.12, sweepVolume: 0.1 };
async function loadClips() {
  try {
    const cfg = await (await fetch(CLIP_DIR + 'clips.json')).json();
    clips.barkVolume = cfg.barkVolume ?? clips.barkVolume;
    clips.sweepVolume = cfg.sweepVolume ?? clips.sweepVolume;
    for (const kind of ['bark', 'sweep']) {
      for (const name of cfg[kind] || []) {
        try {
          const data = await (await fetch(CLIP_DIR + encodeURIComponent(name))).arrayBuffer();
          clips[kind].push(await ctx.decodeAudioData(data));
        } catch (e) { console.warn('DexDetector clip failed to load:', name, e); }
      }
    }
  } catch { /* no clips configured: synth only */ }
}
function playClip(list, vol, detune = 0) {
  if (!ctx || !list.length) return false;
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = list[Math.floor(Math.random() * list.length)];
  s.playbackRate.value = 1 + (Math.random() * 2 - 1) * detune;
  g.gain.value = vol;
  s.connect(g).connect(master);
  s.start();
  return true;
}

// A more dog-like bark than a bare tone: a falling growly pitch plus a breathy noise burst.
function woof(vol, pitch = 1, delay = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  tone(300 * pitch, 0.11, 'sawtooth', vol, 105 * pitch, 0, null, t);
  tone(150 * pitch, 0.12, 'square', vol * 0.5, 60 * pitch, 0, null, t);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  if (!noiseBuf) noise(0.01, 0.0001, t); // make sure the shared noise buffer exists
  s.buffer = noiseBuf; s.loop = true;
  f.type = 'bandpass'; f.frequency.setValueAtTime(1100 * pitch, t); f.frequency.exponentialRampToValueAtTime(450 * pitch, t + 0.1); f.Q.value = 1.2;
  g.gain.setValueAtTime(vol * 1.6, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.11);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + 0.13);
}

/* ---------- Music ---------- */
const _ = null;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const rep = (arr, n) => Array.from({ length: n }, () => arr).flat();
const TRACKS = {
  day: {
    bpm: 108, leadType: 'triangle', leadVol: 0.07, bassType: 'sine', bassVol: 0.09, hat: 0.012,
    lead: [72, _, 76, 79, 81, _, 79, 76, 72, _, 74, 76, 79, _, _, _, 81, _, 79, 76, 74, _, 72, 74, 76, _, 72, _, 67, _, _, _,
      72, _, 76, 79, 81, _, 84, 81, 79, _, 76, 79, 81, _, _, _, 77, _, 76, 74, 72, _, 74, 76, 74, _, 72, _, 72, _, _, _],
    bass: [48, _, 55, _, 48, _, 55, _, 45, _, 52, _, 45, _, 52, _, 53, _, 60, _, 53, _, 48, _, 55, _, 50, _, 55, _, 43, _,
      48, _, 55, _, 48, _, 55, _, 45, _, 52, _, 45, _, 52, _, 53, _, 60, _, 53, _, 55, _, 55, _, 43, _, 48, _, 48, _],
  },
  night: {
    bpm: 66, leadType: 'sine', leadVol: 0.06, bassType: 'sine', bassVol: 0.08, hat: 0, long: true,
    lead: [69, _, _, 72, _, _, 76, _, 74, _, _, 72, _, _, _, _, 65, _, _, 69, _, _, 72, _, 71, _, _, 67, _, _, _, _],
    bass: [45, _, _, _, _, _, _, _, 41, _, _, _, _, _, _, _, 38, _, _, _, _, _, _, _, 40, _, _, _, _, _, _, _],
  },
  battle: {
    bpm: 168, leadType: 'square', leadVol: 0.045, bassType: 'sawtooth', bassVol: 0.06, hat: 0.03, kick: true,
    lead: [69, _, 69, 72, 76, _, 75, 76, 72, _, 69, _, 67, 69, _, _, 69, _, 69, 72, 76, _, 79, 81, 80, _, 76, _, 74, 76, _, _,
      81, _, 81, 79, 76, _, 79, 81, 84, _, 83, _, 81, 79, _, _, 77, _, 76, 74, 72, _, 74, 76, 68, _, 71, _, 76, 80, 83, _],
    bass: [...rep([45, 45, 57, 45], 2), 41, 41, 53, 41, 43, 43, 55, 43, ...rep([45, 45, 57, 45], 2), 41, 41, 53, 41, 40, 40, 52, 40,
      ...rep([41, 41, 53, 41], 2), ...rep([43, 43, 55, 43], 2), ...rep([38, 38, 50, 38], 2), ...rep([40, 40, 52, 40], 2)],
  },
};
Object.assign(TRACKS, {
  meadow: { // G major, gentle and wide
    bpm: 92, leadType: 'sine', leadVol: 0.075, bassType: 'triangle', bassVol: 0.07, hat: 0,
    lead: [79, _, _, 83, 86, _, 83, _, 81, _, 79, _, 76, _, _, _, 74, _, _, 79, 83, _, 81, _, 79, _, _, _, _, _, _, _,
      81, _, _, 84, 88, _, 86, _, 83, _, 81, _, 79, _, _, _, 76, _, 79, _, 74, _, 76, _, 79, _, _, _, _, _, _, _],
    bass: [43, _, _, _, 50, _, _, _, 40, _, _, _, 47, _, _, _, 48, _, _, _, 43, _, _, _, 50, _, _, _, 50, _, 45, _,
      45, _, _, _, 52, _, _, _, 43, _, _, _, 50, _, _, _, 48, _, _, _, 50, _, _, _, 43, _, _, _, 43, _, _, _],
  },
  stroll: { // F major, bouncy
    bpm: 122, leadType: 'square', leadVol: 0.035, bassType: 'triangle', bassVol: 0.085, hat: 0.01,
    lead: [77, _, 81, _, 84, 81, 77, _, 79, _, 82, _, 86, 82, 79, _, 81, _, 84, _, 89, _, 86, 84, 82, _, 79, _, 77, _, _, _,
      84, _, 86, 84, 81, _, 77, _, 82, _, 84, 82, 79, _, 76, _, 77, _, 81, _, 84, _, 86, _, 84, 81, 79, 76, 77, _, _, _],
    bass: [41, _, 53, _, 41, _, 53, _, 43, _, 55, _, 43, _, 55, _, 45, _, 57, _, 46, _, 58, _, 48, _, 60, _, 41, _, 48, _,
      41, _, 53, _, 41, _, 53, _, 46, _, 58, _, 48, _, 60, _, 41, _, 53, _, 46, _, 58, _, 48, _, 60, _, 41, _, 41, _],
  },
  lazy: { // D major, slow afternoon
    bpm: 78, leadType: 'triangle', leadVol: 0.07, bassType: 'sine', bassVol: 0.085, hat: 0, long: true,
    lead: [74, _, _, _, 78, _, 81, _, _, _, 78, _, 76, _, _, _, 71, _, _, _, 74, _, 78, _, _, _, 76, _, 74, _, _, _,
      79, _, _, _, 78, _, 76, _, _, _, 74, _, 73, _, _, _, 74, _, _, _, 69, _, 74, _, _, _, _, _, _, _, _, _],
    bass: [38, _, _, _, _, _, _, _, 45, _, _, _, _, _, _, _, 43, _, _, _, _, _, _, _, 45, _, _, _, _, _, _, _],
  },
  fireflies: { // E minor arpeggios for the night
    bpm: 84, leadType: 'sine', leadVol: 0.05, bassType: 'sine', bassVol: 0.075, hat: 0, long: true,
    lead: [64, _, 67, _, 71, _, 76, _, 71, _, 67, _, 64, _, _, _, 60, _, 64, _, 67, _, 72, _, 67, _, 64, _, 60, _, _, _,
      62, _, 66, _, 69, _, 74, _, 69, _, 66, _, 62, _, _, _, 59, _, 63, _, 66, _, 71, _, 66, _, 63, _, 59, _, _, _],
    bass: [40, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, 36, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _,
      38, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, 35, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  },
  showdown: { // D minor, a second battle theme
    bpm: 156, leadType: 'sawtooth', leadVol: 0.035, bassType: 'square', bassVol: 0.05, hat: 0.03, kick: true,
    lead: [74, _, 77, _, 81, _, 80, 81, 77, _, 74, _, 72, 74, _, _, 74, _, 77, _, 81, _, 84, 86, 85, _, 81, _, 77, 81, _, _,
      86, _, _, 84, 81, _, 84, 86, 89, _, 88, _, 86, 84, _, _, 82, _, 81, 79, 77, _, 79, 81, 73, _, 76, _, 81, 85, 88, _],
    bass: [...rep([38, 50, 38, 50], 4), ...rep([34, 46, 34, 46], 2), ...rep([36, 48, 36, 48], 2),
      ...rep([38, 50, 38, 50], 2), ...rep([41, 53, 41, 53], 2), ...rep([43, 55, 43, 55], 2), ...rep([45, 57, 45, 57], 2)],
  },
});
// A "mood" picks from several tracks and moves on to a different one after a couple of loops,
// with a short breather in between, so the music never sits on one tune for long.
const MOODS = { day: ['day', 'meadow', 'stroll', 'lazy'], night: ['night', 'fireflies'], battle: ['battle', 'showdown'] };
let mood = null;
function nextTrack() {
  const pool = MOODS[mood] || [mood];
  const options = pool.length > 1 ? pool.filter((n) => n !== track) : pool;
  track = options[Math.floor(Math.random() * options.length)];
  step = 0;
}
let track = null, step = 0, nextT = 0;
function musicTick() {
  if (!ctx || !track) return;
  const T = TRACKS[track], sl = 30 / T.bpm; // one step = an 8th note
  if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.2) {
    const i = step % T.lead.length;
    const l = T.lead[i], b = T.bass[i % T.bass.length];
    if (l) tone(hz(l), sl * (T.long ? 3.5 : 1.6), T.leadType, T.leadVol, null, 0, musicBus, nextT);
    if (b) tone(hz(b), sl * (T.long ? 7.5 : 1.8), T.bassType, T.bassVol, null, 0, musicBus, nextT);
    if (T.hat && i % 2 === 1) noise(0.04, T.hat, nextT, musicBus);
    if (T.kick && i % 4 === 0) tone(150, 0.12, 'sine', 0.16, 45, 0, musicBus, nextT);
    if (T.kick && i % 8 === 4) noise(0.1, 0.05, nextT, musicBus, 1800);
    step++; nextT += sl;
    if (step >= T.lead.length * 2) { nextTrack(); nextT += mood === 'battle' ? sl * 2 : 2.5; break; } // change the tune
  }
}

/* ---------- Ambient ---------- */
let ambient = 'none', windGain = null;
function startWind() {
  const a = ctx;
  const buf = a.createBuffer(1, a.sampleRate * 3, a.sampleRate);
  const d = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < d.length; i++) { v = v * 0.985 + (Math.random() * 2 - 1) * 0.015; d[i] = v * 6; }
  const s = a.createBufferSource(); s.buffer = buf; s.loop = true;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  windGain = a.createGain(); windGain.gain.value = 0;
  const lfo = a.createOscillator(), lg = a.createGain();
  lfo.frequency.value = 0.13; lg.gain.value = 220; lfo.connect(lg).connect(f.frequency); lfo.start();
  s.connect(f).connect(windGain).connect(ambBus);
  s.start();
}
function ambientTick() {
  if (!ctx || ambient === 'none') return;
  const t = ctx.currentTime;
  if (ambient === 'day' && Math.random() < 0.16) {
    // songbird: a few quick chirps
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(base * (1 + Math.random() * 0.15), 0.07, 'sine', 0.022, base * 1.35, i * 0.11, ambBus, t);
  }
  if (ambient === 'night') {
    if (Math.random() < 0.55) for (let i = 0; i < 4; i++) tone(4300, 0.03, 'sine', 0.012, null, i * 0.06, ambBus, t); // crickets
    if (Math.random() < 0.02) { tone(420, 0.35, 'sine', 0.03, 380, 0, ambBus, t); tone(400, 0.5, 'sine', 0.03, 340, 0.45, ambBus, t); } // owl
  }
}

export const sfx = {
  unlock: () => ac(),
  toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 1;
    return muted;
  },
  music(name) {
    if (mood === name) return;
    mood = name; nextT = 0;
    nextTrack();
  },
  ambient(mode) {
    ambient = mode;
    if (windGain && ctx) windGain.gain.linearRampToValueAtTime(mode === 'none' ? 0 : mode === 'night' ? 0.05 : 0.035, ctx.currentTime + 1.5);
  },
  pickup: () => { tone(660, 0.08, 'square', 0.08); tone(990, 0.12, 'square', 0.08, null, 0.07); },
  golden: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'triangle', 0.12, null, i * 0.08)),
  stash: () => [392, 523, 659].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, null, i * 0.07)),
  bark: () => { tone(320, 0.12, 'sawtooth', 0.18, 140); tone(300, 0.14, 'sawtooth', 0.18, 120, 0.16); },
  yap: () => { tone(760, 0.07, 'sawtooth', 0.12, 500); tone(800, 0.07, 'sawtooth', 0.12, 520, 0.1); },
  whine: () => tone(900, 0.7, 'sine', 0.12, 500),
  slobber: () => { for (let i = 0; i < 5; i++) tone(180 + Math.random() * 200, 0.07, 'sine', 0.14, 90, i * 0.06); },
  duh: () => { tone(220, 0.3, 'triangle', 0.14, 110); tone(110, 0.4, 'triangle', 0.14, 80, 0.3); },
  hit: () => tone(140, 0.15, 'square', 0.16, 50),
  miss: () => tone(500, 0.18, 'sine', 0.08, 900),
  heal: () => [523, 784].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, null, i * 0.1)),
  alert: () => { tone(880, 0.1, 'square', 0.12); tone(880, 0.1, 'square', 0.12, null, 0.15); tone(1175, 0.25, 'square', 0.12, null, 0.3); },
  power: () => { tone(80, 0.9, 'sawtooth', 0.14, 640); tone(160, 0.9, 'square', 0.06, 1280); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.1, null, i * 0.1)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, null, i * 0.16)),
  levelup: () => [523, 587, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, null, i * 0.07)),
  dig: () => { for (let i = 0; i < 4; i++) tone(90 + Math.random() * 60, 0.08, 'sawtooth', 0.1, 50, i * 0.2); },
  night: () => { tone(330, 0.5, 'sine', 0.1, 220); tone(262, 0.7, 'sine', 0.1, 196, 0.4); },
  splash: () => tone(700, 0.25, 'sine', 0.08, 200),
  cluck: () => { for (let i = 0; i < 3; i++) tone(520 + Math.random() * 120, 0.06, 'square', 0.07, 760, i * 0.09); tone(700, 0.2, 'square', 0.07, 900, 0.3); },
  heehaw: () => { tone(620, 0.3, 'sawtooth', 0.14, 900); tone(260, 0.5, 'sawtooth', 0.16, 170, 0.32); },
  oink: () => { tone(190, 0.12, 'sawtooth', 0.13, 130); tone(210, 0.14, 'sawtooth', 0.13, 120, 0.16); },
  yeet: () => tone(300, 0.7, 'sine', 0.12, 1800),
  gunfire: () => { const a = ac(); if (!a) return; const n = 3 + Math.floor(Math.random() * 5); for (let i = 0; i < n; i++) { noise(0.035, 0.03, a.currentTime + i * 0.07, null, 1800); tone(150, 0.03, 'square', 0.012, 70, i * 0.07); } },
  whistle: () => tone(1700, 1.5, 'sine', 0.012, 520),
  boom: (v = 1) => { const a = ac(); if (!a) return; tone(95, 0.4, 'sine', 0.13 * v, 32); noise(0.35, 0.05 * v, a.currentTime, null, 200); }, // deliberately soft
  thunder: () => { const a = ac(); if (!a) return; for (let i = 0; i < 4; i++) { tone(70 - i * 8, 0.9, 'sine', 0.1 - i * 0.02, 28, i * 0.28); noise(0.6, 0.035, a.currentTime + i * 0.28, null, 120); } },
  spit: () => tone(520 + Math.random() * 160, 0.05, 'sine', 0.05, 220),
  squeak: () => { tone(1500, 0.06, 'square', 0.05, 2100); tone(1900, 0.06, 'square', 0.04, 1400, 0.06); },
  radarBark: () => {
    if (playClip(clips.bark, clips.barkVolume, 0.08)) return;
    woof(0.022, 0.85 + Math.random() * 0.3); // a tiny, far-away bark
    if (Math.random() < 0.4) woof(0.016, 0.8 + Math.random() * 0.3, 0.16);
  },
  radarSweep: () => { playClip(clips.sweep, clips.sweepVolume); }, // silent unless a clip is configured
  cutin: () => { const a = ac(); if (a) noise(0.28, 0.09, a.currentTime, null, 900); tone(200, 0.25, 'sawtooth', 0.07, 1400); },
  barkBig: () => { for (let i = 0; i < 3; i++) { tone(340 - i * 20, 0.13, 'sawtooth', 0.2, 120, i * 0.17); tone(170, 0.13, 'square', 0.1, 70, i * 0.17); } },
  splat: () => { for (let i = 0; i < 7; i++) tone(240 + Math.random() * 300, 0.09, 'sine', 0.13, 70, i * 0.05); const a = ac(); if (a) noise(0.2, 0.05, a.currentTime + 0.3, null, 1500); },
  whimper: () => { tone(980, 0.35, 'sine', 0.11, 620); tone(1050, 0.3, 'sine', 0.1, 700, 0.4); tone(900, 0.6, 'sine', 0.11, 420, 0.75); },
  derp: () => { tone(260, 0.18, 'triangle', 0.15, 180); tone(180, 0.2, 'triangle', 0.15, 120, 0.2); tone(120, 0.5, 'triangle', 0.16, 60, 0.42); tone(700, 0.08, 'sine', 0.08, 1100, 0.95); },
  chomp: () => { for (let i = 0; i < 3; i++) tone(160, 0.06, 'square', 0.14, 90, i * 0.12); },
  swipe: () => { const a = ac(); if (a) noise(0.16, 0.1, a.currentTime, null, 2500); },
};
