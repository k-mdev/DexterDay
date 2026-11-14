import * as THREE from 'three';
import {
  mat, box, makeDog, makeDexter, animateDog, RIVAL_LOOKS, makeSquirrel, makeTree, makeRock, makeFlower,
  makeBush, makeHouse, makeBowl, fillBowl, makeTreat, makeDigSpot, TREATS,
  makeBuffDog, animateBuff, DEXTER_LOOK, makeToad, makeDonkey, makeChicken, FRIEND_LOOKS, makeFarmBits, makeYard,
} from './models.js';
import { sfx } from './sfx.js';
import { runBattle, RIVALS } from './battle.js';
import { createDday } from './dday.js';
import { createHouse, ARRIVE } from './house.js';
import { createWorld, OUTER_R, cutaway, viewU } from './world.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SAVE_KEY = 'dexterday-save-v1';
const DEX_WALK = 6, DEX_ZOOM = 10.5;
const RIVAL_MAX = DEX_WALK * 0.7; // rivals never outrun a walking Dexter, so there is always time to catch them
const PASS_OUT = 26;              // 2 AM: Dexter falls asleep wherever he is
const isNight = () => S.time >= 20;

/* ---------- Renderer / scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3f0);
scene.fog = new THREE.Fog(0x9fd3f0, 40, 95);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 130); // the fog swallows everything past ~95 anyway
camera.position.set(0, 12, 20);

const hemi = new THREE.HemisphereLight(0xdfefff, 0x4a6b3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
sun.shadow.bias = -0.0015;
scene.add(sun); scene.add(sun.target);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- World ---------- */
const WORLD_R = OUTER_R; // the yard is r < 34; past the tree line the neighbourhood goes on to here
const POND = { x: 21, z: -13, r: 7.5 }; // the lake, to the right of the house
const BOWL = { x: -2.5, z: -9.3 };
const BED = { x: -4.6, z: -13.2 };
const POOL = { x: -0.6, z: 8, r: 1.5 };
const GARAGE = { x0: -2.3, x1: 9.3, z0: 15.7, z1: 23.3 };
let trees = [];     // {x,z,r,mesh} — replanted each season
const solids = [];  // {x,z,r} — fixed props that never move

const ground = new THREE.Mesh(new THREE.CircleGeometry(190, 56), mat(0x6fb35a, {}));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const clearing = new THREE.Mesh(new THREE.CircleGeometry(30, 40), mat(0x7cc063, {}));
clearing.rotation.x = -Math.PI / 2; clearing.position.y = 0.01; clearing.receiveShadow = true; scene.add(clearing);
// dirt path from the porch into the yard
const pathM = mat(0xc9a877);
for (let i = 0; i < 9; i++) {
  const p = box(scene, 2 + Math.sin(i * 2.1) * 0.3, 0.04, 2.1, pathM, Math.sin(i * 0.9) * 0.5, 0.02, -10.3 + i * 2);
  p.castShadow = false;
}
const pond = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 28), mat(0x4aa3d8, { transparent: true, opacity: 0.85, roughness: 0.2 }));
pond.rotation.x = -Math.PI / 2; pond.position.set(POND.x, 0.03, POND.z); scene.add(pond);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2 + rand(-0.1, 0.1);
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
const yard = makeYard();
scene.add(yard);
const inHouseZone = (x, z) => x > -9 && x < 9 && z < -8 && z > -23;
const inFarmZone = (x, z) => (x > -4.5 && z > 4 && z < 25) || (x > 8 && z < 0 && z > -22) || (x > -15 && x < 9 && z < -4 && z > -29); // driveway+road, lakeside, yard around the house
const outer = createWorld(scene); // the neighbourhood past the forest
const inWater = (x, z) => inPond(x, z) || Math.hypot(x - POOL.x, z - POOL.z) < POOL.r || outer.water(x, z);
const inPond = (x, z, pad = 0) => Math.hypot(x - POND.x, z - POND.z) < POND.r + pad;

for (const [x, z, r] of [[8.4, 6.7, 0.45], [-10.5, -8.6, 0.8], [-13.4, -7.2, 0.3], [24.1, 7.2, 0.7], [21, -2.6, 1.0], [11.3, -11.5, 0.95], [10.6, -7.2, 0.8], [14, -4.2, 1.2], [8, -25.6, 0.6], [-10.5, 17.5, 1.5], [-7.4, 20.4, 1.0]])
  solids.push({ x, z, r }); // bin, utility box, bird bath, hay, coop, dog house, campfire, picnic table, grill, hunting tower, transformer

/* ---------- Seasons ----------
 * Every two days the season turns. Buildings and props never change, but the plants are
 * regrown from a seed: trees land in new spots with new colours, flowers come and go,
 * the ground and lake change, and each season has its own weather drifting down. */
const SEASONS = [
  { name: 'Spring', icon: '🌸', ground: 0x86c96a, clearing: 0x93d477, water: 0x55aee0, flowers: 120,
    pines: [[0x2f7a45, 0x3a8a50, 0x48a05c]], rounds: [[0xf2a6c8, 0xf7c3da], [0x6cc05a, 0x86d070], [0xf6d4e4, 0xf2a6c8]],
    weather: { color: 0xffc4dd, n: 150, fall: 1.1, sway: 1.5, size: 0.17 } },
  { name: 'Summer', icon: '☀️', ground: 0x6fb35a, clearing: 0x7cc063, water: 0x4aa3d8, flowers: 70,
    pines: [[0x2f6b3c, 0x377a45, 0x3f8a4e]], rounds: [[0x4c9a4a, 0x5fb056], [0x418f45, 0x55a850]], weather: null },
  { name: 'Autumn', icon: '🍂', ground: 0x9c9a52, clearing: 0xaaa35a, water: 0x4a93b8, flowers: 18,
    pines: [[0x2c5f38, 0x336b40, 0x3a7748]], rounds: [[0xd9772b, 0xe89a3c], [0xb8402a, 0xd95f35], [0xe0b23a, 0xedc95a]],
    weather: { color: 0xe08a30, n: 130, fall: 1.6, sway: 2.2, size: 0.21 } },
  { name: 'Winter', icon: '🌴', ground: 0x8fbf55, clearing: 0x9fcc60, water: 0x45b5d6, flowers: 90,   // Florida "winter": greener, and hotter
    pines: [[0x2f7a45, 0x3a8a50, 0x48a05c]], rounds: [[0x4fa84a, 0x6cc05a], [0x3f9648, 0x58b055]], weather: null },
];
const SHOW_WEATHER = false; // drifting petals/leaves around Dexter: switched off
const seasonKey = (day) => Math.floor((day - 1) / 2);
const seasonOf = (day) => SEASONS[seasonKey(day) % SEASONS.length];
// It's Florida. The seasons change; the temperature only ever goes one way.
const tempF = (day) => 88 + day;
const HOTTER = ['It is hot.', 'It is hotter.', 'It is, somehow, hotter still.', 'It is the hottest it has ever been. Again.'];
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const nature = new THREE.Group(); scene.add(nature);
let natureKey = -1, weather = null;
function buildNature(day) {
  const key = seasonKey(day);
  if (key === natureKey) return false;
  natureKey = key;
  const season = SEASONS[key % SEASONS.length];
  const R = mulberry32(1000 + key * 7919), rr = (a, b) => a + R() * (b - a), pk = (arr) => arr[Math.floor(R() * arr.length)];
  nature.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  nature.clear(); trees = [];
  const pal = () => ({ pine: pk(season.pines), round: season.rounds ? pk(season.rounds) : null });
  const clear = (x, z, gap) => !trees.some((t) => Math.hypot(t.x - x, t.z - z) < gap) && !solids.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 2.2);
  const plant = (kind, x, z, sc, solid = true) => {
    const t = makeTree(kind, sc, pal(), R() * 6.28);
    t.traverse((o) => { if (o.isMesh) o.material = cutaway(o.material); }); // leaves never hide Dexter
    t.position.set(x, 0, z); nature.add(t);
    if (solid) trees.push({ x, z, r: 0.55 * sc, mesh: t });
  };
  for (let i = 0; i < 34; i++) for (let tries = 0; tries < 30; tries++) {          // scattered through the yard
    const a = rr(0, Math.PI * 2), r = rr(9, 35), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (inHouseZone(x, z) || inFarmZone(x, z) || inPond(x, z, 2.5) || (Math.abs(x) < 3 && z < 9 && z > -12) || outer.keepClear(x, z) || !clear(x, z, 4.5)) continue;
    plant(R() < 0.6 ? 'pine' : 'round', x, z, rr(0.8, 1.25)); break;
  }
  for (let i = 0; i < 26; i++) for (let tries = 0; tries < 20; tries++) {          // the forest on the left
    const x = rr(-33, -15), z = rr(-26, 22);
    if (x * x + z * z > 34.5 * 34.5 || outer.keepClear(x, z) || !clear(x, z, 3.2)) continue;
    plant(R() < 0.7 ? 'pine' : 'round', x, z, rr(0.85, 1.3)); break;
  }
  // the forest and neighbourhood beyond the yard (merged meshes, its own collision grid);
  // keeps clear of the farm road, the donkey and pig's spot and the lake
  outer.plantForest(season, R, (x, z) => inFarmZone(x, z) || inPond(x, z, 3) || (x > 9 && x < 40 && z > 9 && z < 24));
  const offLawn = (x, z) => inPond(x, z, 0.5) || (x > -8 && x < 8 && z < -9.5 && z > -26) || (x > -3 && x < 10 && z > 5 && z < 24);
  const scatter = (n, make) => { for (let i = 0; i < n; i++) { const a = rr(0, Math.PI * 2), r = rr(3, 34), x = Math.cos(a) * r, z = Math.sin(a) * r; if (offLawn(x, z)) continue; const o = make(); o.position.x = x; o.position.z = z; nature.add(o); } };
  scatter(season.flowers, () => makeFlower(R));
  scatter(12, () => makeBush());
  scatter(8, () => makeRock(rr(0.5, 1)));
  ground.material.color.setHex(season.ground); clearing.material.color.setHex(season.clearing);
  pond.material.color.setHex(season.water);
  arenaGround.material.color.setHex(season.ground);
  // weather: petals, leaves or snow drifting down around Dexter
  if (weather) { scene.remove(weather.points); weather.points.geometry.dispose(); weather = null; }
  if (season.weather && SHOW_WEATHER) {
    const w = season.weather, pos = new Float32Array(w.n * 3);
    for (let i = 0; i < w.n; i++) { pos[i * 3] = rr(-22, 22); pos[i * 3 + 1] = rr(0, 15); pos[i * 3 + 2] = rr(-22, 22); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: w.color, size: w.size, transparent: true, opacity: 0.9, depthWrite: false }));
    points.frustumCulled = false; scene.add(points);
    weather = { points, ...w };
  }
  return true;
}
function updateWeather(dt) {
  if (!weather) return;
  const a = weather.points.geometry.attributes.position, p = a.array;
  for (let i = 0; i < weather.n; i++) {
    p[i * 3 + 1] -= weather.fall * dt * (0.7 + (i % 5) * 0.12);
    p[i * 3] += Math.sin(S.clock * weather.sway + i) * dt * 0.6;
    if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 15;
  }
  a.needsUpdate = true;
  weather.points.position.set(dex.x, 0, dex.z);
}

/* ---------- Battle arena ----------
 * Fights happen in their own scene: an empty misty clearing where thick fog swallows
 * everything past the two fighters, so nothing from the yard can clip into them. */
const battleScene = new THREE.Scene();
const arenaGround = new THREE.Mesh(new THREE.CircleGeometry(70, 40), mat(0x5f9a55, {}));
battleScene.background = new THREE.Color(0x8fa3a8);
battleScene.fog = new THREE.Fog(0x8fa3a8, 9, 27);
{
  arenaGround.rotation.x = -Math.PI / 2; arenaGround.receiveShadow = true; battleScene.add(arenaGround);
  battleScene.add(new THREE.HemisphereLight(0xe6f0ff, 0x4a6b3a, 1.0));
  const l = new THREE.DirectionalLight(0xfff2d8, 1.7);
  l.position.set(8, 16, 6); l.castShadow = true; l.shadow.mapSize.set(1024, 1024);
  Object.assign(l.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  l.shadow.bias = -0.002;
  battleScene.add(l);
  for (let i = 0; i < 26; i++) { // faint tree shapes far out in the mist, for depth
    const a = (i / 26) * Math.PI * 2 + rand(-0.1, 0.1), r = rand(19, 30);
    const t = makeTree('pine', rand(1.2, 2)); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); battleScene.add(t);
  }
  for (let i = 0; i < 30; i++) { const f = makeFlower(); const a = rand(0, 6.28), r = rand(2, 14); f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); battleScene.add(f); }
}
let inArena = false;

/* ---------- Height & collision ---------- */
const PORCH_H = 0.7;
// solid rectangles [x0, x1, z0, z1]: house walls (must stay first), garage, back stairs,
// then the screened porch's west, north and east screens (gap in the east one for the screen door)
const BLOCKS = [[-5.5, 5.5, -22, -14.05], [GARAGE.x0, GARAGE.x1, GARAGE.z0, GARAGE.z1], [1.5, 6.2, -23.95, -22.65],
  [-4.6, -4.0, -25.6, -21.4], [-4.6, 1.7, -25.6, -25.0], [1.2, 1.7, -25.6, -24.7], [1.2, 1.7, -23.75, -21.4]];
// Doors Dexter can bark open. `open` eases 0..1; `want` is where it is heading.
const doors = { front: { open: 0, want: 0, t: 0 }, slider: { open: 0, want: 0, t: 0 } };
const inPorch = (x, z) => x >= -7.5 && x <= 7.5 && z >= -21.5 && z <= -11.5;
const inSteps = (x, z) => x >= -1.2 && x <= 1.2 && z > -11.5 && z <= -9.7;
const stepH = (z) => clamp((PORCH_H * (-9.7 - z)) / 1.8, 0, PORCH_H);
// The back edge of the wrap-around porch (beside the house, both sides) has no railing:
// Dexter can hop down off it into the backyard, and hop back up onto it.
const porchBackGap = (x, z) => Math.abs(x) > 5.5 && Math.abs(x) < 7.3 && z < -20.6 && z > -22.4;
// Back screened porch: a low slab Dexter can walk around in, screen door on its east side.
const inScreenPorch = (x, z) => x > -4.0 && x < 1.2 && z > -25.0 && z < -21.4;
const SCREEN_H = 0.3;
function surfaceY(x, z, y) {
  if (inPorch(x, z) && (PORCH_H <= y + 0.6 || porchBackGap(x, z))) return PORCH_H;
  if (inSteps(x, z)) return stepH(z);
  if (inScreenPorch(x, z)) return SCREEN_H;
  return 0;
}
function blocked(x, z, y) {
  if (x * x + z * z > WORLD_R * WORLD_R) return true;
  for (const b of BLOCKS) if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) {
    if (b === BLOCKS[0] && doors.front.open > 0.7 && Math.abs(x) < 0.62 && z > -15.4) continue; // open front door
    return true;
  }
  if (outerBlocked(x, z) || pileBlocked(x, z)) return true;
  if (inPorch(x, z) && y + 0.6 < PORCH_H && !porchBackGap(x, z)) return true; // porch foundation
  if (y > 0.45 && !inPorch(x, z) && !inSteps(x, z) && !(porchBackGap(x, z) && z < -21.5)) return true; // porch railing
  for (const t of trees) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < (t.r + 0.4) ** 2) return true; }
  for (const t of solids) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < (t.r + 0.4) ** 2) return true; }
  return false;
}
const outerBlocked = (x, z) => outer.blocked(x, z); // forest trees, neighbours' houses, the pool
// Dexter's movement asks `world` about walls, floors and water, so the same code drives him indoors.
const outdoors = { blocked, surfaceY, water: (x, z) => inWater(x, z) };
let world = outdoors;
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
  stamina: 100, grace: 0, woozy: 0, toadLicks: 0, best: 0, today: null, nightWarned: false,
};
const dex = { glitch: false, barkT: 0, mesh: makeDexter(), x: 0, y: 0, z: -5, vy: 0, face: 0, move: 0, dig: 0, digSpot: null, wet: false };
dex.mesh.scale.setScalar(1.45);
scene.add(dex.mesh);
const treats = [], digs = [], rivals = [], toads = [];
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
  $('hud-day').textContent = `Day ${S.day} ${seasonOf(S.day).icon}`;
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
// a reward for exploring: treats dropped out in the neighbourhood, on roads, lanes and in yards
function spawnTreatOut() {
  for (let i = 0; i < 60; i++) {
    const a = rand(0, Math.PI * 2), r = rand(40, OUTER_R - 6), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (blocked(x, z, 0) || inWater(x, z)) continue;
    const type = Math.random() < 0.5 ? 'bacon' : Math.random() < 0.6 ? 'cheese' : 'drumstick';
    const mesh = makeTreat(type); mesh.position.set(x, 0.6, z); scene.add(mesh);
    treats.push({ mesh, type, x, z, ph: rand(0, 6) });
    return;
  }
}
function spawnDig() {
  const p = randomSpot(8, 31);
  const mesh = makeDigSpot();
  mesh.position.set(p.x, 0, p.z); scene.add(mesh);
  digs.push({ mesh, x: p.x, z: p.z });
}
function spawnRival() {
  const pool = ['taco', 'pug', 'beagle', 'dachshund'];
  if (S.day >= 2) pool.push('corgi', 'shiba');
  if (S.day >= 3) pool.push('poodle', 'dalmatian', 'golden');
  if (S.day >= 4) pool.push('husky', 'boxer', 'shepherd');
  // after dark the neighbourhood dogs go inside and the raccoons come out
  const key = isNight() && Math.random() < 0.85 ? 'raccoon' : pool[Math.floor(Math.random() * pool.length)];
  const def = RIVALS[key];
  const level = Math.max(1, S.day + (Math.random() < 0.3 ? 1 : 0) - (Math.random() < 0.3 ? 1 : 0));
  const a = rand(0.15, Math.PI - 0.15) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2; // not from behind the house
  const mesh = makeDog(RIVAL_LOOKS[key]);
  mesh.scale.multiplyScalar(1.3);
  const x = Math.cos(a) * 37, z = Math.abs(Math.sin(a)) * 37 * (Math.random() < 0.75 ? 1 : -0.3);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  const hp = Math.round(def.hp * (1 + 0.14 * (level - 1)));
  rivals.push({ key, mesh, name: def.name, level, hp, maxHp: hp, atk: def.atk + 0.6 * (level - 1), loot: 0, speed: Math.min(def.speed, RIVAL_MAX), state: 'prowl', beaten: false, alerted: false, wx: 0, wz: 0, wt: 0, move: 0 });
}
function clearEntities() {
  for (const t of treats) scene.remove(t.mesh);
  for (const d of digs) scene.remove(d.mesh);
  for (const r of rivals) scene.remove(r.mesh);
  for (const t of toads) scene.remove(t.mesh);
  treats.length = digs.length = rivals.length = toads.length = 0;
  if (squirrel) { scene.remove(squirrel.mesh); squirrel = null; }
}
// Cane toads: slow, harmless-looking, and a terrible thing for a dog to lick.
function spawnToad(byLake) {
  const p = byLake ? { x: POND.x - POND.r - rand(1, 3), z: POND.z + rand(-4, 5) } : randomSpot(8, 30);
  const mesh = makeToad();
  mesh.position.set(p.x, 0, p.z); mesh.rotation.y = rand(0, 6.28); scene.add(mesh);
  toads.push({ mesh, wait: rand(1, 4), hop: 0, fx: p.x, fz: p.z, tx: p.x, tz: p.z, cd: 0 });
}
function updateToads(dt) {
  for (const t of toads) {
    const p = t.mesh.position;
    t.cd = Math.max(0, t.cd - dt);
    if (t.hop > 0) {
      t.hop = Math.max(0, t.hop - dt / 0.45);
      const k = 1 - t.hop;
      p.x = t.fx + (t.tx - t.fx) * k; p.z = t.fz + (t.tz - t.fz) * k; p.y = Math.sin(k * Math.PI) * 0.55;
    } else {
      t.wait -= dt;
      t.mesh.userData.inner.scale.y = 1 + Math.sin(S.clock * 3 + p.x) * 0.06; // breathing
      if (t.wait <= 0) {
        t.wait = rand(1.8, 4.5);
        const a = rand(0, 6.28), d = rand(0.8, 2);
        const nx = p.x + Math.cos(a) * d, nz = p.z + Math.sin(a) * d;
        if (!blocked(nx, nz, 0) && !inWater(nx, nz) && !inHouseZone(nx, nz)) { t.fx = p.x; t.fz = p.z; t.tx = nx; t.tz = nz; t.hop = 1; t.mesh.rotation.y = Math.atan2(nx - p.x, nz - p.z); }
      }
    }
    if (t.cd <= 0 && S.woozy <= 0 && dex.y < 0.4 && near(p.x, p.z, 0.95)) {
      t.cd = 8; S.woozy = 4.5;
      S.hp = Math.max(1, S.hp - 5);
      S.toadLicks++;
      updateHud();
      // Easter egg: every second lick sends him somewhere else entirely
      if (S.toadLicks % 2 === 0) { sfx.derp(); startDday('play'); return; }
      sfx.derp(); toast('Dexter licked a cane toad. Everything is wobbly. Do not lick the toads.');
    }
  }
}
function placeSquirrel() {
  const p = randomSpot(10, 30);
  if (!squirrel) { squirrel = { mesh: makeSquirrel(), x: 0, z: 0, wx: 0, wz: 0, wt: 0 }; scene.add(squirrel.mesh); }
  squirrel.x = p.x; squirrel.z = p.z; squirrel.wt = 0;
}


/* ---------- Friends ---------- */
const FRIENDS = [
  { kind: 'chickens', name: 'The Cluckers', icon: '🐔', skill: 'they fetch nearby treats for you', homes: [[18.6, -3.4], [16.4, -2.6], [17.6, -4.6]], speed: 8.5 },
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
  S.day = day; S.time = 7; S.carried = 0; S.stamina = 100; S.grace = 0; S.nightWarned = 0;
  applyLevel(); S.hp = S.maxHp;
  S.today = { startStash: S.stash, wins: 0, stolen: 0, eaten: 0 };
  const newSeason = buildNature(day);
  clearEntities();
  const n = Math.min(26, 12 + day * 2);
  for (let i = 0; i < n; i++) spawnTreat();
  spawnTreat('golden');
  for (let i = 0; i < 6; i++) spawnTreatOut();
  for (let i = 0; i < 4; i++) spawnDig();
  placeSquirrel();
  for (let i = 0; i < 3; i++) spawnToad(i === 0);
  S.woozy = 0;
  resetFriends();
  sfx.music('day'); sfx.ambient('day');
  spawnT = Math.max(30, 45 - day * 2); treatT = 6;
  Object.assign(dex, { x: BED.x, y: PORCH_H, z: BED.z + 0.95, vy: 0, face: 0, dig: 0, digSpot: null });
  scene.add(dex.mesh); world = outdoors;
  for (const d of Object.values(doors)) Object.assign(d, { open: 0, want: 0, t: 0 });
  home.resetDay();
  scheduleDelivery();
  S.mode = 'play';
  for (const id of ['title', 'summary', 'help']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
  updateHud();
  const sn = seasonOf(day);
  toast(day === 1 ? 'Good morning, Dexter! Hop down the porch steps and find some treats.' : newSeason ? `${sn.icon} ${sn.name} has arrived. ${HOTTER[seasonKey(day) % 4]}` : `Day ${day}. Another fine ${sn.name.toLowerCase()} day.`);
}
function endDay(passedOut) {
  if (S.mode === 'house') exitHome(null); // falling asleep indoors still ends the day
  const lostCarried = passedOut ? S.carried : 0, lostStash = passedOut ? S.stash : 0;
  if (passedOut) { S.carried = 0; S.stash = 0; } // 2 AM: everything is gone by morning
  S.stash += S.carried; S.carried = 0;
  S.best = Math.max(S.best, S.stash);
  const gained = S.stash - S.today.startStash;
  S.mode = 'summary';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  $('sum-title').textContent = passedOut ? `Day ${S.day}: fell asleep at 2 AM` : `Day ${S.day} complete`;
  $('sum-body').innerHTML = `
    ${passedOut ? `<div>Dexter stayed up way too late and passed out. Overnight the raccoons cleaned him out: <b>${lostCarried}</b> carried treats and the whole stash of <b>${lostStash}</b>.</div>` : '<div>Dexter curls up on his blue bed. What a day.</div>'}
    <div>Stash change today: <b>${gained >= 0 ? '+' : ''}${gained}</b> 🦴</div>
    <div>Total stash: <b>${S.stash}</b> 🥣</div>
    <div>Rivals sent packing: <b>${S.today.wins}</b> · Treats eaten: <b>${S.today.eaten}</b> · Stolen: <b>${S.today.stolen}</b></div>
    <div class="rank">Rank: ${rankFor(S.stash)}</div>
    <div class="temp">Today's high: ${tempF(S.day)}°F. Tomorrow: ${tempF(S.day + 1)}°F.</div>`;
  $('summary').classList.remove('hidden');
  S.day += 1;
  writeSave();
  sfx.music('night'); sfx.ambient('night');
  sfx.night();
}

/* ---------- Battles ---------- */
function project(obj) {
  const v = obj.getWorldPosition(new THREE.Vector3()); v.y += obj.userData.popY ?? 1.3;
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
}
async function startBattle(e) {
  S.mode = 'battle';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('prompt').classList.add('hidden');
  let dx = e.mesh.position.x - dex.x, dz = e.mesh.position.z - dex.z;
  const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  const SEP = 6.4, t0 = S.clock;
  dex.y = 0; dex.dig = 0;
  dex.mesh.position.set(dex.x, 0, dex.z);
  dex.mesh.rotation.set(0, Math.atan2(dx, dz), 0);

  // Serious Mode: swap in the absurdly muscular models for the duration of the fight.
  // Both live in an "arena" group that slowly turns, so the fighters circle each other
  // while the battle code keeps treating their local positions as fixed home spots.
  const look = RIVAL_LOOKS[e.key];
  const mid = new THREE.Vector3(0, 0, 0); // centre of the battle arena scene
  const arena = new THREE.Group(); arena.position.copy(mid);
  const buffDex = makeBuffDog(DEXTER_LOOK);
  const buffFoe = makeBuffDog(look);
  buffDex.position.set(-dx * SEP / 2, 0, -dz * SEP / 2); buffDex.rotation.y = Math.atan2(dx, dz);
  buffFoe.position.set(dx * SEP / 2, 0, dz * SEP / 2); buffFoe.rotation.y = Math.atan2(-dx, -dz);
  buffFoe.scale.setScalar(0.72 + 0.34 * (look.scale ?? 1));
  buffFoe.userData.popY = 2.7 * buffFoe.scale.x;
  arena.add(buffDex, buffFoe);
  battleBuffs = [buffDex, buffFoe];

  // live frame of reference, refreshed every frame because the fighters keep moving
  const dPos = new THREE.Vector3(), fPos = new THREE.Vector3();
  let px = -dz, pz = dx;
  const update = () => {
    const t = S.clock - t0;
    arena.rotation.y = Math.sin(t * 0.33) * 0.55 + t * 0.13; // sway back and forth while drifting round
    arena.updateMatrixWorld(true);
    buffDex.getWorldPosition(dPos); buffFoe.getWorldPosition(fPos); dPos.y = fPos.y = 0;
    dx = fPos.x - dPos.x; dz = fPos.z - dPos.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; px = -dz; pz = dx;
  };
  update();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const along = (o, a, b, h) => V(o.x + dx * a + px * b, h, o.z + dz * a + pz * b);
  // Every shot is (t) => [position, lookAt] so it can drift, push in or orbit while it is on screen.
  const SHOTS = {
    wide: (t) => { const a = Math.sin(t * 0.35) * 0.55 + 0.9, r = 10; return [V(mid.x + (px * Math.cos(a) - dx * Math.sin(a)) * r, 3.0 + Math.sin(t * 0.5) * 0.4, mid.z + (pz * Math.cos(a) - dz * Math.sin(a)) * r), V(mid.x, 1.2, mid.z)]; },
    dex: (t) => [along(dPos, 5.4 - Math.min(t, 2) * 0.45, 2.6, 1.0), V(dPos.x, 1.5, dPos.z)],            // low-angle hero push-in
    foe: (t) => [along(fPos, -5.4 + Math.min(t, 2) * 0.45, -2.6, 1.0), V(fPos.x, 1.4, fPos.z)],
    overDex: (t) => [along(dPos, -3.6, 2.0 - t * 0.15, 3.2), V(fPos.x, 1.2, fPos.z)],                    // over Dexter's shoulder
    overFoe: (t) => [along(fPos, 3.6, -2.0 + t * 0.15, 3.2), V(dPos.x, 1.2, dPos.z)],
    side: (t) => [along(mid, t * 0.25 - 0.4, 8, 1.7), V(mid.x, 1.2, mid.z)],                             // tracking profile shot
    top: (t) => [along(mid, 0, 0.6, 11.5 - Math.min(t, 3) * 0.5), V(mid.x, 0.5, mid.z)],
    victory: (t) => { const a = t * 0.6; return [V(dPos.x + Math.sin(a) * 5.5, 1.1, dPos.z + Math.cos(a) * 5.5), V(dPos.x, 1.5, dPos.z)]; },
  };
  battleCam = { shot: 'foe', t0: S.clock, snap: true, shake: 0, SHOTS, update };
  const camApi = {
    shot(name, snap = true) { if (battleCam && battleCam.shot !== name) Object.assign(battleCam, { shot: name, t0: S.clock, snap }); },
    shake(amt = 0.5) { if (battleCam) battleCam.shake = amt; },
  };
  // When Dexter takes a hit his concentration slips: he flickers back to the goofy
  // low-poly model a few times before the serious one stabilises again.
  const glitch = () => {
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 0].forEach((low, i) => setTimeout(() => {
      if (S.mode !== 'battle' || !battleBuffs.length) return;
      dex.mesh.position.set(dPos.x, 0, dPos.z); dex.mesh.rotation.y = Math.atan2(dx, dz);
      dex.mesh.visible = !!low; buffDex.visible = !low; dex.glitch = !!low;
    }, i * 85));
  };
  // step into the arena: fog takes its colour from the current sky so dusk fights stay dusky
  battleScene.background.copy(scene.background).lerp(new THREE.Color(0x9aa3a6), 0.55);
  battleScene.fog.color.copy(battleScene.background);
  battleScene.add(arena);
  battleScene.add(dex.mesh); dex.mesh.visible = false; // low-poly Dexter comes along for the hit flicker
  inArena = true;
  const friend = activeFriend();
  sfx.music('battle');
  const result = await runBattle({ state: S, enemy: e, dexMesh: buffDex, foeMesh: buffFoe, project, refresh: () => {}, friend: friend ? friend.kind : null, cam: camApi, glitch });
  dex.glitch = false;
  battleScene.remove(arena); battleBuffs = [];
  inArena = false;
  scene.add(dex.mesh); dex.mesh.visible = true;
  dex.mesh.position.set(dex.x, dex.y, dex.z); dex.mesh.rotation.set(0, dex.face, 0);
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
  if (S.mode === 'play' || S.mode === 'house') {
    if (e.code === 'KeyE' || e.code === 'Space') interact();
    if (e.code === 'KeyQ' || e.code === 'KeyF') snack();
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyH' && (S.mode === 'play' || S.mode === 'house')) $('help').classList.toggle('hidden');
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
$('t-act').addEventListener('pointerdown', () => { touchFire = true; interact(); });
$('t-act').addEventListener('pointerup', () => { touchFire = false; });
$('t-act').addEventListener('pointercancel', () => { touchFire = false; });
$('btn-dday').onclick = () => startDday('title');
$('t-eat').addEventListener('pointerdown', () => snack());
$('t-zoom').addEventListener('pointerdown', () => { touchZoom = true; });
$('t-zoom').addEventListener('pointerup', () => { touchZoom = false; });
$('t-zoom').addEventListener('pointercancel', () => { touchZoom = false; });

/* ---------- Actions ---------- */
const near = (x, z, r) => Math.hypot(dex.x - x, dex.z - z) < r;
function currentAction() {
  if (dex.dig > 0) return null;
  if (S.mode === 'house') return home.action(dex);
  if (dex.y > 0.5 && doors.front.want === 0 && near(0, -14.0, 1.5)) return { type: 'door', door: 'front', label: 'Bark at the front door' };
  if (inScreenPorch(dex.x, dex.z) && doors.slider.want === 0 && near(-1.9, -22.0, 1.5)) return { type: 'door', door: 'slider', label: 'Bark at the sliding door' };
  if (delivery.pile && dex.y < 0.4 && near(delivery.pile.x, delivery.pile.z, 2.6) && delivery.pile.left > 0) return { type: 'package', label: `Shred a package (${delivery.pile.left} left)` };
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
  if ((S.mode !== 'play' && S.mode !== 'house') || !$('help').classList.contains('hidden')) return;
  const a = currentAction();
  if (!a) { sfx.bark(); dex.barkT = 0.36; return; } // barking at nothing is always allowed
  if (a.type === 'door') { // a good loud bark, and the door opens for him
    sfx.bark(); dex.barkT = 0.36; sfx.door();
    if (S.mode === 'house') home.openDoor(a.door); else { doors[a.door].want = 1; doors[a.door].t = 6; }
  } else if (a.type === 'package') shredPackage();
  else if (a.type === 'sleep') endDay(false);
  else if (a.type === 'fight') startBattle(a.rival);
  else if (a.type === 'stash') {
    if (S.carried > 0) {
      S.stash += S.carried; toast(`Stashed ${S.carried}! Safe-ish.`); S.carried = 0;
      S.best = Math.max(S.best, S.stash); sfx.stash(); updateHud();
    }
  } else if (a.type === 'dig') { dex.dig = 1.2; dex.digSpot = a.spot; sfx.dig(); }
}
function snack() {
  if (S.mode !== 'play' && S.mode !== 'house') return;
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
  if (S.woozy > 0) { // toad-licked: steering drifts about for a few seconds
    S.woozy -= dt;
    const a = Math.sin(S.clock * 4) * 0.9, c = Math.cos(a), sn = Math.sin(a);
    [ix, iz] = [ix * c - iz * sn, ix * sn + iz * c];
  }
  let len = Math.hypot(ix, iz);
  if (len > 1) { ix /= len; iz /= len; len = 1; }
  if (dex.dig > 0) {
    dex.dig -= dt; len = 0; ix = iz = 0;
    if (dex.dig <= 0) finishDig();
  }
  const wantZoom = (keys.has('ShiftLeft') || keys.has('ShiftRight') || touchZoom) && len > 0.1 && S.stamina > 1;
  const wet = world.water(dex.x, dex.z) && dex.y < 0.5;
  if (wet && !dex.wet) { sfx.splash(); toast('Splash! Zoomies recharge fast in the water.'); }
  dex.wet = wet;
  S.stamina = clamp(S.stamina + (wantZoom ? -28 : wet ? 45 : 13) * dt, 0, 100);
  const speed = (wantZoom ? DEX_ZOOM : DEX_WALK) * (wet ? 0.7 : 1) * (S.woozy > 0 ? 0.65 : 1);
  if (len > 0.05) {
    const nx = dex.x + ix * speed * dt, nz = dex.z + iz * speed * dt;
    if (!world.blocked(nx, dex.z, dex.y)) dex.x = nx;
    if (!world.blocked(dex.x, nz, dex.y)) dex.z = nz;
    const target = Math.atan2(ix, iz);
    let diff = target - dex.face;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    dex.face += diff * Math.min(1, dt * 12);
  }
  const surf = world.surfaceY(dex.x, dex.z, dex.y);
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
  pushRect(p, -4.8, 6.5, -25.8, -21.9);                 // back porch + stairs
  for (const t of [...trees, ...solids]) {
    const dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz), r = t.r + 0.35;
    if (d < r && d > 0.001) { p.x = t.x + (dx / d) * r; p.z = t.z + (dz / d) * r; }
  }
}

/* ---------- D-Day daydream (easter egg) ---------- */
const DDAY_KEY = 'dexterday-dday';
let touchFire = false, ddayReturn = 'play';
const dday = createDday({
  keys, stick,
  fireHeld: () => keys.has('Space') || keys.has('KeyE') || keys.has('KeyF') || touchFire,
  onEnd: endDday,
});
function ddayUnlocked() { try { return localStorage.getItem(DDAY_KEY) === '1'; } catch { return false; } }
function startDday(from) {
  ddayReturn = from;
  S.mode = 'dday';
  keys.clear(); touchFire = false;
  for (const id of ['hud', 'title', 'prompt', 'help']) $(id).classList.add('hidden');
  $('dday').classList.remove('hidden');
  $('fade').classList.add('flash'); setTimeout(() => $('fade').classList.remove('flash'), 900);
  if (isTouch) $('touch').classList.remove('hidden');
  sfx.unlock(); sfx.music('battle'); sfx.ambient('none');
  dday.start();
}
function endDday() {
  const first = !ddayUnlocked();
  try { localStorage.setItem(DDAY_KEY, '1'); } catch { /* private mode */ }
  $('dday').classList.add('hidden');
  $('fade').classList.add('flash'); setTimeout(() => $('fade').classList.remove('flash'), 900);
  $('btn-dday').classList.remove('hidden');
  touchFire = false; keys.clear();
  if (ddayReturn === 'title') {
    S.mode = 'title'; $('title').classList.remove('hidden'); $('touch').classList.add('hidden');
    sfx.music('day'); sfx.ambient('day');
    return;
  }
  S.mode = 'play'; S.woozy = 0; S.grace = 2;
  $('hud').classList.remove('hidden');
  sfx.music(S.time >= 19.5 ? 'night' : 'day'); sfx.ambient(S.time >= 19.5 ? 'night' : 'day');
  if (first) { S.carried += 6; sfx.golden(); toast('Dexter snaps out of it, somehow holding a golden bone. D-Day is now on the title screen.'); }
  else toast('Dexter snaps out of it. He should really stop licking toads.');
  updateHud();
}

/* ---------- The house (enterable level) ----------
 * Barking at the front door (or the slider on the screened porch) swings it open; walking
 * through moves Dexter into the interior scene. Outside, everything is frozen in place. */
const home = createHouse();
let camSnap = false, toldInside = false;
const flash = () => { $('fade').classList.add('flash'); setTimeout(() => $('fade').classList.remove('flash'), 900); };
const EXIT_TO = { front: { x: 0, y: PORCH_H, z: -13.5, face: 0 }, slider: { x: -1.95, y: SCREEN_H, z: -22.7, face: Math.PI } };
function enterHome(via) {
  S.mode = 'house'; world = home;
  home.enter(via);
  home.scene.add(dex.mesh); dex.mesh.visible = true;
  const a = ARRIVE[via];
  Object.assign(dex, { x: a.x, y: a.y, z: a.z, vy: 0, face: a.face, dig: 0, digSpot: null });
  doors[via].want = 0; // the outside door swings shut behind him
  $('radar-wrap').classList.add('hidden'); $('prompt').classList.add('hidden');
  flash(); camSnap = true;
  if (!toldInside) { toldInside = true; toast('Dexter is inside! There might be a treat or two hidden around the house. Bark at a door to go back out.'); }
}
function exitHome(via) {
  S.mode = 'play'; world = outdoors;
  scene.add(dex.mesh);
  if (via) {
    const a = EXIT_TO[via];
    Object.assign(dex, { x: a.x, y: a.y, z: a.z, vy: 0, face: a.face });
    doors[via].open = 1; doors[via].want = 0;
    flash(); camSnap = true;
  }
  $('radar-wrap').classList.remove('hidden');
  S.grace = 2;
}
function updateDoorsOutside(dt) {
  for (const d of Object.values(doors)) {
    if (d.want && (d.t -= dt) <= 0) d.want = 0;
    d.open += (d.want - d.open) * Math.min(1, dt * 5);
  }
  house.userData.frontDoor.rotation.y = doors.front.open * 1.7;
  house.userData.slider.position.x = -1.93 + doors.slider.open * 1.05;
  // walked in through an open door?
  if (doors.front.open > 0.7 && Math.abs(dex.x) < 0.6 && dex.z < -14.6 && dex.y > 0.5) { enterHome('front'); return true; }
  if (doors.slider.open > 0.7 && dex.x > -2.45 && dex.x < -1.45 && dex.z > -21.9 && inScreenPorch(dex.x, dex.z)) { enterHome('slider'); return true; }
  return false;
}
function updateHome(dt) {
  if ($('help').classList.contains('hidden')) {
    S.time += dt / 15;
    S.grace = Math.max(0, S.grace - dt);
    updateDexter(dt);
    const r = home.update(dt, dex, camera, S.clock, scene.background, isNight());
    for (const type of r.got) {
      const info = TREATS[type]; S.carried += info.value; sfx.pickup();
      toast(`Found ${type === 'bacon' ? 'some bacon' : `a ${info.name}`} in the house! +${info.value}`);
    }
    if (r.got.length) updateHud();
    if (r.exit) { exitHome(r.exit); return; }
    if (nightChecks()) return;
  }
  showPrompt(dt);
}
function showPrompt(dt) {
  const a = currentAction(), pr = $('prompt');
  if (a) { pr.textContent = `${isTouch ? '🐾' : 'E'} · ${a.label}`; pr.classList.remove('hidden'); } else pr.classList.add('hidden');
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
}

/* ---------- Delivery truck ----------
 * Once a day, at a random time, a delivery van comes down the road, rolls up the driveway
 * and across the lawn, and unloads a frankly unreasonable stack of packages by the porch. */
const truck = makeTruck(); truck.visible = false; scene.add(truck);
const ROUTE_IN = [[48, 13], [12, 13], [5, 12.2], [3.4, 7], [2.2, 1], [1.8, -4.4]];
const ROUTE_BACK = [[1.8, -4.4], [2.2, 1], [3.4, 7]];
const ROUTE_OUT = [[3.4, 7], [5, 12.2], [12, 13], [48, 13]];
const ROUTE_IN_LEN = ROUTE_IN.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - ROUTE_IN[i - 1][0], p[1] - ROUTE_IN[i - 1][1]) : 0), 0);
const PILE_AT = { x: 3.4, z: -8.9 };
const delivery = { at: 99, phase: 'none', s: 0, t: 0, pile: null, flying: [] };
function polyAt(pts, s) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
    if (s <= l || i === pts.length - 2) { const k = Math.min(1, s / l); return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, hx: (bx - ax) / l, hz: (bz - az) / l, done: s >= l && i === pts.length - 2 }; }
    s -= l;
  }
}
function scheduleDelivery() {
  if (delivery.pile) scene.remove(delivery.pile.group);
  for (const f of delivery.flying) scene.remove(f.mesh);
  Object.assign(delivery, { at: rand(9, 17), phase: 'none', s: 0, t: 0, pile: null, flying: [] });
  truck.visible = false;
}
function makeTruck() {
  const g = new THREE.Group();
  const body = 0x2b3d4f, trim = 0x1c2733;
  box(g, 2.1, 2.3, 3.4, body, 0, 1.55, -0.55);                                    // cargo box
  box(g, 2.0, 1.4, 1.3, body, 0, 1.1, 1.75);                                       // cab
  box(g, 1.9, 0.6, 0.06, mat(0x9fd6ff, { roughness: 0.15, emissive: 0x335577, emissiveIntensity: 0.3 }), 0, 1.5, 2.41);   // windshield
  for (const s of [-1, 1]) box(g, 0.06, 0.5, 0.8, mat(0x9fd6ff, { roughness: 0.15 }), s * 1.01, 1.45, 1.75);
  box(g, 2.0, 0.5, 0.5, trim, 0, 0.55, 2.3);                                       // bumper/hood
  for (const s of [-1, 1]) { box(g, 0.3, 0.16, 0.06, mat(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.8 }), s * 0.7, 0.75, 2.56); box(g, 0.25, 0.18, 0.06, mat(0xd9342b, { emissive: 0x991a12, emissiveIntensity: 0.6 }), s * 0.85, 0.85, -2.27); }
  for (const s of [-1, 1]) { box(g, 0.04, 0.32, 3.3, 0x6fb8e8, s * 1.07, 1.35, -0.55); }  // side stripe
  box(g, 1.9, 2.0, 0.05, trim, 0, 1.5, -2.27); box(g, 0.04, 2.0, 0.06, 0x8a9aa8, 0, 1.5, -2.3);   // back doors
  box(g, 0.32, 0.3, 0.3, 0xd9b48a, 0.5, 1.45, 1.75); box(g, 0.34, 0.12, 0.34, 0x2b3d4f, 0.5, 1.64, 1.75); // the driver, in a cap
  const wheels = [];
  for (const [x, z] of [[-1.02, 1.6], [1.02, 1.6], [-1.02, -1.4], [1.02, -1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), mat(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); w.castShadow = true; g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}
const CARDBOARD = [0xc49a6c, 0xb88d5c, 0xd4ad7c, 0xa8814f];
function makeParcel(i) {
  const g = new THREE.Group(), w = rand(0.4, 1.0), h = rand(0.3, 0.75), d = rand(0.4, 0.9);
  box(g, w, h, d, CARDBOARD[i % 4], 0, h / 2, 0);
  box(g, w + 0.01, h * 0.12, 0.12, 0xd9c08a, 0, h * 0.995, 0).castShadow = false;                 // tape
  if (i % 3 === 0) box(g, 0.22, 0.01, 0.16, 0xf6f4ef, w * 0.2, h + 0.006, d * 0.2).castShadow = false; // shipping label
  g.userData.h = h;
  return g;
}
function updateDelivery(dt) {
  const D = delivery;
  if (D.phase === 'none') {
    if (S.time >= D.at) { D.phase = 'in'; D.s = 0; truck.visible = true; sfx.truck(); toast('📦 A delivery van is pulling up the driveway...'); }
    else return;
  }
  const tw = truck.userData.wheels, place = (p, rev) => {
    truck.position.set(p.x, 0, p.z);
    const want = Math.atan2(rev ? -p.hx : p.hx, rev ? -p.hz : p.hz);
    let diff = want - truck.rotation.y; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    truck.rotation.y += diff * Math.min(1, dt * 4);
    for (const w of tw) w.rotation.x += (rev ? -1 : 1) * dt * 12;
  };
  if (D.phase === 'in') {
    const left = ROUTE_IN_LEN - D.s;
    D.s += dt * (left < 8 ? Math.max(1.2, left * 1.3) : 11); // eases to a stop at the porch
    const p = polyAt(ROUTE_IN, D.s); place(p, false);
    if (p.done || left < 0.05) {
      D.phase = 'dump'; D.t = 0; D.n = Math.floor(rand(24, 34));
      D.pile = { group: new THREE.Group(), x: PILE_AT.x, z: PILE_AT.z, left: 0, heights: [] };
      D.pile.group.position.set(PILE_AT.x, 0, PILE_AT.z); scene.add(D.pile.group);
    }
  } else if (D.phase === 'dump') {
    // parcels fly out of the side door one after another and land on an ever-taller, wobblier stack
    D.t += dt;
    if (D.pile.left + D.flying.length < D.n && D.t > 0.12) {
      D.t = 0;
      const i = D.pile.left + D.flying.length, m = makeParcel(i);
      const col = i % 3, ox = (col - 1) * 0.75 + rand(-0.12, 0.12), oz = rand(-0.2, 0.2);
      const from = truck.localToWorld(new THREE.Vector3(-1.1, 1.4, 0.2));
      D.pile.heights[col] = D.pile.heights[col] || 0;
      const to = { x: PILE_AT.x + ox, y: D.pile.heights[col], z: PILE_AT.z + oz };
      D.pile.heights[col] += m.userData.h * 0.98;
      m.position.copy(from); scene.add(m);
      D.flying.push({ mesh: m, from, to, k: 0, spin: rand(-6, 6) });
      sfx.swipe();
    }
    for (let i = D.flying.length - 1; i >= 0; i--) {
      const f = D.flying[i]; f.k = Math.min(1, f.k + dt / 0.55);
      f.mesh.position.set(f.from.x + (f.to.x - f.from.x) * f.k, f.from.y + (f.to.y - f.from.y) * f.k + Math.sin(f.k * Math.PI) * 2.2, f.from.z + (f.to.z - f.from.z) * f.k);
      f.mesh.rotation.y += f.spin * dt * (1 - f.k);
      if (f.k >= 1) { scene.remove(f.mesh); f.mesh.position.set(f.to.x - PILE_AT.x, f.to.y, f.to.z - PILE_AT.z); f.mesh.rotation.set(0, rand(-0.3, 0.3), rand(-0.04, 0.04)); D.pile.group.add(f.mesh); D.pile.left++; D.flying.splice(i, 1); }
    }
    if (D.pile.left >= D.n) {
      D.phase = 'back'; D.s = 0; sfx.beep();
      toast(`${D.n} packages. Nobody in this house ordered ${D.n} packages. Dexter should investigate (E).`);
    }
  } else if (D.phase === 'back') {
    D.s += dt * 3.2;
    const p = polyAt(ROUTE_BACK, D.s); place(p, true);
    if (Math.floor(D.s / 1.3) !== Math.floor((D.s - dt * 3.2) / 1.3)) sfx.beep();
    if (p.done) { D.phase = 'out'; D.s = 0; sfx.truck(); }
  } else if (D.phase === 'out') {
    D.s += dt * Math.min(11, 3 + D.s * 0.6);
    const p = polyAt(ROUTE_OUT, D.s); place(p, false);
    if (p.done) { D.phase = 'gone'; truck.visible = false; }
  }
  // the van shoves Dexter out of the way rather than driving through him
  if (truck.visible) {
    const fx = Math.sin(truck.rotation.y), fz = Math.cos(truck.rotation.y);
    for (const k of [-1.6, 0, 1.6]) {
      const cx = truck.position.x + fx * k, cz = truck.position.z + fz * k, dx = dex.x - cx, dz = dex.z - cz, d = Math.hypot(dx, dz);
      if (d < 1.5 && d > 0.001 && dex.y < 0.5) { const nx = cx + (dx / d) * 1.5, nz = cz + (dz / d) * 1.5; if (!blocked(nx, nz, dex.y)) { dex.x = nx; dex.z = nz; } }
    }
  }
}
// The pile is solid. Shredding the top box sometimes turns up a treat (and always a mess).
const PACKAGE_JUNK = ['a single sock', 'forty phone chargers', 'a bag of packing peanuts (delicious, sadly not food)', 'a cat bed. Rude.', 'a smaller box, inside which is an even smaller box',
  'a squeaky hamburger!', 'garden hose fittings', 'bubble wrap. POP POP POP.', 'a novelty mug', 'nothing at all. Just the box. Best part.'];
function shredPackage() {
  const P = delivery.pile; if (!P || P.left <= 0) return;
  const top = P.group.children.reduce((a, c) => (c.position.y > a.position.y ? c : a));
  P.group.remove(top); P.left--;
  const col = Math.round((top.position.x / 0.75) + 1);
  if (P.heights[col] != null) P.heights[col] = Math.max(0, top.position.y);
  sfx.rip(); dex.barkT = 0.36;
  const r = Math.random();
  if (r < 0.3) { const n = r < 0.06 ? 3 : 1; S.carried += n; sfx.pickup(); toast(n > 1 ? 'A whole box of dog treats! +3' : 'There was a treat in this one! +1'); updateHud(); }
  else toast(`Dexter shreds a package. Inside: ${PACKAGE_JUNK[Math.floor(Math.random() * PACKAGE_JUNK.length)]}`);
  if (P.left === 0) toast('Every single package has been destroyed. Dexter has never been prouder.');
}
const pileBlocked = (x, z) => delivery.pile && delivery.pile.left > 0 && Math.abs(x - PILE_AT.x) < 1.5 && Math.abs(z - PILE_AT.z) < 0.85;

/* ---------- Theft cutscene ----------
 * Rather than piling on toasts and alarms, a theft pauses play for a moment and the
 * camera cuts to the culprit: one calm beat that tells you who took what. */
let cut = null, camLift = 0;
const loot = makeTreat('biscuit'); loot.scale.setScalar(0.55); loot.visible = false; scene.add(loot);
function startCutscene(e, kind, n) {
  S.mode = 'cutscene';
  cut = { e, kind, t: 0, dur: kind === 'bowl' ? 3.0 : 2.6, snap: true, yaw: e.mesh.rotation.y };
  dex.move = 0;
  keys.clear();
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('prompt').classList.add('hidden');
  $('cine-text').textContent = kind === 'bowl'
    ? `${e.name} raided the bowl and took ${n} treat${n > 1 ? 's' : ''}.`
    : `${e.name} snatched a treat from Dexter.`;
  $('cine').classList.remove('hidden');
  if (kind === 'bowl') sfx.chomp(); else sfx.swipe();
}
// The thief never moves during the cutscene: it grabs a biscuit, shows it off with a
// smug little hop-and-spin, and only starts running once play resumes.
function updateCutscene(dt) {
  const e = cut.e, p = e.mesh.position, u = e.mesh.userData;
  cut.t += dt;
  const t = cut.t, grab = cut.kind === 'bowl' ? 1.3 : 0.55;
  const mouth = () => { u.head.updateWorldMatrix(true, false); return u.head.localToWorld(new THREE.Vector3(0, -0.02, 0.55)); };
  if (t < grab) {
    if (cut.kind === 'bowl') { // face in the bowl, munching
      e.mesh.rotation.y = Math.atan2(BOWL.x - p.x, BOWL.z - p.z);
      animateDog(e.mesh, S.clock, 0, 1);
      u.head.rotation.x = 0.55 + Math.sin(S.clock * 18) * 0.2;
      if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) sfx.chomp();
    } else { // a biscuit hops out of Dexter's mouth and arcs over to the thief
      e.mesh.rotation.y = Math.atan2(dex.x - p.x, dex.z - p.z);
      animateDog(e.mesh, S.clock, 0, 1);
      const k = t / grab, to = mouth();
      loot.visible = true;
      loot.position.set(dex.x + (to.x - dex.x) * k, dex.y + 1.1 + (to.y - dex.y - 1.1) * k + Math.sin(k * Math.PI) * 1.2, dex.z + (to.z - dex.z) * k);
      loot.rotation.x += dt * 14;
    }
  } else {
    if (!cut.ran) { cut.ran = true; sfx[RIVALS[e.key].cry](); cut.yaw = e.mesh.rotation.y; }
    const k = t - grab;
    animateDog(e.mesh, S.clock, 0, 1);
    u.tail.rotation.y = Math.sin(S.clock * 30) * 0.9;                        // frantic wag
    p.y = Math.abs(Math.sin(k * 7)) * 0.45;                                 // smug hops on the spot
    e.mesh.rotation.y = cut.yaw + Math.min(1, k / 0.9) * Math.PI * 2;      // one victory spin
    u.head.rotation.x = -0.35 + Math.sin(k * 7) * 0.15;                     // chin up, showing it off
    loot.visible = true; loot.position.copy(mouth()); loot.rotation.set(0, e.mesh.rotation.y + Math.PI / 2, 0);
  }
  if (cut.t >= cut.dur) {
    p.y = 0; loot.visible = false;
    cut = null; S.mode = 'play'; S.grace = 1;
    $('cine').classList.add('hidden'); $('hud').classList.remove('hidden');
    if (isTouch) $('touch').classList.remove('hidden');
  }
}

function updateRivals(dt) {
  spawnT -= dt * (isNight() ? 2 : S.time >= 19 ? 1.4 : 1);
  const maxRivals = Math.min(4, 1 + Math.floor(S.day / 3) + (isNight() ? 1 : 0));
  if (spawnT <= 0) {
    spawnT = Math.max(32, 60 - S.day * 3) + rand(0, 15);
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
      if (!e.alerted) { e.alerted = true; sfx[RIVALS[e.key].cry](); }
    } else if (S.stash > 0) {
      tx = BOWL.x; tz = BOWL.z; sp *= 0.75; e.alerted = false;
      if (Math.hypot(p.x - BOWL.x, p.z - BOWL.z) < 1.4) {
        const n = Math.min(S.stash, 2 + Math.floor(S.day / 2));
        S.stash -= n; e.loot += n; e.state = 'flee';
        updateHud();
        startCutscene(e, 'bowl', n);
        return;
      }
    } else {
      e.wt -= dt; e.alerted = false;
      if (e.wt <= 0) { const s = randomSpot(4, 28); e.wx = s.x; e.wz = s.z; e.wt = rand(3, 6); }
      tx = e.wx; tz = e.wz; sp *= 0.5;
    }
    sp = Math.min(sp, RIVAL_MAX);
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
      if (Math.random() < 0.05) { toast(`${e.name} ambushes Dexter!`); startBattle(e); return; } // very rare forced fight
      if (S.carried > 0) {
        S.carried--; e.loot++; e.state = 'flee';
        updateHud();
        startCutscene(e, 'dex', 1);
        return;
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
  if (sweep < prev) sfx.radarSweep(); // once per rotation
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
  [21, 0x27325c, 0.35, 0.45, 1.2], [24.5, 0x0e1430, 0.2, 0.32, 1.4], [26.5, 0x0a0f26, 0.16, 0.28, 1.4],
];
const cA = new THREE.Color(), cB = new THREE.Color();
function updateSky() {
  const t = clamp(S.time, 7, 26.5);
  let i = 0; while (i < SKY.length - 2 && t > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1], k = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  cA.setHex(a[1]); cB.setHex(b[1]); cA.lerp(cB, k);
  scene.background.copy(cA); scene.fog.color.copy(cA);
  sun.intensity = a[2] + (b[2] - a[2]) * k;
  hemi.intensity = a[3] + (b[3] - a[3]) * k;
  house.userData.windowMat.emissiveIntensity = a[4] + (b[4] - a[4]) * k;
  const ang = ((t - 7) / 17.5) * Math.PI * 0.85 + 0.25;
  // the sun (and its shadow box) follows Dexter so shadows still work out in the neighbourhood
  const fx = S.mode === 'title' ? 0 : dex.x, fz = S.mode === 'title' ? -8 : dex.z;
  sun.position.set(fx + Math.cos(ang) * 45, 14 + Math.sin(ang) * 34, fz + 22);
  sun.target.position.set(fx, 0, fz); sun.target.updateMatrixWorld();
}

// Shared by the yard and the house: warnings, then at 2 AM Dexter falls asleep wherever he is.
function nightChecks() {
  if (S.time >= 21 && S.nightWarned < 1) { S.nightWarned = 1; sfx.night(); toast('It\'s getting dark. The raccoons are coming out. Head to your bed on the porch!'); }
  if (S.time >= 24 && S.nightWarned < 2) { S.nightWarned = 2; sfx.night(); toast('Midnight. Dexter is getting VERY sleepy. Get to bed before 2 AM or lose everything!'); }
  if (S.time >= PASS_OUT) { endDay(true); return true; }
  return false;
}
function updatePlay(dt) {
  if ($('help').classList.contains('hidden')) {
    S.time += dt / 15; // 15 real seconds per game hour
    S.grace = Math.max(0, S.grace - dt);
    updateDexter(dt);
    if (updateDoorsOutside(dt)) return;
    updateTreats(dt);
    updateRivals(dt);
    if (S.mode !== 'play') return;
    updateSquirrel(dt);
    updateToads(dt);
    if (S.mode !== 'play') return;
    updateFriends(dt);
    updateDelivery(dt);
    updateRadar(dt);
    if (S.time >= 19.5) { sfx.music('night'); sfx.ambient('night'); }
    if (nightChecks()) return;
  }
  showPrompt(dt);
}

const camLook = new THREE.Vector3(0, 1, -8), camWant = new THREE.Vector3(), lookWant = new THREE.Vector3();
function updateCamera(dt) {
  if (S.mode === 'title') {
    const a = S.clock * 0.12;
    camWant.set(Math.sin(a) * 26, 11, -8 + Math.cos(a) * 26 * 0.6 + 14);
    lookWant.set(0, 2.5, -12);
  } else if (battleCam) {
    battleCam.update();
    const [p, l] = battleCam.SHOTS[battleCam.shot](S.clock - battleCam.t0);
    camWant.copy(p); lookWant.copy(l);
    if (battleCam.snap) { camera.position.copy(p); camLook.copy(l); battleCam.snap = false; } // hard cut
    if (battleCam.shake > 0.01) {
      camWant.x += (Math.random() - 0.5) * battleCam.shake; camWant.y += (Math.random() - 0.5) * battleCam.shake;
      camera.position.x += (Math.random() - 0.5) * battleCam.shake; camera.position.y += (Math.random() - 0.5) * battleCam.shake * 0.6;
      battleCam.shake *= Math.pow(0.02, dt);
    }
  }
  else if (S.mode === 'dday') { if (dday.camera(camWant, lookWant)) { camera.position.copy(camWant); camLook.copy(lookWant); } } // true = hard cut
  else if (S.mode === 'house') home.camera(camWant, lookWant, dex);
  else if (cut) {
    const p = cut.e.mesh.position;
    camWant.set(p.x + 2.4 - cut.t * 0.3, 2.3, p.z + 4.8 - cut.t * 0.25); lookWant.set(p.x, 0.7, p.z); // slow push-in on the thief
    if (cut.snap) { camera.position.copy(camWant); camLook.copy(lookWant); cut.snap = false; }
  }
  else {
    // Behind the house or right in front of the garage the usual angle would be blocked,
    // so the camera swings up and looks down over the roof instead.
    const hidden = (dex.z < -21.3 && Math.abs(dex.x) < 10.5) || (dex.z > 7.5 && dex.z < 16.5 && dex.x > -4.5 && dex.x < 11.5);
    // Out in the forest the camera tilts a bit steeper to see between the trees.
    const deep = clamp((Math.hypot(dex.x, dex.z) - 31) / 8, 0, 1);
    camLift += ((hidden ? 1 : deep * 0.45) - camLift) * Math.min(1, dt * 3);
    camWant.set(dex.x, dex.y + 8 + camLift * 8, dex.z + 9.5 - camLift * 5.5); lookWant.set(dex.x, dex.y + 1, dex.z);
  }
  // tell the tree shader where the camera and Dexter are (canopies on that line are cut away)
  viewU.uCut.value = S.mode === 'play' || S.mode === 'cutscene' ? 1 : 0;
  viewU.uCam.value.copy(camera.position); viewU.uDex.value.set(dex.x, dex.y, dex.z);
  if (camSnap) { camSnap = false; camera.position.copy(camWant); camLook.copy(lookWant); } // hard cut through a doorway
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
  else if (S.mode === 'house') updateHome(dt);
  else if (S.mode === 'dday') dday.update(dt);
  else if (S.mode === 'cutscene') updateCutscene(dt);
  if (S.mode === 'title') { dex.mesh.position.set(0, 0, -5); dex.mesh.rotation.y = Math.sin(S.clock * 0.5) * 0.5; }
  if (S.mode === 'battle') { for (const r of rivals) animateDog(r.mesh, S.clock, 0, 0.5); for (const b of battleBuffs) animateBuff(b, S.clock); }
  animateDog(dex.mesh, S.clock, S.mode === 'play' || S.mode === 'house' ? dex.move : dex.glitch ? 1.3 : 0, S.mode === 'battle' ? 0.2 : 0.7);
  if (dex.barkT > 0) { // two quick head-tosses in time with the woof-woof
    dex.barkT -= dt;
    const k = 1 - Math.max(0, dex.barkT) / 0.36, u = dex.mesh.userData;
    u.head.rotation.x = -Math.abs(Math.sin(k * Math.PI * 2)) * 0.6;
    u.inner.position.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.05;
    if (u.tongue) u.tongue.scale.z = 1.6;
  }
  if (S.mode !== 'play' && S.mode !== 'battle') dex.mesh.visible = true;
  updateWeather(dt);
  yard.userData.flames.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(S.clock * (9 + i * 3) + i) * 0.25; f.rotation.y += dt * 3; }); // campfire flicker
  const pm = house.userData.porchMat;
  pm.opacity += ((S.mode === 'play' && inPorch(dex.x, dex.z) ? 0.18 : 1) - pm.opacity) * Math.min(1, dt * 6);
  const under = S.mode === 'play' && inScreenPorch(dex.x, dex.z);
  for (const m of house.userData.deckMats) { m.opacity += ((under ? 0.15 : 1) - m.opacity) * Math.min(1, dt * 6); m.depthWrite = m.opacity > 0.95; }
  updateSky();
  updateCamera(dt);
  renderer.render(S.mode === 'dday' ? dday.scene : inArena ? battleScene : S.mode === 'house' ? home.scene : scene, camera);
}

/* ---------- Boot ---------- */
const sv = loadSave();
if (sv && sv.day > 1) {
  $('btn-continue').classList.remove('hidden');
  $('btn-continue').textContent = `Continue (Day ${sv.day})`;
  S.best = sv.best || 0;
  $('best').textContent = `Biggest stash: ${S.best} 🦴 · ${rankFor(S.best)}`;
}
if (ddayUnlocked()) $('btn-dday').classList.remove('hidden');
window.__dexter = { dday, startDday, S, dex, rivals, treats, toads, keys, FRIENDS, startBattle, spawnRival, endDay, tick, startDay, home, enterHome, exitHome, doors, delivery, startCutscene };
buildNature(1); // handy for debugging
requestAnimationFrame(frame);
