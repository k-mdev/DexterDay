import * as THREE from 'three';
import {
  mat, box, makeDog, makeDexter, animateDog, RIVAL_LOOKS, makeSquirrel, makeTree, makeRock, makeFlower,
  makeBush, makeHouse, makeBowl, fillBowl, makeTreat, makeDigSpot, TREATS,
  makeBuffDog, animateBuff, DEXTER_LOOK, makeDonkey, makeChicken, FRIEND_LOOKS, makeFarmBits, makeYard,
} from './models.js';
import { sfx } from './sfx.js';
import { runBattle, RIVALS } from './battle.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE_KEY = 'dexterday-save-v1';

/* ---------- Renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3f0);
scene.fog = new THREE.Fog(0x9fd3f0, 40, 95);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 220);
camera.position.set(0, 12, 20);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a6b3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
sun.shadow.bias = -0.0015;
scene.add(sun);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- World ---------- */
const WORLD_R = 34;
const POND = { x: -17, z: 8, r: 5 };
const BOWL = { x: -2.5, z: -9.3 };
const BED = { x: -4.6, z: -13.2 };
const POOL = { x: 10.6, z: 0.4, r: 1.5 };
const GARAGE = { x0: 18.7, x1: 26.3, z0: -9.3, z1: 2.3 };
const trees = []; // {x,z,r}

const ground = new THREE.Mesh(new THREE.CircleGeometry(110, 48), mat(0x6fb35a));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const clearing = new THREE.Mesh(new THREE.CircleGeometry(30, 40), mat(0x7cc063));
clearing.rotation.x = -Math.PI / 2; clearing.position.y = 0.01; clearing.receiveShadow = true; scene.add(clearing);
// dirt path from the porch into the yard
const pathM = mat(0xc9a877);
for (let i = 0; i < 9; i++) {
  const p = box(scene, 2 + Math.sin(i * 2.1) * 0.3, 0.04, 2.1, pathM, Math.sin(i * 0.9) * 0.5, 0.02, -10.3 + i * 2);
  p.castShadow = false;
}
const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 20), mat(0x4aa3d8, { transparent: true, opacity: 0.85, roughness: 0.2 }));
pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, 0.03, POND.z); scene.add(pond);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2 + rand(-0.1, 0.1);
  const r = makeRock(rand(0.6, 1.1));
  r.position.x = POND.x + Math.cos(a) * (POND.r + 0.3); r.position.z = POND.z + Math.sin(a) * (POND.r + 0.3);
  scene.add(r);
}

const house = makeHouse();
scene.add(house);
const bowl = makeBowl();
bowl.position.set(BOWL.x, 0, BOWL.z);
scene.add(bowl);

scene.add(makeFarmBits());
scene.add(makeYard());
const inHouseZone = (x, z) => x > -14.5 && x < 9 && z < -6;
const inFarmZone = (x, z) => (x > 3 && z > 4 && z < 25) || (x > 7.5 && x < 28 && z > -11.5 && z <= 4);
const inWater = (x, z) => inPond(x, z) || Math.hypot(x - POOL.x, z - POOL.z) < POOL.r;
const inPond = (x, z, pad = 0) => Math.hypot(x - POND.x, z - POND.z) < POND.r + pad;

for (let i = 0; i < 34; i++) {
  for (let tries = 0; tries < 30; tries++) {
    const a = rand(0, Math.PI * 2), r = rand(9, 35);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (inHouseZone(x, z) || inFarmZone(x, z) || inPond(x, z, 2.5) || (Math.abs(x) < 3 && z < 9 && z > -12)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 4.5)) continue;
    const s = rand(0.8, 1.25);
    const t = makeTree(Math.random() < 0.6 ? 'pine' : 'round', s);
    t.position.set(x, 0, z); scene.add(t);
    trees.push({ x, z, r: 0.55 * s, mesh: t });
    break;
  }
}
for (const [x, z, r] of [[9.3, -8.2, 0.45], [-10.5, -8.6, 0.8], [-13.4, -7.2, 0.3], [24.1, 7.2, 0.7], [13, 20.5, 1.0]]) trees.push({ x, z, r, mesh: new THREE.Object3D() }); // bin, utility box, bird bath, hay, coop
for (let i = 0; i < 230; i++) {
  const a = rand(0, Math.PI * 2), r = rand(38, 75);
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (z > 26 && r < 54) continue; // keep the camera's side of the clearing open
  const t = makeTree(Math.random() < 0.75 ? 'pine' : 'round', rand(1, 1.8));
  t.position.set(x, 0, z); scene.add(t);
}
for (let i = 0; i < 70; i++) {
  const a = rand(0, Math.PI * 2), r = rand(3, 34);
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (inPond(x, z, 0.5) || (x > -8 && x < 8 && z < -9.5 && z > -22) || (x > 8 && x < 27 && z > -10 && z < 3.5)) continue;
  const f = i % 6 === 0 ? makeBush() : i % 9 === 0 ? makeRock(rand(0.5, 1)) : makeFlower();
  f.position.x = x; f.position.z = z; scene.add(f);
}

/* ---------- Height & collision ---------- */
const PORCH_H = 0.7;
const inPorch = (x, z) => x >= -7.5 && x <= 7.5 && z >= -21.5 && z <= -11.5;
const inSteps = (x, z) => x >= -1.2 && x <= 1.2 && z > -11.5 && z <= -9.7;
const stepH = (z) => clamp((PORCH_H * (-9.7 - z)) / 1.8, 0, PORCH_H);
function surfaceY(x, z, y) {
  if (inPorch(x, z) && PORCH_H <= y + 0.6) return PORCH_H;
  if (inSteps(x, z)) return stepH(z);
  return 0;
}
function blocked(x, z, y) {
  if (x * x + z * z > WORLD_R * WORLD_R) return true;
  if (x > -5.5 && x < 5.5 && z > -22 && z < -14.05) return true;        // house walls
  if (inPorch(x, z) && y + 0.6 < PORCH_H) return true;                   // porch foundation
  if (y > 0.45 && !inPorch(x, z) && !inSteps(x, z)) return true;         // porch railing
  if (x > GARAGE.x0 && x < GARAGE.x1 && z > GARAGE.z0 && z < GARAGE.z1) return true;
  for (const t of trees) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < (t.r + 0.4) ** 2) return true; }
  return false;
}
function randomSpot(minR = 4, maxR = 32) {
  for (let i = 0; i < 80; i++) {
    const a = rand(0, Math.PI * 2), r = rand(minR, maxR);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (inHouseZone(x, z) || inPond(x, z, 1) || Math.hypot(x - POOL.x, z - POOL.z) < 2.6 || blocked(x, z, 0)) continue;
    return { x, z };
  }
  return { x: 0, z: 10 };
}

/* ---------- State ---------- */
const S = {
  mode: 'title', day: 1, time: 7, carried: 0, stash: 0, level: 1, xp: 0, hp: 30, maxHp: 30, atk: 6,
  stamina: 100, grace: 0, best: 0, today: null, nightWarned: false,
};
const dex = { glitch: false, mesh: makeDexter(), x: 0, y: 0, z: -5, vy: 0, face: 0, move: 0, dig: 0, digSpot: null, wet: false };
dex.mesh.scale.setScalar(1.45);
scene.add(dex.mesh);
const treats = [], digs = [], rivals = [];
let squirrel = null;
let spawnT = 14, treatT = 6, battleCam = null, hudT = 0, battleBuffs = [];

function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } }
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ day: S.day, stash: S.stash, level: S.level, xp: S.xp, best: S.best })); } catch { /* private mode */ }
}
const xpNeed = () => 18 * S.level;
function applyLevel() { S.maxHp = 30 + 5 * (S.level - 1); S.atk = 6 + (S.level - 1); }

/* ---------- UI helpers ---------- */
function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = text;
  const box = $('toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 3400);
}
function clockText() {
  const h = Math.floor(S.time) % 24, m = Math.floor((S.time % 1) * 60 / 10) * 10;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function updateHud() {
  $('hud-day').textContent = `Day ${S.day}`;
  $('hud-clock').textContent = clockText();
  $('hud-carried').textContent = S.carried;
  $('hud-stash').textContent = S.stash;
  $('hud-hp').style.width = `${clamp(S.hp / S.maxHp, 0, 1) * 100}%`;
  $('hud-hp').classList.toggle('low', S.hp / S.maxHp < 0.3);
  $('hud-hp-text').textContent = `${Math.ceil(S.hp)}/${S.maxHp}`;
  $('hud-stam').style.width = `${S.stamina}%`;
  $('hud-lvl').textContent = `Lv ${S.level}`;
  $('hud-xp').style.width = `${clamp(S.xp / xpNeed(), 0, 1) * 100}%`;
  fillBowl(bowl, S.stash);
}
const rankFor = (n) => (n < 10 ? 'Pup' : n < 25 ? 'Stank Dog' : n < 50 ? 'Very Stank Dog' : n < 100 ? 'Treat Baron' : n < 200 ? 'Snack Tycoon' : 'Legendary Snack Lord');

/* ---------- Entities ---------- */
function spawnTreat(type) {
  if (!type) {
    const r = Math.random();
    type = r < 0.54 ? 'biscuit' : r < 0.71 ? 'bacon' : r < 0.86 ? 'cheese' : r < 0.97 ? 'drumstick' : 'golden';
  }
  const p = randomSpot();
  const mesh = makeTreat(type);
  mesh.position.set(p.x, 0.6, p.z);
  scene.add(mesh);
  treats.push({ mesh, type, x: p.x, z: p.z, ph: rand(0, 6) });
}
function spawnDig() {
  const p = randomSpot(8, 31);
  const mesh = makeDigSpot();
  mesh.position.set(p.x, 0, p.z); scene.add(mesh);
  digs.push({ mesh, x: p.x, z: p.z });
}
function spawnRival() {
  const pool = ['taco', 'pug'];
  if (S.day >= 2) pool.push('corgi');
  if (S.day >= 3) pool.push('poodle');
  if (S.day >= 4) pool.push('husky');
  if (S.time >= 19) pool.push('raccoon', 'raccoon');
  const key = pool[Math.floor(Math.random() * pool.length)];
  const def = RIVALS[key];
  const level = Math.max(1, S.day + (Math.random() < 0.3 ? 1 : 0) - (Math.random() < 0.3 ? 1 : 0));
  const a = rand(0.15, Math.PI - 0.15) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2; // not from behind the house
  const mesh = makeDog(RIVAL_LOOKS[key]);
  mesh.scale.multiplyScalar(1.3);
  const x = Math.cos(a) * 37, z = Math.abs(Math.sin(a)) * 37 * (Math.random() < 0.75 ? 1 : -0.3);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const hp = Math.round(def.hp * (1 + 0.14 * (level - 1)));
  rivals.push({ key, mesh, name: def.name, level, hp, maxHp: hp, atk: def.atk + 0.6 * (level - 1), loot: 0, speed: def.speed, state: 'prowl', beaten: false, alerted: false, wx: 0, wz: 0, wt: 0, move: 0 });
}
function clearEntities() {
  for (const t of treats) scene.remove(t.mesh);
  for (const d of digs) scene.remove(d.mesh);
  for (const r of rivals) scene.remove(r.mesh);
  treats.length = digs.length = rivals.length = 0;
  if (squirrel) { scene.remove(squirrel.mesh); squirrel = null; }
}
function placeSquirrel() {
  const p = randomSpot(10, 30);
  if (!squirrel) { squirrel = { mesh: makeSquirrel(), x: 0, z: 0, wx: 0, wz: 0, wt: 0 }; scene.add(squirrel.mesh); }
  squirrel.x = p.x; squirrel.z = p.z; squirrel.wt = 0;
}


/* ---------- Friends ---------- */
const FRIENDS = [
  { kind: 'chickens', name: 'The Cluckers', icon: '🐔', skill: 'they fetch nearby treats for you', homes: [[12, 18.3], [14.2, 18.6], [13.2, 17.4]], speed: 8.5 },
  { kind: 'donkey', name: 'Hank the donkey', icon: '🫏', skill: 'he kicks any rival that gets close', homes: [[22.5, 8.6]], speed: 9 },
  { kind: 'pig', name: 'Hamlet the pig', icon: '🐷', skill: 'he roots up buried snacks', homes: [[28, 19.5]], speed: 7.5 },
];
for (const f of FRIENDS) {
  f.state = 'home'; f.t = 0; f.cd = 0; f.skillT = 0; f.kick = 0;
  f.members = f.homes.map(([hx, hz], i) => {
    const mesh = f.kind === 'chickens' ? makeChicken([0xa8552a, 0x8f4522, 0xb8672f][i]) : f.kind === 'donkey' ? makeDonkey() : makeDog(FRIEND_LOOKS.pig);
    mesh.position.set(hx, 0, hz); mesh.rotation.y = rand(0, 6);
    scene.add(mesh);
    return { mesh, hx, hz, move: 0, wx: hx, wz: hz, wt: rand(0, 3) };
  });
}
const activeFriend = () => FRIENDS.find((f) => f.state === 'follow');
function resetFriends() {
  for (const f of FRIENDS) { f.state = 'home'; f.cd = 0; for (const m of f.members) m.mesh.position.set(m.hx, 0, m.hz); }
  $('hud-friend').classList.add('hidden');
}
function stepToward(m, tx, tz, sp, dt, stopAt = 0.25) {
  const p = m.mesh.position, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d > stopAt) {
    const s = Math.min(d - stopAt * 0.5, sp * dt);
    p.x += (dx / d) * s; p.z += (dz / d) * s;
    m.mesh.rotation.y = Math.atan2(dx, dz); m.move = 1;
  } else m.move = 0;
  return d;
}
function yeet(e, from) {
  const p = e.mesh.position;
  let dx = p.x - from.x, dz = p.z - from.z; const d = Math.hypot(dx, dz) || 1;
  e.state = 'launched'; e.beaten = true; e.lt = 0;
  e.lv = { x: (dx / d) * 16, y: 17, z: (dz / d) * 16 };
  if (e.loot > 0) { S.carried += e.loot; toast(`${e.name} dropped ${e.loot} stolen treats mid-flight!`); e.loot = 0; }
  S.today.wins++; S.xp += 4;
  sfx.heehaw(); sfx.yeet();
  toast(`HEE-HAW! ${e.name} has been launched into the forest.`);
}
function updateFriends(dt) {
  const hud = $('hud-friend');
  for (const f of FRIENDS) {
    f.cd = Math.max(0, f.cd - dt);
    if (f.state === 'home') {
      for (const m of f.members) {
        m.wt -= dt;
        if (m.wt <= 0) { m.wx = m.hx + rand(-1.6, 1.6); m.wz = m.hz + rand(-1.2, 1.2); m.wt = rand(2, 6); }
        stepToward(m, m.wx, m.wz, 1.5, dt);
      }
      if (f.cd <= 0 && !activeFriend() && dex.y < 1 && f.members.some((m) => near(m.mesh.position.x, m.mesh.position.z, 2.3))) {
        f.state = 'follow'; f.t = 30; f.skillT = 2;
        sfx[f.kind === 'chickens' ? 'cluck' : f.kind === 'donkey' ? 'heehaw' : 'oink']();
        toast(`${f.icon} ${f.name} joined Dexter! For a while, ${f.skill}.`);
      }
    } else if (f.state === 'follow') {
      f.t -= dt; f.kick = Math.max(0, f.kick - dt);
      f.members.forEach((m, i) => {
        const back = 0.8 + i * 1.3, side = 3.2 + (i % 2) * 1.0; // off to Dexter's side, not on his heels
        const tx = dex.x - Math.sin(dex.face) * back + Math.cos(dex.face) * side, tz = dex.z - Math.cos(dex.face) * back - Math.sin(dex.face) * side;
        const d = Math.hypot(tx - m.mesh.position.x, tz - m.mesh.position.z);
        stepToward(m, tx, tz, d > 6 ? 13 : f.speed, dt, 0.7);
        pushOutOfHouse(m.mesh.position);
      });
      const lead = f.members[0].mesh.position;
      if (f.kind === 'chickens') {
        // treat fetch: nearby treats scoot over to Dexter
        for (const t of treats) {
          const dx = dex.x - t.x, dz = dex.z - t.z, d = Math.hypot(dx, dz);
          if (d < 8 && d > 0.1) { t.x += (dx / d) * 9 * dt; t.z += (dz / d) * 9 * dt; t.mesh.position.x = t.x; t.mesh.position.z = t.z; }
        }
      } else if (f.kind === 'donkey') {
        for (const e of rivals) {
          if (e.state === 'launched' || (e.state === 'flee' && e.beaten) || f.kick > 0) continue;
          const p = e.mesh.position;
          if (Math.hypot(p.x - lead.x, p.z - lead.z) < 3 || Math.hypot(p.x - dex.x, p.z - dex.z) < 2.6) { f.kick = 1; yeet(e, lead); updateHud(); }
        }
      } else if (f.kind === 'pig') {
        f.skillT -= dt;
        if (f.skillT <= 0) {
          f.skillT = 4;
          const type = Math.random() < 0.6 ? 'biscuit' : Math.random() < 0.5 ? 'bacon' : 'cheese';
          const mesh = makeTreat(type);
          const x = lead.x + rand(-1.2, 1.2), z = lead.z + rand(-1.2, 1.2);
          mesh.position.set(x, 0.6, z); scene.add(mesh);
          treats.push({ mesh, type, x, z, ph: rand(0, 6) });
          sfx.oink();
        }
      }
      hud.classList.remove('hidden');
      hud.textContent = `${f.icon} ${f.name} · ${Math.ceil(f.t)}s`;
      if (f.t <= 0) { f.state = 'return'; f.cd = 40; hud.classList.add('hidden'); toast(`${f.icon} ${f.name} wander${f.kind === 'chickens' ? '' : 's'} back home. Thanks, pal!`); }
    } else if (f.state === 'return') {
      let far = false;
      for (const m of f.members) if (stepToward(m, m.hx, m.hz, 5, dt) > 0.4) far = true;
      if (!far) f.state = 'home';
    }
    // animation
    for (const m of f.members) {
      if (f.kind === 'chickens') {
        const u = m.mesh.userData, p = S.clock + u.phase;
        u.inner.position.y = m.move ? Math.abs(Math.sin(p * 16)) * 0.14 : 0;
        u.head.rotation.x = m.move ? Math.sin(p * 16) * 0.3 : Math.max(0, Math.sin(p * 2.5)) ** 6 * 1.3; // peck
      } else {
        animateDog(m.mesh, S.clock, m.move, 0.4);
        m.mesh.rotation.x = f.kind === 'donkey' && f.kick > 0.5 ? 0.6 : 0; // rear kick
        if (f.kind === 'pig' && f.state === 'follow') m.mesh.userData.head.rotation.x = 0.35 + Math.sin(S.clock * 14) * 0.15; // snuffling
      }
    }
  }
}

/* ---------- Day flow ---------- */
function startDay(day) {
  S.day = day; S.time = 7; S.carried = 0; S.stamina = 100; S.grace = 0; S.nightWarned = false;
  applyLevel(); S.hp = S.maxHp;
  S.today = { startStash: S.stash, wins: 0, stolen: 0, eaten: 0 };
  clearEntities();
  const n = Math.min(26, 12 + day * 2);
  for (let i = 0; i < n; i++) spawnTreat();
  spawnTreat('golden');
  for (let i = 0; i < 4; i++) spawnDig();
  placeSquirrel();
  resetFriends();
  sfx.music('day'); sfx.ambient('day');
  spawnT = Math.max(14, 24 - day); treatT = 6;
  Object.assign(dex, { x: BED.x, y: PORCH_H, z: BED.z + 0.95, vy: 0, face: 0, dig: 0, digSpot: null });
  S.mode = 'play';
  for (const id of ['title', 'summary', 'help']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  updateHud();
  toast(day === 1 ? 'Good morning, Dexter! Hop down the porch steps and find some treats.' : `Day ${day}. The rivals are getting bolder...`);
}
function endDay(passedOut) {
  const lostCarried = passedOut ? S.carried : 0;
  if (passedOut) S.carried = 0;
  S.stash += S.carried; S.carried = 0;
  S.best = Math.max(S.best, S.stash);
  const gained = S.stash - S.today.startStash;
  S.mode = 'summary';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  $('sum-title').textContent = passedOut ? `Day ${S.day}: fell asleep in the yard` : `Day ${S.day} complete`;
  $('sum-body').innerHTML = `
    ${passedOut ? `<div>Dexter passed out past midnight. Something made off with <b>${lostCarried}</b> carried treats.</div>` : '<div>Dexter curls up on his blue bed. What a day.</div>'}
    <div>Stash change today: <b>${gained >= 0 ? '+' : ''}${gained}</b> 🦴</div>
    <div>Total stash: <b>${S.stash}</b> 🥣</div>
    <div>Rivals sent packing: <b>${S.today.wins}</b> · Treats eaten: <b>${S.today.eaten}</b> · Stolen: <b>${S.today.stolen}</b></div>
    <div class="rank">Rank: ${rankFor(S.stash)}</div>`;
  $('summary').classList.remove('hidden');
  S.day += 1;
  writeSave();
  sfx.music('night'); sfx.ambient('night');
  sfx.night();
}

/* ---------- Battles ---------- */
function project(obj) {
  const v = obj.position.clone(); v.y += obj.userData.popY ?? 1.3;
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
}
async function startBattle(e) {
  S.mode = 'battle';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('prompt').classList.add('hidden');
  let dx = e.mesh.position.x - dex.x, dz = e.mesh.position.z - dex.z;
  const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  dex.y = 0; dex.dig = 0;
  dex.mesh.position.set(dex.x, 0, dex.z);
  dex.mesh.rotation.set(0, Math.atan2(dx, dz), 0);
  e.mesh.position.set(dex.x + dx * 4.5, 0, dex.z + dz * 4.5);
  e.mesh.rotation.set(0, Math.atan2(-dx, -dz), 0);
  const px = -dz, pz = dx; // perpendicular
  const dPos = new THREE.Vector3(dex.x, 0, dex.z), fPos = new THREE.Vector3(dex.x + dx * 4.5, 0, dex.z + dz * 4.5);
  const mid = dPos.clone().lerp(fPos, 0.5);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const along = (o, a, b, h) => V(o.x + dx * a + px * b, h, o.z + dz * a + pz * b);
  // Every shot is { pos(t), look(t) } so it can drift, push in or orbit while it is on screen.
  const SHOTS = {
    wide: (t) => { const a = Math.sin(t * 0.35) * 0.55 + 0.9, r = 8.2; return [V(mid.x + (px * Math.cos(a) - dx * Math.sin(a)) * r, 3.1 + Math.sin(t * 0.5) * 0.4, mid.z + (pz * Math.cos(a) - dz * Math.sin(a)) * r), V(mid.x, 1.6, mid.z)]; },
    dex: (t) => [along(dPos, 4.9 - Math.min(t, 2) * 0.45, 2.0, 1.2), V(dPos.x, 1.95, dPos.z)],           // low-angle hero push-in
    foe: (t) => [along(fPos, -4.9 + Math.min(t, 2) * 0.45, -2.0, 1.2), V(fPos.x, 1.8, fPos.z)],
    overDex: (t) => [along(dPos, -2.6, 1.5 - t * 0.15, 3.0), V(fPos.x, 1.7, fPos.z)],                    // over Dexter's shoulder
    overFoe: (t) => [along(fPos, 2.6, -1.5 + t * 0.15, 3.0), V(dPos.x, 1.7, dPos.z)],
    side: (t) => [along(mid, t * 0.25 - 0.4, 6.4, 1.9), V(mid.x, 1.6, mid.z)],                           // tracking profile shot
    top: (t) => [along(mid, 0, 0.6, 9.5 - Math.min(t, 3) * 0.5), V(mid.x, 0.5, mid.z)],
    victory: (t) => { const a = t * 0.6; return [V(dPos.x + Math.sin(a) * 5, 1.3, dPos.z + Math.cos(a) * 5), V(dPos.x, 1.9, dPos.z)]; },
  };
  battleCam = { shot: 'foe', t0: S.clock, snap: true, shake: 0, SHOTS };
  const camApi = {
    shot(name, snap = true) { if (battleCam && battleCam.shot !== name) Object.assign(battleCam, { shot: name, t0: S.clock, snap }); },
    shake(amt = 0.5) { if (battleCam) battleCam.shake = amt; },
  };
  // When Dexter takes a hit his concentration slips: he flickers back to the goofy
  // low-poly model a few times before the serious one stabilises again.
  const glitch = () => {
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 0].forEach((low, i) => setTimeout(() => {
      if (S.mode !== 'battle' || !battleBuffs.length) return;
      dex.mesh.position.set(buffDex.position.x, 0, buffDex.position.z);
      dex.mesh.visible = !!low; buffDex.visible = !low; dex.glitch = !!low;
    }, i * 85));
  };
  // Serious Mode: swap in the absurdly muscular models for the duration of the fight
  const look = RIVAL_LOOKS[e.key];
  const buffDex = makeBuffDog(DEXTER_LOOK);
  const buffFoe = makeBuffDog(look);
  buffDex.position.copy(dex.mesh.position); buffDex.rotation.y = dex.mesh.rotation.y;
  buffFoe.position.copy(e.mesh.position); buffFoe.rotation.y = e.mesh.rotation.y;
  buffFoe.scale.setScalar(0.72 + 0.34 * (look.scale ?? 1));
  buffFoe.userData.popY = 3 * buffFoe.scale.x;
  battleBuffs = [buffDex, buffFoe];
  for (const t of trees) t.mesh.visible = Math.hypot(t.x - (dex.x + dx * 2), t.z - (dex.z + dz * 2)) > 9; // clear the arena
  setTimeout(() => { if (S.mode !== 'battle') return; scene.add(buffDex, buffFoe); dex.mesh.visible = false; e.mesh.visible = false; }, 280); // hidden by the flash
  const friend = activeFriend();
  sfx.music('battle');
  const result = await runBattle({ state: S, enemy: e, dexMesh: buffDex, foeMesh: buffFoe, project, refresh: () => {}, friend: friend ? friend.kind : null, cam: camApi, glitch });
  dex.glitch = false;
  scene.remove(buffDex, buffFoe); battleBuffs = [];
  for (const t of trees) t.mesh.visible = true;
  dex.mesh.visible = true; e.mesh.visible = true;
  sfx.music(S.time >= 19.5 ? 'night' : 'day');
  battleCam = null;
  if (result === 'win') {
    e.beaten = true; e.state = 'flee'; S.today.wins++;
    S.xp += Math.round(RIVALS[e.key].xp * (1 + 0.15 * (e.level - 1)));
    while (S.xp >= xpNeed()) {
      S.xp -= xpNeed(); S.level++; applyLevel(); S.hp = Math.min(S.maxHp, S.hp + 5);
      sfx.levelup(); toast(`Dexter grew to Lv ${S.level}! Louder bark, bigger heart.`);
    }
  } else if (result === 'lose') {
    S.today.stolen += e.loot;
    S.hp = Math.ceil(S.maxHp * 0.3);
    e.state = 'flee'; e.beaten = true;
    toast('Dexter shakes it off. Eat a treat (Q) to get your confidence back.');
  }
  else if (result === 'bribe') {
    S.today.stolen += e.loot; e.state = 'flee'; e.beaten = true;
    toast(`${e.name} trots off with the bribe. Dexter sighs.`);
  }
  S.grace = result === 'run' ? 4.5 : 2.5;
  S.mode = 'play';
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  updateHud();
}

/* ---------- Input ---------- */
const keys = new Set();
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const stick = { x: 0, y: 0, id: null };
let touchZoom = false;
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  sfx.unlock();
  if (S.mode === 'play') {
    if (e.code === 'KeyE' || e.code === 'Space') interact();
    if (e.code === 'KeyQ' || e.code === 'KeyF') snack();
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyH' && S.mode === 'play') $('help').classList.toggle('hidden');
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
function toggleMute() { $('btn-mute').textContent = sfx.toggleMute() ? '🔇' : '🔊'; }
$('btn-mute').onclick = toggleMute;
$('btn-help').onclick = () => $('help').classList.remove('hidden');
$('btn-help-close').onclick = () => $('help').classList.add('hidden');
$('btn-new').onclick = () => {
  sfx.unlock();
  Object.assign(S, { stash: 0, level: 1, xp: 0 });
  startDay(1);
  $('help').classList.remove('hidden');
};
$('btn-continue').onclick = () => {
  sfx.unlock();
  const sv = loadSave();
  Object.assign(S, { stash: sv.stash, level: sv.level, xp: sv.xp });
  startDay(sv.day);
};
$('btn-next').onclick = () => startDay(S.day);

// touch
const stickEl = $('stick'), knob = $('stick-knob');
function stickMove(e) {
  const r = stickEl.getBoundingClientRect();
  let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  stick.x = x; stick.y = y;
  knob.style.left = `${40 + x * 40}px`; knob.style.top = `${40 + y * 40}px`;
}
stickEl.addEventListener('pointerdown', (e) => { stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickMove(e); sfx.unlock(); });
stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) stickMove(e); });
const stickEnd = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.left = '40px'; knob.style.top = '40px'; };
stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);
$('t-act').addEventListener('pointerdown', () => interact());
$('t-eat').addEventListener('pointerdown', () => snack());
$('t-zoom').addEventListener('pointerdown', () => { touchZoom = true; });
$('t-zoom').addEventListener('pointerup', () => { touchZoom = false; });
$('t-zoom').addEventListener('pointercancel', () => { touchZoom = false; });

/* ---------- Actions ---------- */
const near = (x, z, r) => Math.hypot(dex.x - x, dex.z - z) < r;
function currentAction() {
  if (dex.dig > 0) return null;
  if (dex.y > 0.5 && near(BED.x, BED.z, 1.9)) return { type: 'sleep', label: S.time < 17 ? 'Bed — it\'s a bit early, but nap anyway' : 'Go to sleep and end the day' };
  if (dex.y < 0.4 && S.grace <= 0) {
    let best = null, bd = 3.2;
    for (const e of rivals) {
      if (e.beaten || e.state === 'launched') continue;
      const d = Math.hypot(e.mesh.position.x - dex.x, e.mesh.position.z - dex.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) return { type: 'fight', rival: best, label: `Challenge ${best.name}${best.loot > 0 ? ` (has ${best.loot} of your treats!)` : ''}` };
  }
  if (dex.y < 0.4 && near(BOWL.x, BOWL.z, 2)) return { type: 'stash', label: S.carried > 0 ? `Stash ${S.carried} treat${S.carried > 1 ? 's' : ''} in your bowl` : `Your bowl (${S.stash} stashed)` };
  if (dex.y < 1) for (const d of digs) if (near(d.x, d.z, 1.5)) return { type: 'dig', label: 'Dig!', spot: d };
  return null;
}
function interact() {
  if (S.mode !== 'play' || !$('help').classList.contains('hidden')) return;
  const a = currentAction();
  if (!a) { sfx.bark(); return; } // barking at nothing is always allowed
  if (a.type === 'sleep') endDay(false);
  else if (a.type === 'fight') startBattle(a.rival);
  else if (a.type === 'stash') {
    if (S.carried > 0) {
      S.stash += S.carried; toast(`Stashed ${S.carried}! Safe-ish.`); S.carried = 0;
      S.best = Math.max(S.best, S.stash); sfx.stash(); updateHud();
    }
  } else if (a.type === 'dig') { dex.dig = 1.2; dex.digSpot = a.spot; sfx.dig(); }
}
function snack() {
  if (S.mode !== 'play') return;
  if (S.carried < 1) { toast('No treats to eat. Tragic.'); return; }
  if (S.hp >= S.maxHp) { toast('Dexter is already brimming with confidence.'); return; }
  S.carried--; S.today.eaten++;
  S.hp = Math.min(S.maxHp, S.hp + Math.round(S.maxHp * 0.45));
  sfx.heal(); toast('Nom. Confidence restored!'); updateHud();
}
function finishDig() {
  const d = dex.digSpot; dex.digSpot = null;
  const i = digs.indexOf(d); if (i >= 0) digs.splice(i, 1);
  scene.remove(d.mesh);
  const r = Math.random();
  if (r < 0.15) toast('Dexter dug up... an old sock. He is thrilled anyway.');
  else if (r < 0.25) { S.carried += 6; sfx.golden(); toast('A buried GOLDEN BONE! +6'); }
  else { const n = 2 + Math.floor(Math.random() * 3); S.carried += n; sfx.pickup(); toast(`Dexter dug up ${n} buried biscuits!`); }
  updateHud();
}

/* ---------- Update ---------- */
function updateDexter(dt) {
  let ix = 0, iz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  ix += stick.x; iz += stick.y;
  let len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; len = 1; }
  if (dex.dig > 0) {
    dex.dig -= dt; len = 0; ix = iz = 0;
    if (dex.dig <= 0) finishDig();
  }
  const wantZoom = (keys.has('ShiftLeft') || keys.has('ShiftRight') || touchZoom) && len > 0.1 && S.stamina > 1;
  const wet = inWater(dex.x, dex.z) && dex.y < 0.5;
  if (wet && !dex.wet) { sfx.splash(); toast('Splash! Zoomies recharge fast in the water.'); }
  dex.wet = wet;
  S.stamina = clamp(S.stamina + (wantZoom ? -28 : wet ? 45 : 13) * dt, 0, 100);
  const speed = (wantZoom ? 10.5 : 6) * (wet ? 0.7 : 1);
  if (len > 0.05) {
    const nx = dex.x + ix * speed * dt, nz = dex.z + iz * speed * dt;
    if (!blocked(nx, dex.z, dex.y)) dex.x = nx;
    if (!blocked(dex.x, nz, dex.y)) dex.z = nz;
    const target = Math.atan2(ix, iz);
    let diff = target - dex.face;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    dex.face += diff * Math.min(1, dt * 12);
  }
  const surf = surfaceY(dex.x, dex.z, dex.y);
  if (dex.y > surf + 0.001) { dex.vy -= 28 * dt; dex.y = Math.max(surf, dex.y + dex.vy * dt); if (dex.y === surf) dex.vy = 0; }
  else { dex.y = surf; dex.vy = 0; }
  dex.move += ((len > 0.05 ? (wantZoom ? 1.35 : 1) * len : 0) - dex.move) * Math.min(1, dt * 10);
  dex.mesh.position.set(dex.x, dex.y - (wet ? 0.25 : 0), dex.z);
  dex.mesh.rotation.y = dex.face;
  dex.mesh.rotation.x = dex.dig > 0 ? 0.45 + Math.sin(S.clock * 30) * 0.08 : 0;
  // blink while invulnerable after a battle
  dex.mesh.visible = S.grace <= 0 || Math.floor(S.clock * 12) % 2 === 0;
}

function updateTreats(dt) {
  for (let i = treats.length - 1; i >= 0; i--) {
    const t = treats[i];
    t.mesh.rotation.y += dt * 2;
    t.mesh.position.y = 0.6 + Math.sin(S.clock * 3 + t.ph) * 0.12;
    if (dex.y < 1 && near(t.x, t.z, 1.15)) {
      const info = TREATS[t.type];
      S.carried += info.value;
      if (t.type === 'golden') { sfx.golden(); toast('The GOLDEN BONE! +6'); } else sfx.pickup();
      scene.remove(t.mesh); treats.splice(i, 1);
      updateHud();
    }
  }
  treatT -= dt;
  if (treatT <= 0) { treatT = 7; if (treats.length < 10 + S.day * 2) spawnTreat(); }
}

function pushRect(p, x0, x1, z0, z1) {
  if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) return;
  const d = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z], m = Math.min(...d);
  if (m === d[0]) p.x = x0; else if (m === d[1]) p.x = x1; else if (m === d[2]) p.z = z0; else p.z = z1;
}
function pushOutOfHouse(p) {
  pushRect(p, -7.9, 7.9, -21.9, -11.1);                 // porch + house
  pushRect(p, -1.6, 1.6, -11.5, -9.5);                  // front steps
  pushRect(p, GARAGE.x0 - 0.2, GARAGE.x1 + 0.2, GARAGE.z0 - 0.2, GARAGE.z1 + 0.2);
  for (const t of trees) {
    const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), r = t.r + 0.35;
    if (d < r && d > 0.001) { p.x = t.x + (dx / d) * r; p.z = t.z + (dz / d) * r; }
  }
}

function updateRivals(dt) {
  spawnT -= dt * (S.time >= 19 ? 1.7 : 1);
  const maxRivals = Math.min(4, 1 + Math.floor((S.day + 1) / 2));
  if (spawnT <= 0) {
    spawnT = Math.max(16, 36 - S.day * 2) + rand(0, 8);
    if (rivals.filter((r) => r.state !== 'flee' && r.state !== 'launched').length < maxRivals) spawnRival();
  }
  for (let i = rivals.length - 1; i >= 0; i--) {
    const e = rivals[i], p = e.mesh.position;
    const dDex = Math.hypot(p.x - dex.x, p.z - dex.z);
    let tx, tz, sp = e.speed;
    if (e.state === 'launched') {
      e.lt += dt; e.lv.y -= 20 * dt;
      p.x += e.lv.x * dt; p.y += e.lv.y * dt; p.z += e.lv.z * dt;
      e.mesh.rotation.x += dt * 14; e.mesh.rotation.z += dt * 9;
      if (e.lt > 2.2) { scene.remove(e.mesh); rivals.splice(i, 1); }
      continue;
    }
    if (e.state === 'flee') {
      const r = Math.hypot(p.x, p.z) || 1;
      // run for the tree line, biased away from Dexter
      tx = p.x + (p.x / r) * 4 + (p.x - dex.x) / (dDex || 1); tz = p.z + (p.z / r) * 4 + (p.z - dex.z) / (dDex || 1);
      sp = e.beaten ? e.speed * 1.2 : e.speed * 0.8;
      if (r > 39) {
        if (e.loot > 0 && !e.beaten) { S.today.stolen += e.loot; toast(`${e.name} escaped into the forest with ${e.loot} treats.`); }
        scene.remove(e.mesh); rivals.splice(i, 1); continue;
      }
    } else if (S.carried > 0 && dDex < 13 && dex.y < 0.4) {
      tx = dex.x; tz = dex.z;
      if (!e.alerted) { e.alerted = true; sfx[RIVALS[e.key].cry](); toast(`${e.name} has spotted your treats!`); }
    } else if (S.stash > 0) {
      tx = BOWL.x; tz = BOWL.z; sp *= 0.75; e.alerted = false;
      if (Math.hypot(p.x - BOWL.x, p.z - BOWL.z) < 1.4) {
        const n = Math.min(S.stash, 2 + Math.floor(S.day / 2));
        S.stash -= n; e.loot += n; e.state = 'flee';
        sfx.alert(); toast(`${e.name} raided your bowl! -${n} 🦴  Catch them!`);
        updateHud();
      }
    } else {
      e.wt -= dt; e.alerted = false;
      if (e.wt <= 0) { const s = randomSpot(4, 28); e.wx = s.x; e.wz = s.z; e.wt = rand(3, 6); }
      tx = e.wx; tz = e.wz; sp *= 0.5;
    }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d > 0.3) {
      p.x += (dx / d) * sp * dt; p.z += (dz / d) * sp * dt;
      e.mesh.rotation.y = Math.atan2(dx, dz);
      e.move = 1;
    } else e.move = 0;
    if (e.state !== 'flee' || Math.hypot(p.x, p.z) < 33) pushOutOfHouse(p);
    animateDog(e.mesh, S.clock, e.move, e.state === 'flee' ? 0 : 0.6);
    const canFight = !e.beaten && S.grace <= 0 && dex.y < 0.4 && dex.dig <= 0;
    if (canFight && e.state !== 'flee' && dDex < 1.25 && S.mode === 'play') {
      if (Math.random() < 0.12) { toast(`${e.name} ambushes Dexter!`); startBattle(e); return; } // rare forced fight
      if (S.carried > 0) {
        S.carried--; e.loot++; e.state = 'flee'; S.grace = 1.5;
        sfx.swipe(); sfx[RIVALS[e.key].cry]();
        toast(`${e.name} snatched a treat and bolted! Catch up and press E to challenge.`);
        updateHud();
      }
    }
  }
}

function updateSquirrel(dt) {
  const q = squirrel; if (!q) return;
  const d = Math.hypot(q.x - dex.x, q.z - dex.z);
  let tx, tz, sp;
  if (d < 7) { tx = q.x + (q.x - dex.x); tz = q.z + (q.z - dex.z); sp = 7.6; }
  else { q.wt -= dt; if (q.wt <= 0) { const s = randomSpot(8, 30); q.wx = s.x; q.wz = s.z; q.wt = rand(2, 5); } tx = q.wx; tz = q.wz; sp = 2.5; }
  const dx = tx - q.x, dz = tz - q.z, l = Math.hypot(dx, dz);
  if (l > 0.3) {
    const nx = q.x + (dx / l) * sp * dt, nz = q.z + (dz / l) * sp * dt;
    if (nx * nx + nz * nz < 33 * 33) { q.x = nx; q.z = nz; }
    q.mesh.rotation.y = Math.atan2(dx, dz);
  }
  q.mesh.position.set(q.x, Math.abs(Math.sin(S.clock * 12)) * (l > 0.3 ? 0.25 : 0.02), q.z);
  q.mesh.userData.tail.rotation.z = Math.sin(S.clock * 9) * 0.3;
  if (d < 1.1 && dex.y < 1) {
    S.carried += 3; sfx.golden();
    toast('SQUIRREL! It panics and drops its acorn stash. +3');
    placeSquirrel(); updateHud();
  }
}


/* ---------- DexDetector ---------- */
// Dexter-centred, north-up. The sweep line pings each dog it passes: the blip
// lights up and blinks out, and Dexter lets out a very, very quiet bark.
const radarCv = $('radar'), rctx = radarCv.getContext('2d');
const RADAR_RANGE = 42;
let sweep = 0;
function updateRadar(dt) {
  const W = radarCv.width, c = W / 2, R = c - 5;
  const prev = sweep;
  const stepA = dt * 2.4;
  sweep = (sweep + stepA) % (Math.PI * 2);
  rctx.clearRect(0, 0, W, W);
  rctx.fillStyle = 'rgba(8, 32, 18, 0.82)';
  rctx.beginPath(); rctx.arc(c, c, R, 0, Math.PI * 2); rctx.fill();
  rctx.strokeStyle = 'rgba(90, 255, 140, 0.28)'; rctx.lineWidth = 1;
  for (const k of [1 / 3, 2 / 3, 1]) { rctx.beginPath(); rctx.arc(c, c, R * k, 0, Math.PI * 2); rctx.stroke(); }
  rctx.beginPath(); rctx.moveTo(c - R, c); rctx.lineTo(c + R, c); rctx.moveTo(c, c - R); rctx.lineTo(c, c + R); rctx.stroke();
  for (let i = 0; i < 14; i++) { // trailing glow behind the sweep line
    const a = sweep - i * 0.045;
    rctx.strokeStyle = `rgba(90, 255, 140, ${0.5 * (1 - i / 14)})`; rctx.lineWidth = 2;
    rctx.beginPath(); rctx.moveTo(c, c); rctx.lineTo(c + Math.sin(a) * R, c - Math.cos(a) * R); rctx.stroke();
  }
  const hx = clamp(-dex.x / RADAR_RANGE, -1, 1) * R, hz = clamp((-16 - dex.z) / RADAR_RANGE, -1, 1) * R; // home
  rctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; rctx.fillRect(c + hx - 3, c + hz - 3, 6, 6);
  for (const e of rivals) {
    if (e.state === 'launched') continue;
    const rx = e.mesh.position.x - dex.x, rz = e.mesh.position.z - dex.z;
    const dist = Math.hypot(rx, rz);
    const ang = (Math.atan2(rx, -rz) + Math.PI * 2) % (Math.PI * 2);
    if ((ang - prev + Math.PI * 2) % (Math.PI * 2) <= stepA) { e.ping = 1; sfx.radarBark(); }
    e.ping = Math.max(0, (e.ping || 0) - dt / 1.6);
    if (e.ping <= 0) continue;
    const rr = Math.min(1, dist / RADAR_RANGE) * R;
    const lit = e.ping > 0.75 || Math.floor(e.ping * 14) % 2 === 0; // blink as it fades
    if (!lit) continue;
    const bx = c + Math.sin(ang) * rr, by = c - Math.cos(ang) * rr;
    rctx.fillStyle = e.loot > 0 ? `rgba(255, 220, 80, ${e.ping + 0.2})` : `rgba(255, 80, 70, ${e.ping + 0.2})`;
    rctx.beginPath(); rctx.arc(bx, by, 4.5, 0, Math.PI * 2); rctx.fill();
    rctx.strokeStyle = `rgba(255, 255, 255, ${e.ping * 0.6})`; rctx.lineWidth = 1;
    rctx.beginPath(); rctx.arc(bx, by, 4.5 + (1 - e.ping) * 9, 0, Math.PI * 2); rctx.stroke();
  }
  rctx.fillStyle = '#fff'; rctx.beginPath(); rctx.arc(c, c, 3, 0, Math.PI * 2); rctx.fill();
}

const SKY = [ // hour, sky, sun intensity, hemi intensity, window glow
  [7, 0xa8dcf5, 1.5, 0.9, 0], [17, 0x9fd3f0, 1.6, 0.9, 0], [19.3, 0xf2a25c, 1.0, 0.7, 0.5],
  [21, 0x27325c, 0.35, 0.45, 1.2], [24.5, 0x0e1430, 0.2, 0.32, 1.4],
];
const cA = new THREE.Color(), cB = new THREE.Color();
function updateSky() {
  const t = clamp(S.time, 7, 24.5);
  let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  cA.setHex(a[1]); cB.setHex(b[1]); cA.lerp(cB, k);
  scene.background.copy(cA); scene.fog.color.copy(cA);
  sun.intensity = a[2] + (b[2] - a[2]) * k;
  hemi.intensity = a[3] + (b[3] - a[3]) * k;
  house.userData.windowMat.emissiveIntensity = a[4] + (b[4] - a[4]) * k;
  const ang = ((t - 7) / 17.5) * Math.PI * 0.85 + 0.25;
  sun.position.set(Math.cos(ang) * 45, 14 + Math.sin(ang) * 34, 22);
}

function updatePlay(dt) {
  if ($('help').classList.contains('hidden')) {
    S.time += dt / 15; // 15 real seconds per game hour
    S.grace = Math.max(0, S.grace - dt);
    updateDexter(dt);
    updateTreats(dt);
    updateRivals(dt);
    if (S.mode !== 'play') return;
    updateSquirrel(dt);
    updateFriends(dt);
    updateRadar(dt);
    if (S.time >= 19.5) { sfx.music('night'); sfx.ambient('night'); }
    if (S.time >= 21 && !S.nightWarned) { S.nightWarned = true; sfx.night(); toast('It\'s getting dark. Head to your bed on the porch — raccoons are about!'); }
    if (S.time >= 24) { endDay(true); return; }
  }
  const a = currentAction(), pr = $('prompt');
  if (a) { pr.textContent = `${isTouch ? '🐾' : 'E'} · ${a.label}`; pr.classList.remove('hidden'); } else pr.classList.add('hidden');
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
}

const camLook = new THREE.Vector3(0, 1, -8), camWant = new THREE.Vector3(), lookWant = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'title') {
    const a = S.clock * 0.12;
    camWant.set(Math.sin(a) * 26, 11, -8 + Math.cos(a) * 26 * 0.6 + 14);
    lookWant.set(0, 2.5, -12);
  } else if (battleCam) {
    const [p, l] = battleCam.SHOTS[battleCam.shot](S.clock - battleCam.t0);
    camWant.copy(p); lookWant.copy(l);
    if (battleCam.snap) { camera.position.copy(p); camLook.copy(l); battleCam.snap = false; } // hard cut
    if (battleCam.shake > 0.01) {
      camWant.x += (Math.random() - 0.5) * battleCam.shake; camWant.y += (Math.random() - 0.5) * battleCam.shake;
      camera.position.x += (Math.random() - 0.5) * battleCam.shake; camera.position.y += (Math.random() - 0.5) * battleCam.shake * 0.6;
      battleCam.shake *= Math.pow(0.02, dt);
    }
  }
  else { camWant.set(dex.x, dex.y + 8, dex.z + 9.5); lookWant.set(dex.x, dex.y + 1, dex.z); }
  const k = Math.min(1, dt * (battleCam ? 5 : 6));
  camera.position.lerp(camWant, k);
  camLook.lerp(lookWant, k);
  camera.lookAt(camLook);
}

S.clock = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  tick(dt);
  requestAnimationFrame(frame);
}
function tick(dt) {
  S.clock += dt;
  if (S.mode === 'play') updatePlay(dt);
  if (S.mode === 'title') { dex.mesh.position.set(0, 0, -5); dex.mesh.rotation.y = Math.sin(S.clock * 0.5) * 0.5; }
  if (S.mode === 'battle') { for (const r of rivals) animateDog(r.mesh, S.clock, 0, 0.5); for (const b of battleBuffs) animateBuff(b, S.clock); }
  animateDog(dex.mesh, S.clock, S.mode === 'play' ? dex.move : dex.glitch ? 1.3 : 0, S.mode === 'battle' ? 0.2 : 0.7);
  if (S.mode !== 'play' && S.mode !== 'battle') dex.mesh.visible = true;
  const pm = house.userData.porchMat;
  pm.opacity += ((S.mode === 'play' && inPorch(dex.x, dex.z) ? 0.18 : 1) - pm.opacity) * Math.min(1, dt * 6);
  updateSky();
  updateCamera(dt);
  renderer.render(scene, camera);
}

/* ---------- Boot ---------- */
const sv = loadSave();
if (sv && sv.day > 1) {
  $('btn-continue').classList.remove('hidden');
  $('btn-continue').textContent = `Continue (Day ${sv.day})`;
  S.best = sv.best || 0;
  $('best').textContent = `Biggest stash: ${S.best} 🦴 · ${rankFor(S.best)}`;
}
window.__dexter = { S, dex, rivals, treats, keys, FRIENDS, startBattle, spawnRival, endDay, tick }; // handy for debugging
requestAnimationFrame(frame);
