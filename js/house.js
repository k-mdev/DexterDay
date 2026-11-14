// Inside Dexter's house: its own small level, entered by barking at the front door (or the
// sliding door on the screened porch out back). Self-contained scene, collision and camera;
// main.js moves Dexter's mesh in here and drives him with the same movement code as outside.
//
// Layout (x: west -10 .. east 10, z: back/north -7 .. front/south 7). Facing the front door
// from outside, the lake is to the right (east) and the master bedroom to the left (west).
//   - front door at z 7, short hallway x -1.1..1.1, z 3..7, bathroom straight off its right side
//   - living room (double height) x -5..1.1, z -7..3: armchair across from the hallway, couch on
//     the right running parallel to the hall with a gap to turn right, TV on a white stand opposite
//   - behind the couch: brown island; kitchen + fridge to its left (north), dining table to its
//     right (south), and a wall of windows ahead (east) looking out over the lake
//   - master bedroom on the west side, its door just left of the TV area
//   - stairs up the living room's west wall to a balcony landing that overlooks the living room;
//     two guest bedrooms and a bathroom upstairs (doors only), grey chandelier over the living room
//   - sliding door on the back wall, behind the living area, out to the screened porch
import * as THREE from 'three';
import { mat, box, softBox, makeTree, makeTreat, TREATS } from './models.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export const F2 = 3.4;     // upstairs floor height
const H1 = 3.3;            // ground-floor partition height
const TOP = 6.8;           // exterior walls, living-room ceiling
const ST = { x0: -5, x1: -3.6, zBot: -5.6, zTop: 1.5 };            // stairs, climbing toward the front
const UP = { x0: -5, x1: 5, z0: 1.5, z1: 7 };                      // upstairs floor
const stairH = (z) => clamp((F2 * (z - ST.zBot)) / (ST.zTop - ST.zBot), 0, F2);
const inStairs = (x, z) => x > ST.x0 && x < ST.x1 && z > ST.zBot && z < ST.zTop;
const inUp = (x, z) => x > UP.x0 && x < UP.x1 && z > UP.z0 && z < UP.z1;

// where Dexter appears when he comes in, and the doorway exits
export const ARRIVE = { front: { x: 0, y: 0, z: 5.9, face: Math.PI }, slider: { x: -2.05, y: 0, z: -5.9, face: 0 } };
const DOOR = { front: { x0: -0.6, x1: 0.6 }, slider: { x0: -2.6, x1: -1.5 } };

export function createHouse() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd3f0);
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7458, 0.95));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.3);
  sun.position.set(18, 22, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 70 });
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const lamp = new THREE.PointLight(0xffd9a0, 0, 22, 1.2); lamp.position.set(-1.6, 4.3, -1.6); scene.add(lamp);

  /* ---- fading occluders ----
   * Walls, the upstairs floor and the like are "units". Any unit between the camera and
   * Dexter fades out, so he is always visible without having to cut the house open. */
  const units = [];
  const unit = () => {
    const g = new THREE.Group(); g.userData = { fade: 1, mats: new Map() };
    units.push(g); scene.add(g); return g;
  };
  const um = (u, color, extra = {}) => {
    while (u && !units.includes(u)) u = u.parent; // parts on a door pivot fade with their wall
    const key = color + JSON.stringify(extra);
    if (!u.userData.mats.has(key)) u.userData.mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, transparent: true, ...extra }));
    return u.userData.mats.get(key);
  };

  /* ---- collision ---- */
  const solids = []; // {x0,x1,z0,z1,y0,y1}
  const solid = (x0, x1, z0, z1, y0 = 0, y1 = H1) => solids.push({ x0, x1, z0, z1, y0, y1 });
  // a wall segment (axis-aligned box) that is both drawn and solid
  const wall = (u, x0, x1, z0, z1, y0, y1, color = 0xf2ecdc, collide = true) => {
    const m = box(u, x1 - x0, y1 - y0, z1 - z0, um(u, color), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (collide) solid(x0, x1, z0, z1, y0, y1);
    return m;
  };
  const deco = (u, w, h, d, color, x, y, z, extra) => box(u, w, h, d, um(u, color, extra), x, y, z);
  // a closed door drawn flat on a wall: frame, panel, knob
  const fakeDoor = (u, x, z, y0, axis, color = 0xf7f5ef) => {
    const n = axis === 'z' ? [1.0, 2.1, 0.06] : [0.06, 2.1, 1.0];
    const f = axis === 'z' ? [1.2, 2.25, 0.04] : [0.04, 2.25, 1.2];
    deco(u, ...f, 0xffffff, x, y0 + 1.12, z);
    deco(u, ...n, color, x, y0 + 1.05, z);
    deco(u, 0.08, 0.08, 0.08, 0xc9a85a, x + (axis === 'z' ? 0.38 : 0), y0 + 1.0, z + (axis === 'z' ? 0 : 0.38), { metalness: 0.6, roughness: 0.3 });
  };
  const fakeWindow = (u, x, y, z, w, h, axis) => {
    const fr = axis === 'z' ? [w + 0.2, h + 0.2, 0.05] : [0.05, h + 0.2, w + 0.2];
    const gl = axis === 'z' ? [w, h, 0.07] : [0.07, h, w];
    deco(u, ...fr, 0xffffff, x, y, z);
    deco(u, ...gl, 0x9fd6ff, x, y, z, { emissive: 0x6fb8e8, emissiveIntensity: 0.35, roughness: 0.2 });
  };

  /* ---- floors ---- */
  const tan = 0xcfa66e, seam = 0xb88d58;
  const floor = box(scene, 20, 0.1, 14, tan, 0, -0.05, 0); floor.castShadow = false;
  for (let z = -6.75; z < 7; z += 0.5) { const s = box(scene, 20, 0.012, 0.03, seam, 0, 0.002, z); s.castShadow = false; }
  for (let i = 0; i < 60; i++) { const s = box(scene, 0.03, 0.012, 0.5, seam, rand(-9.9, 9.9), 0.003, -6.75 + Math.floor(rand(0, 28)) * 0.5); s.castShadow = false; }
  const tile = box(scene, 3.8, 0.02, 3.9, 0xdde2e5, 3.05, 0.01, 5.05); tile.castShadow = false;           // bathroom tile
  const rug = box(scene, 3.2, 0.03, 3.6, 0xc2ad8a, -1.3, 0.015, -0.9); rug.castShadow = false;           // living-room rug
  box(scene, 2.9, 0.035, 3.3, 0xd8c7a6, -1.3, 0.02, -0.9).castShadow = false;
  const carpet = box(scene, 4.8, 0.02, 8.8, 0xbdb2a2, -7.5, 0.01, 2.5); carpet.castShadow = false;       // bedroom carpet

  /* ---- outside, seen through the windows: lawn, the lake to the east, a ring of trees ---- */
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(120, 40), mat(0x6fb35a, {})); lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.12; lawn.receiveShadow = true; scene.add(lawn);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(11, 28), mat(0x4aa3d8, { roughness: 0.2 })); lake.rotation.x = -Math.PI / 2; lake.position.set(27, -0.08, -4); scene.add(lake);
  for (let i = 0; i < 70; i++) {
    const a = rand(0, Math.PI * 2), r = rand(16, 55), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - 27, z + 4) < 13) continue;
    const t = makeTree(Math.random() < 0.7 ? 'pine' : 'round', rand(1, 1.6)); t.position.set(x, -0.1, z); scene.add(t);
  }

  /* ---- exterior walls ---- */
  const S = unit();                                                    // front (south) wall, with the front door
  wall(S, -10, -0.6, 6.9, 7.1, 0, TOP); wall(S, 0.6, 10, 6.9, 7.1, 0, TOP); wall(S, -0.6, 0.6, 6.9, 7.1, 2.35, TOP, 0xf2ecdc, false);
  solids.push({ x0: -0.6, x1: 0.6, z0: 6.9, z1: 7.1, y0: 0, y1: 2.35, door: 'front' });
  deco(S, 1.45, 2.5, 0.04, 0xffffff, 0, 1.25, 6.88);
  fakeWindow(S, 7.3, 1.75, 6.88, 1.6, 1.3, 'z'); fakeWindow(S, -7.5, 1.75, 6.88, 1.3, 1.3, 'z'); fakeWindow(S, 3, 1.9, 6.88, 0.8, 0.8, 'z');
  for (const x of [-3, 0, 3]) fakeWindow(S, x, 5.1, 6.88, 1.0, 1.0, 'z');           // the three dormer windows upstairs

  const N = unit();                                                    // back (north) wall, with the slider
  wall(N, -10, -2.6, -7.1, -6.9, 0, TOP); wall(N, -0.4, 10, -7.1, -6.9, 0, TOP); wall(N, -2.6, -0.4, -7.1, -6.9, 2.35, TOP, 0xf2ecdc, false);
  solids.push({ x0: -2.6, x1: -0.4, z0: -7.1, z1: -6.9, y0: 0, y1: 2.35, door: 'slider' });
  deco(N, 2.4, 2.45, 0.05, 0xffffff, -1.5, 1.2, -6.88);
  fakeWindow(N, 1.2, 3.6, -6.88, 1.2, 2.4, 'z'); fakeWindow(N, -4.2, 3.6, -6.88, 0.9, 2.4, 'z'); fakeWindow(N, -7.5, 1.75, -6.88, 1.3, 1.3, 'z');

  const W = unit();                                                    // west wall (bedroom side)
  wall(W, -10.1, -9.9, -7, 7, 0, TOP);
  fakeWindow(W, -9.88, 1.75, 2.5, 1.6, 1.4, 'x');

  // east wall: a real opening so you can see the lake from behind the couch
  const E = unit();
  wall(E, 9.9, 10.1, -7, -3.2, 0, TOP); wall(E, 9.9, 10.1, 5.2, 7, 0, TOP);
  wall(E, 9.9, 10.1, -3.2, 5.2, 0, 0.85); wall(E, 9.9, 10.1, -3.2, 5.2, 2.75, TOP, 0xf2ecdc, false);
  for (let z = -3.2; z <= 5.21; z += 1.4) deco(E, 0.14, 1.95, 0.1, 0xffffff, 10, 1.8, z);   // mullions
  deco(E, 0.14, 0.1, 8.4, 0xffffff, 10, 0.85, 1); deco(E, 0.14, 0.1, 8.4, 0xffffff, 10, 2.75, 1);
  deco(E, 0.03, 1.9, 8.4, 0xcfeaff, 10, 1.8, 1, { transparent: true, opacity: 0.18, roughness: 0.05 });

  /* ---- ground-floor partitions ---- */
  const hallW = unit(); wall(hallW, -1.2, -1.0, 3, 6.9, 0, H1);                         // hallway, left side (closet behind)
  const hallE = unit(); wall(hallE, 1.0, 1.2, 3, 5.0, 0, H1); wall(hallE, 1.0, 1.2, 6.2, 6.9, 0, H1); // right side: bathroom door gap
  wall(hallE, 1.0, 1.2, 5.0, 6.2, 2.25, H1, 0xf2ecdc, false);
  const bathN = unit(); wall(bathN, 1.2, 5, 2.9, 3.1, 0, H1);
  const bathE = unit(); wall(bathE, 4.9, 5.1, 3.1, 6.9, 0, H1);
  const closet = unit(); wall(closet, -5, -1.2, 2.9, 3.1, 0, H1); fakeDoor(closet, -3.1, 2.87, 0, 'z');
  solid(-5, -1.2, 3.1, 6.9);                                                             // coat closet / laundry, closed
  // west wall of the living room / east wall of the bedroom, full height, door gap by the TV
  const bedE = unit();
  wall(bedE, -5.1, -4.9, -7, 1.6, 0, TOP); wall(bedE, -5.1, -4.9, 2.8, 6.9, 0, TOP); wall(bedE, -5.1, -4.9, 1.6, 2.8, 2.25, TOP, 0xf2ecdc, false);
  deco(bedE, 0.04, 2.35, 1.4, 0xffffff, -4.87, 1.17, 2.2);
  const mcl = unit(); wall(mcl, -9.9, -5.1, -2.1, -1.9, 0, H1); fakeDoor(mcl, -7.5, -1.87, 0, 'z');
  solid(-9.9, -5.1, -6.9, -2.1);                                                         // master closet / bath, closed

  /* ---- upstairs: landing floor, balcony rail, three closed doors ---- */
  const up = unit();
  const slab = box(up, UP.x1 - UP.x0, 0.22, UP.z1 - UP.z0, um(up, tan), 0, F2 - 0.11, (UP.z0 + UP.z1) / 2); slab.receiveShadow = true;
  deco(up, UP.x1 - UP.x0, 0.24, 0.12, 0xffffff, 0, F2 - 0.12, UP.z0);                  // white fascia
  wall(up, -5, 5, 2.9, 3.1, F2, TOP);
  for (const x of [-3.2, 0, 3.2]) fakeDoor(up, x, 2.87, F2, 'z');
  wall(up, 4.9, 5.1, 3.1, 6.9, F2, TOP);
  deco(up, 10, 0.2, 4, 0xe6dfcd, 0, TOP, 5);                                           // ceiling over the closed rooms
  const rail = (x0, x1, z0, z1) => {
    const lx = x1 - x0, lz = z1 - z0;
    deco(up, Math.max(lx, 0.1), 0.09, Math.max(lz, 0.1), 0xffffff, (x0 + x1) / 2, F2 + 0.95, (z0 + z1) / 2);
    const n = Math.round(Math.max(lx, lz) / 0.32);
    for (let i = 0; i <= n; i++) deco(up, 0.07, 0.92, 0.07, 0xffffff, x0 + (lx * i) / n, F2 + 0.47, z0 + (lz * i) / n);
    solid(Math.min(x0, x1) - 0.08, Math.max(x0, x1) + 0.08, Math.min(z0, z1) - 0.08, Math.max(z0, z1) + 0.08, F2, F2 + 1);
  };
  rail(ST.x1, 5, UP.z0, UP.z0); rail(5, 5, UP.z0, 2.9);

  /* ---- stairs up the west wall ---- */
  const stairs = unit();
  const steps = 14, run = (ST.zTop - ST.zBot) / steps;
  for (let i = 0; i < steps; i++) {
    const h = ((i + 1) * F2) / steps, z = ST.zBot + (i + 0.5) * run;
    box(stairs, ST.x1 - ST.x0, h, run, um(stairs, i % 2 ? 0xb88d58 : 0xc29a62), (ST.x0 + ST.x1) / 2, h / 2, z);
  }
  { // handrail on the open (east) side
    const len = Math.hypot(ST.zTop - ST.zBot, F2), ang = Math.atan2(F2, ST.zTop - ST.zBot);
    const r = deco(stairs, 0.09, 0.09, len, 0xffffff, ST.x1, F2 / 2 + 0.95, (ST.zBot + ST.zTop) / 2); r.rotation.x = -ang;
    for (let i = 1; i < steps; i += 2) { const z = ST.zBot + (i + 0.5) * run; deco(stairs, 0.06, 0.95, 0.06, 0xffffff, ST.x1, stairH(z) + 0.47, z); }
    solids.push({ x0: ST.x1 - 0.08, x1: ST.x1 + 0.1, z0: ST.zBot + 1.1, z1: ST.zTop, y0: 0, y1: TOP });
  }

  /* ---- furniture ---- */
  const furn = new THREE.Group(); scene.add(furn);
  const blue = 0x4a73b5, blueHi = 0x5a86c8;
  const F = (w, h, d, c, x, y, z, collide = true) => { const m = softBox(furn, w, h, d, c, x, y, z, 0.18); if (collide) solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, y + h / 2); return m; };
  const Fb = (w, h, d, c, x, y, z, collide = true) => { const m = box(furn, w, h, d, c, x, y, z); if (collide) solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, y + h / 2); return m; };
  // armchair, straight across from the hallway, facing it
  F(1.5, 0.5, 1.3, blue, 0, 0.3, -4.7); F(1.5, 0.8, 0.35, blue, 0, 0.75, -5.25, false);
  for (const s of [-1, 1]) F(0.3, 0.45, 1.3, blue, s * 0.7, 0.62, -4.7, false);
  F(1.0, 0.18, 0.85, blueHi, 0, 0.62, -4.6, false);
  // couch on the right, running along the hallway line, gap at the hall exit; faces the TV
  const cx = 1.85, cz0 = -3.4, cz1 = 1.0, czm = (cz0 + cz1) / 2, cl = cz1 - cz0;
  F(1.3, 0.5, cl, blue, cx, 0.3, czm); F(0.35, 0.85, cl, blue, cx + 0.55, 0.78, czm, false);
  for (const z of [cz0 + 0.15, cz1 - 0.15]) F(1.3, 0.45, 0.3, blue, cx, 0.65, z, false);
  for (let i = 0; i < 3; i++) F(0.95, 0.18, cl / 3 - 0.1, blueHi, cx - 0.08, 0.63, cz0 + 0.3 + (cl - 0.6) * (i + 0.5) / 3, false);
  // coffee table
  Fb(1.1, 0.08, 1.8, 0x8a5a34, -1.2, 0.5, -0.9); for (const [x, z] of [[-1.65, -1.65], [-0.75, -1.65], [-1.65, -0.15], [-0.75, -0.15]]) Fb(0.08, 0.46, 0.08, 0x6b4428, x, 0.23, z, false);
  Fb(0.3, 0.25, 0.2, 0xc7362b, -1.1, 0.67, -0.6, false);                                // a chew toy on the table
  // TV on a white stand, a few feet from the couch, facing it
  Fb(0.6, 0.6, 2.4, 0xf4f3ef, -3.15, 0.3, -1.1);
  Fb(0.1, 1.05, 1.95, 0x141416, -3.2, 1.2, -1.1, false);
  Fb(0.03, 0.92, 1.82, 0x2a3a52, -3.14, 1.2, -1.1, false).material = mat(0x2a3a52, { emissive: 0x2c4c7a, emissiveIntensity: 0.6, roughness: 0.3 });
  // kitchen island, brown, behind the couch
  Fb(1.2, 0.9, 3.2, 0x6b4a2e, 4.2, 0.45, -1.6); Fb(1.45, 0.08, 3.45, 0x3a302a, 4.2, 0.94, -1.6, false);
  for (const z of [-2.7, -1.6, -0.5]) { Fb(0.4, 0.06, 0.4, 0x2a2420, 3.35, 0.72, z, false); Fb(0.06, 0.7, 0.06, 0x2a2420, 3.35, 0.35, z, false); } // stools
  // kitchen along the back wall, fridge in the corner
  Fb(6.2, 0.9, 0.8, 0xf2efe6, 5.5, 0.45, -6.5); Fb(6.3, 0.08, 0.9, 0x3a302a, 5.5, 0.94, -6.45, false);
  Fb(0.8, 0.9, 2.6, 0xf2efe6, 9.5, 0.45, -4.8); Fb(0.9, 0.08, 2.6, 0x3a302a, 9.45, 0.94, -4.8, false);
  Fb(6.2, 0.7, 0.45, 0xf2efe6, 5.5, 2.3, -6.75, false);                                   // upper cabinets
  Fb(0.9, 0.03, 0.6, 0x1c1c1c, 4.0, 0.99, -6.45, false);                                  // cooktop
  for (const [x, z] of [[3.8, -6.6], [4.2, -6.3]]) Fb(0.18, 0.02, 0.18, 0x5a5a5a, x, 1.01, z, false);
  Fb(0.8, 0.04, 0.5, 0xbfc4c8, 6.8, 0.98, -6.45, false).material = mat(0xbfc4c8, { metalness: 0.6, roughness: 0.3 }); // sink
  Fb(1.0, 2.15, 0.9, 0xc9cdd1, 9.4, 1.08, -6.45).material = mat(0xc9cdd1, { metalness: 0.5, roughness: 0.35 });       // fridge
  Fb(0.04, 0.8, 0.04, 0x8a8f94, 9.0, 1.3, -6.0, false);
  // dining table by the lake windows, chairs around it (Dexter fits underneath)
  Fb(2.6, 0.1, 1.3, 0x8a5a34, 7.4, 0.95, 2.6, false);
  for (const [x, z] of [[6.25, 2.05], [8.55, 2.05], [6.25, 3.15], [8.55, 3.15]]) Fb(0.1, 0.9, 0.1, 0x6b4428, x, 0.45, z, false);
  for (const [x, z, ry] of [[6.6, 1.55, 0], [7.4, 1.55, 0], [8.2, 1.55, 0], [6.6, 3.65, Math.PI], [7.4, 3.65, Math.PI], [8.2, 3.65, Math.PI]]) {
    const ch = new THREE.Group(); box(ch, 0.5, 0.06, 0.5, 0x7a4e2c, 0, 0.55, 0); box(ch, 0.5, 0.6, 0.06, 0x7a4e2c, 0, 0.88, -0.22);
    for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(ch, 0.05, 0.55, 0.05, 0x6b4428, a, 0.27, b);
    ch.position.set(x, 0, z); ch.rotation.y = ry; furn.add(ch);
  }
  // potted plant by the slider, floor lamp by the armchair
  Fb(0.6, 0.6, 0.6, 0xc8693f, 0.3, 0.3, -6.3);
  for (let i = 0; i < 6; i++) { const l = box(furn, 0.6, 0.04, 0.7, 0x2f7d3f, 0.3 + Math.cos(i * 1.2) * 0.3, 0.8 + i * 0.16, -6.3 + Math.sin(i * 1.2) * 0.25); l.rotation.set(0.4, i * 1.2, 0.3); }
  Fb(0.08, 1.8, 0.08, 0x2a2a2a, 1.3, 0.9, -5.6, false); Fb(0.5, 0.4, 0.5, 0xf4ead2, 1.3, 1.9, -5.6, false);
  // bathroom: vanity, toilet, tub
  Fb(1.8, 0.9, 0.55, 0xf2efe6, 2.6, 0.45, 3.4); Fb(0.5, 0.04, 0.35, 0xffffff, 2.6, 0.92, 3.4, false);
  deco(bathN, 1.2, 0.9, 0.03, 0xcfe6f2, 2.6, 1.9, 3.12, { metalness: 0.5, roughness: 0.1 }); // mirror
  F(0.45, 0.45, 0.6, 0xffffff, 4.4, 0.25, 6.4); F(0.45, 0.6, 0.18, 0xffffff, 4.4, 0.6, 6.7, false);
  F(0.8, 0.6, 2.0, 0xffffff, 4.45, 0.3, 4.3); Fb(0.6, 0.03, 1.75, 0x9fd6ff, 4.45, 0.59, 4.3, false);
  // master bedroom: bed against the west wall, nightstand, dresser
  F(2.4, 0.5, 2.1, 0x8a6a48, -8.6, 0.25, 3.2); F(2.2, 0.25, 2.0, 0xe8e2d6, -8.5, 0.62, 3.2, false); F(1.4, 0.06, 2.05, 0x3f6f8f, -8.0, 0.76, 3.2, false);
  F(0.15, 1.3, 2.2, 0x6b4a2e, -9.82, 0.65, 3.2, false);
  for (const z of [2.65, 3.75]) F(0.5, 0.18, 0.75, 0xffffff, -9.35, 0.85, z, false);
  Fb(0.6, 0.6, 0.6, 0x6b4a2e, -9.55, 0.3, 1.6); Fb(0.25, 0.35, 0.25, 0xf4ead2, -9.55, 0.78, 1.6, false);
  Fb(2.0, 1.1, 0.6, 0x6b4a2e, -7.2, 0.55, 6.5);

  /* ---- grey chandelier hanging over the living room ---- */
  const chand = new THREE.Group(); chand.position.set(-1.6, 4.6, -1.6); scene.add(chand);
  const grey = mat(0x8c9196, { metalness: 0.6, roughness: 0.35 });
  box(chand, 0.05, TOP - 4.6, 0.05, grey, 0, (TOP - 4.6) / 2, 0);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), grey); chand.add(hub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 6, 24), grey); ring.rotation.x = Math.PI / 2; ring.position.y = -0.15; chand.add(ring);
  const bulbM = mat(0xfff1c8, { emissive: 0xffd27a, emissiveIntensity: 1.4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, x = Math.cos(a) * 0.75, z = Math.sin(a) * 0.75;
    const arm = box(chand, 0.75, 0.035, 0.035, grey, x / 2, -0.08, z / 2); arm.rotation.y = -a;
    box(chand, 0.12, 0.08, 0.12, grey, x, -0.12, z);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbM); b.position.set(x, 0.0, z); chand.add(b);
  }
  for (const o of chand.children) o.castShadow = false;

  /* ---- doors Dexter can bark open ---- */
  const doors = {
    front: { open: 0, want: 0, t: 0 },
    slider: { open: 0, want: 0, t: 0 },
  };
  const frontPivot = new THREE.Group(); frontPivot.position.set(-0.6, 0, 6.86); S.add(frontPivot);
  deco(frontPivot, 1.2, 2.3, 0.08, 0x1d4352, 0.6, 1.15, 0);
  deco(frontPivot, 0.5, 0.35, 0.09, 0x9fd6ff, 0.6, 1.95, 0, { emissive: 0x6fb8e8, emissiveIntensity: 0.4 });
  deco(frontPivot, 0.07, 0.07, 0.14, 0xc9a85a, 1.0, 1.05, 0, { metalness: 0.6, roughness: 0.3 });
  const sliderPanel = new THREE.Group(); sliderPanel.position.set(-2.05, 0, -6.84); N.add(sliderPanel);
  for (const [px, pz, g] of [[0, 0, sliderPanel], [1.1, -0.08, N]]) {
    const ox = g === N ? -2.05 + px : 0, oz = g === N ? -6.84 + pz : 0;
    deco(g, 1.1, 2.3, 0.06, 0xffffff, ox, 1.15, oz);
    deco(g, 0.9, 2.05, 0.07, 0xcfeaff, ox, 1.15, oz, { transparent: true, opacity: 0.35, roughness: 0.05 });
  }

  /* ---- treats hidden around the house, a few new ones each day ---- */
  const SPOTS = [[7.4, 0, 2.6], [-7.6, 0, 5.6], [2.6, 0, 5.4], [3.6, F2, 2.25], [-0.6, 0, -6.1], [8.4, 0, -2.6], [-4.3, 0, -6.3], [-7.2, 0, 0.5], [-2.0, F2, 2.25], [-3.4, 0, 2.2]];
  let treats = [];
  function resetDay() {
    for (const t of treats) scene.remove(t.mesh);
    treats = [];
    const spots = [...SPOTS].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const [x, y, z] of spots) {
      const type = Math.random() < 0.5 ? 'biscuit' : Math.random() < 0.6 ? 'bacon' : Math.random() < 0.8 ? 'cheese' : 'drumstick';
      const mesh = makeTreat(type); mesh.position.set(x, y + 0.6, z); scene.add(mesh);
      treats.push({ mesh, type, x, y, z, ph: rand(0, 6) });
    }
  }

  /* ---- world interface used by Dexter's movement ---- */
  function surfaceY(x, z, y) {
    if (inStairs(x, z)) return stairH(z);
    if (inUp(x, z) && y > 2.5) return F2;
    return 0;
  }
  function blocked(x, z, y) {
    // the open doorways lead out of the house (main.js catches Dexter crossing them)
    const out = (k) => doors[k].open > 0.7 && x > DOOR[k].x0 + 0.1 && x < DOOR[k].x1 - 0.1 && y < 1;
    if (z > 6.75 && !(out('front') && z < 7.6)) return true;
    if (z < -6.75 && !(out('slider') && z > -7.6)) return true;
    if (x < -9.75 || x > 9.75) return true;
    if (inStairs(x, z) && Math.abs(stairH(z) - y) > 0.6) return true;
    for (const s of solids) {
      if (x <= s.x0 || x >= s.x1 || z <= s.z0 || z >= s.z1) continue;
      if (s.door && doors[s.door].open > 0.7) continue;
      if (y + 0.5 > s.y0 && y < s.y1 - 0.05) return true;
    }
    return false;
  }

  function nearDoor(dex) {
    if (dex.y > 1) return null;
    if (Math.hypot(dex.x, dex.z - 6.2) < 1.5) return 'front';
    if (Math.hypot(dex.x + 1.7, dex.z + 6.2) < 1.6) return 'slider';
    return null;
  }
  // the context action for the E / 🐾 prompt
  function action(dex) {
    const k = nearDoor(dex);
    if (!k || doors[k].want > 0) return null;
    return { type: 'door', door: k, label: k === 'front' ? 'Bark at the front door' : 'Bark at the sliding door' };
  }
  function openDoor(k) { doors[k].want = 1; doors[k].t = 6; }

  /* ---- per-frame ---- */
  const ray = new THREE.Raycaster(), tmp = new THREE.Vector3(), camPos = new THREE.Vector3();
  function update(dt, dex, cam, clock, skyColor, night) {
    scene.background.copy(skyColor);
    lamp.intensity = night ? 26 : 9;
    for (const k of ['front', 'slider']) {
      const d = doors[k];
      if (d.want && (d.t -= dt) <= 0) d.want = 0;
      d.open += (d.want - d.open) * Math.min(1, dt * 5);
    }
    frontPivot.rotation.y = doors.front.open * 1.75;
    sliderPanel.position.x = -2.05 + doors.slider.open * 1.05;
    chand.rotation.y = Math.sin(clock * 0.4) * 0.04;
    // fade whatever stands between the camera and Dexter
    camPos.copy(cam.position);
    const hits = new Set();
    for (const [ox, oy] of [[0, 0.6], [0, 1.4], [0.6, 0.9], [-0.6, 0.9]]) {
      tmp.set(dex.x + ox, dex.y + oy, dex.z).sub(camPos);
      const len = tmp.length(); tmp.normalize();
      ray.set(camPos, tmp); ray.far = len - 0.2;
      for (const h of ray.intersectObjects(units, true)) {
        let o = h.object; while (o && !units.includes(o)) o = o.parent;
        if (o) hits.add(o);
      }
    }
    for (const u of units) {
      const want = hits.has(u) ? 0.14 : 1;
      u.userData.fade += (want - u.userData.fade) * Math.min(1, dt * 8);
      const f = u.userData.fade;
      for (const m of u.userData.mats.values()) {
        const base = m.userData.base ?? (m.userData.base = m.opacity);
        m.opacity = base * f; m.depthWrite = f > 0.95;
      }
    }
    // treats
    let got = [];
    for (let i = treats.length - 1; i >= 0; i--) {
      const t = treats[i];
      t.mesh.rotation.y += dt * 2; t.mesh.position.y = t.y + 0.6 + Math.sin(clock * 3 + t.ph) * 0.12;
      if (Math.abs(dex.y - t.y) < 1 && Math.hypot(dex.x - t.x, dex.z - t.z) < 1.15) {
        got.push(t.type); scene.remove(t.mesh); treats.splice(i, 1);
      }
    }
    // walked out through an open doorway?
    let exit = null;
    if (doors.front.open > 0.7 && dex.z > 6.8) exit = 'front';
    if (doors.slider.open > 0.7 && dex.z < -6.8) exit = 'slider';
    return { got, exit };
  }

  // came in through `via`: that door starts open and swings shut behind him
  function enter(via) {
    for (const k of ['front', 'slider']) { doors[k].open = k === via ? 1 : 0; doors[k].want = 0; doors[k].t = 0; }
    for (const u of units) u.userData.fade = 1;
  }

  function camera(want, look, dex) {
    want.set(dex.x, dex.y + 8.2, dex.z + 6.4);
    look.set(dex.x, dex.y + 0.8, dex.z);
  }

  return { scene, blocked, surfaceY, water: () => false, action, openDoor, update, enter, camera, resetDay, treatsLeft: () => treats.length, TREATS };
}
