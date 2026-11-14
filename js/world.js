// The neighbourhood beyond the yard's tree line, laid out loosely after an aerial view of
// the real area (positions compressed so it fits): dense forest all round, a big paved road
// running off to the south-west with a dirt lane down to it, neighbours' houses tucked into
// clearings (one with a huge paver driveway, one with a pool), a dark pond to the north-east,
// a field to the east and a patch of rusty-brown oaks out east. Deliberately unnamed: no
// street names or addresses, since this ships on a public page.
//
// The forest is replanted every season like the yard's trees, merged into a few big meshes
// (thousands of trees, a handful of draw calls) with a spatial grid for collision.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, box, makeTree } from './models.js';

export const OUTER_R = 96;   // how far Dexter can roam
const PLANT_R = 135;         // forest keeps going (unwalkable) into the fog

/* ---- layout ---- */
// main road: a straight line heading south-east / north-west, closest to the house at (-32, 54)
const ROAD = { px: -32, pz: 54, dx: 0.857, dz: 0.514, w: 6.5 };
const roadDist = (x, z) => Math.abs((x - ROAD.px) * -ROAD.dz + (z - ROAD.pz) * ROAD.dx);
// outer edge roads, north and west, mostly lost in the fog
const EDGE_ROADS = [[[-100, -92], [-38, -92]], [[-98, -92], [-98, 30]]];
// dirt lanes: from the yard down to the main road, and east along the old farm road to the field
const LANES = [
  [[-3, 11], [-8, 26], [-15, 42], [-24, 59]],
  [[37, 13], [55, 12], [72, 13], [86, 17]],
];
// neighbours: [x, z, width, depth, roof colour, rotation, yard radius]
const HOUSES = [
  [-47, -3, 11, 8, 0x8a4f45, 0.25, 11],        // west, red-brown roof
  [52, -22, 12, 9, 0x9fb4c0, -0.35, 11],       // north-east, pale metal roof, big paver drive
  [-33, -77, 9, 7, 0x7d8288, 0.1, 9],          // north
  [-66, -62, 10, 8, 0x6b4a3a, -0.5, 10],       // north-west, with a pool
  [-77, -17, 8, 7, 0x6f8090, 0.6, 8],          // far west
  [90, 23, 9, 7, 0xa89a80, -0.2, 9],           // east, at the field
  [12, 82, 9, 7, 0x7a6a5a, 0.55, 9],           // south, across the main road
];
const SHED = { x: -40, z: -30, w: 3, d: 3, roof: 0x3f8f8a };
const PAVERS = { x: 40, z: -34, r: 7.5 };
const POND = { x: 56, z: -58, rx: 7, rz: 11 };
const FIELD = { x: 86, z: 16, r: 16 };
const POOL = { x: -60, z: -55, w: 4, d: 2.6 };
const OAKS = { x: 70, z: -20, r: 34 };       // rusty brown oaks, whatever the season

/* ---- see-through canopies ----
 * Tree materials get a tiny shader patch: anything above Dexter's back that sits close to the
 * line from the camera to Dexter is discarded, so leaves never hide him. Shadows are untouched. */
export const viewU = { uDex: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() }, uCut: { value: 0 } };
const cutCache = new Map();
export function cutaway(material) {
  if (cutCache.has(material)) return cutCache.get(material);
  const m = material.clone();
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, viewU);
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWPos;\nuniform vec3 uDex;\nuniform vec3 uCam;\nuniform float uCut;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  if (uCut > 0.5) {
    vec3 ab = uDex - uCam; float t = clamp(dot(vWPos - uCam, ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(vWPos - (uCam + ab * t));
    if (t < 0.985 && vWPos.y > uDex.y + 0.95 && d < 2.4 + 0.8 * t) discard;
  }`);
  };
  m.customProgramCacheKey = () => 'cutaway';
  cutCache.set(material, m);
  return m;
}

function segDist(x, z, [ax, az], [bx, bz]) {
  const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}
const polyDist = (x, z, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(x, z, pts[i], pts[i + 1])); return d; };
export const inPond = (x, z) => ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2 < 1;

// open ground where nothing grows: roads, lanes, yards, the pond, the field
export function keepClear(x, z, pad = 0) {
  if (roadDist(x, z) < ROAD.w / 2 + 1.5 + pad) return true;
  for (const r of EDGE_ROADS) if (polyDist(x, z, r) < 4.5 + pad) return true;
  for (const l of LANES) if (polyDist(x, z, l) < 2.6 + pad) return true;
  for (const h of HOUSES) if (Math.hypot(x - h[0], z - h[1]) < h[6] + pad) return true;
  if (Math.hypot(x - SHED.x, z - SHED.z) < 4 + pad) return true;
  if (Math.hypot(x - PAVERS.x, z - PAVERS.z) < PAVERS.r + 1.5 + pad) return true;
  if (((x - POND.x) / (POND.rx + 3 + pad)) ** 2 + ((z - POND.z) / (POND.rz + 3 + pad)) ** 2 < 1) return true;
  if (Math.hypot(x - FIELD.x, z - FIELD.z) < FIELD.r + pad) return true;
  return false;
}

export function createWorld(scene) {
  const g = new THREE.Group(); scene.add(g);
  const flat = (geo, color, x, z, y = 0.025, ry = 0) => {
    const m = new THREE.Mesh(geo, mat(color)); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m;
  };
  const strip = (pts, w, color, y) => { // flat ribbon along a polyline
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      const s = box(g, w, 0.04, l + w * 0.6, color, (ax + bx) / 2, y, (az + bz) / 2); s.rotation.y = Math.atan2(bx - ax, bz - az); s.castShadow = false;
    }
  };
  const solids = []; // static rects for houses etc: {x, z, hw, hd, ry}

  // main road with a dashed centre line
  const rp = (t) => [ROAD.px + ROAD.dx * t, ROAD.pz + ROAD.dz * t];
  strip([rp(-150), rp(150)], ROAD.w, 0x5a5d61, 0.03);
  for (let t = -150; t < 150; t += 6) strip([rp(t), rp(t + 2.6)], 0.18, 0xe8d26a, 0.05);
  for (const r of EDGE_ROADS) strip(r, 6, 0x5a5d61, 0.03);
  for (const l of LANES) strip(l, 3, 0xb9a98c, 0.025);

  // field and clearings
  flat(new THREE.CircleGeometry(FIELD.r, 24), 0xa9b56a, FIELD.x, FIELD.z, 0.02);
  for (let i = 0; i < 9; i++) strip([[FIELD.x - 12, FIELD.z - 9 + i * 2.2], [FIELD.x + 10, FIELD.z - 10 + i * 2.2]], 0.5, 0x98a35c, 0.03); // mown rows
  flat(new THREE.CircleGeometry(PAVERS.r, 24), 0xc9a98a, PAVERS.x, PAVERS.z, 0.03);
  for (let i = 0; i < 3; i++) flat(new THREE.RingGeometry(2 + i * 1.8, 2.1 + i * 1.8, 24), 0xb39072, PAVERS.x, PAVERS.z, 0.04);
  strip([[PAVERS.x + 5, PAVERS.z + 4], [52, -26]], 4, 0xc9a98a, 0.03);
  const pond = flat(new THREE.CircleGeometry(1, 28), 0x2e4a52, POND.x, POND.z, 0.03); pond.scale.set(POND.rx, POND.rz, 1);
  pond.material = mat(0x2e4a52, { roughness: 0.15, transparent: true, opacity: 0.92 });

  // neighbours' houses: simple versions of the real thing, each in a sandy little clearing
  const roofFor = (w, d, color, y) => {
    const geo = new THREE.CylinderGeometry(0.7071 * 0.35, 0.7071, 2.4, 4); geo.rotateY(Math.PI / 4);
    const m = new THREE.Mesh(geo, mat(color)); m.scale.set(w + 1, 1, d + 1); m.position.y = y + 1.2; m.castShadow = true; return m;
  };
  for (const [x, z, w, d, roof, ry, yr] of HOUSES) {
    flat(new THREE.CircleGeometry(yr, 20), 0xb7a77e, x, z, 0.015);
    const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; g.add(h);
    const siding = [0xe9e2cf, 0xd9d2c0, 0xf0e6d2, 0xc9c2b4][Math.abs(Math.round(x + z)) % 4];
    box(h, w, 3, d, siding, 0, 1.5, 0);
    h.add(roofFor(w, d, roof, 3));
    box(h, 1.1, 2.1, 0.1, 0x4a3a2c, 0, 1.05, d / 2 + 0.03);
    for (const s of [-1, 1]) box(h, 1.2, 1.1, 0.1, mat(0x9fd6ff, { emissive: 0xffc860, emissiveIntensity: 0.15 }), s * w * 0.28, 1.7, d / 2 + 0.03);
    box(h, w * 0.6, 0.25, 1.6, 0xb8b2a6, 0, 0.12, d / 2 + 0.8);
    solids.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3, ry });
  }
  { // shed with the teal roof
    const s = new THREE.Group(); s.position.set(SHED.x, 0, SHED.z); s.rotation.y = 0.4; g.add(s);
    box(s, SHED.w, 2.2, SHED.d, 0xd8cfb8, 0, 1.1, 0); s.add(roofFor(SHED.w - 0.6, SHED.d - 0.6, SHED.roof, 2.2));
    solids.push({ x: SHED.x, z: SHED.z, hw: SHED.w / 2 + 0.2, hd: SHED.d / 2 + 0.2, ry: 0.4 });
  }
  { // pool behind the north-west house
    box(g, POOL.w + 0.6, 0.3, POOL.d + 0.6, 0xe6e2da, POOL.x, 0.15, POOL.z).rotation.y = -0.5;
    const w = box(g, POOL.w, 0.32, POOL.d, mat(0x4fc3e0, { roughness: 0.1, emissive: 0x1f7a99, emissiveIntensity: 0.25 }), POOL.x, 0.17, POOL.z); w.rotation.y = -0.5; w.castShadow = false;
    solids.push({ x: POOL.x, z: POOL.z, hw: POOL.w / 2 + 0.3, hd: POOL.d / 2 + 0.3, ry: -0.5 });
  }
  { // a car on the paver drive, a boat trailer by the field
    const car = new THREE.Group(); car.position.set(PAVERS.x + 2, 0, PAVERS.z - 1); car.rotation.y = 1.1; g.add(car);
    box(car, 1.8, 0.8, 4, 0x8f1d1d, 0, 0.7, 0); box(car, 1.6, 0.6, 2, 0x2a2a2a, 0, 1.4, -0.2);
    for (const [a, b] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) box(car, 0.25, 0.6, 0.6, 0x111111, a, 0.3, b);
    solids.push({ x: car.position.x, z: car.position.z, hw: 1.1, hd: 2.2, ry: 1.1 });
  }

  /* ---- forest (replanted each season) ---- */
  let forest = null, grid = new Map();
  const CELL = 4, key = (cx, cz) => cx * 1000 + cz;
  const RUST = [[0xb5652e, 0xc97a3a], [0x9a5a2a, 0xb06a32], [0x8a6a3a, 0xa07a40], [0x6f8a3a, 0x8a5a2a]];
  function plantForest(season, R, keepOut) {
    if (forest) { scene.remove(forest); forest.traverse((o) => o.geometry && o.geometry.dispose()); }
    grid = new Map();
    const rr = (a, b) => a + R() * (b - a), pk = (arr) => arr[Math.floor(R() * arr.length)];
    // merged per material *and* per 30-unit chunk, so the camera and the shadow pass can skip
    // the chunks they can't see instead of drawing the whole forest every frame
    const buckets = new Map(), m4 = new THREE.Matrix4();
    const add = (tree, x, z) => {
      const chunk = `${Math.floor(x / 30)},${Math.floor(z / 30)}`, far = Math.hypot(x, z) > OUTER_R + 4;
      tree.updateMatrixWorld(true);
      tree.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        geo.applyMatrix4(m4.copy(o.matrixWorld));
        const k = `${chunk}|${far}`;
        if (!buckets.has(k)) buckets.set(k, { far, mats: new Map() });
        const b = buckets.get(k).mats;
        if (!b.has(o.material)) b.set(o.material, []);
        b.get(o.material).push(geo);
        o.geometry.dispose();
      });
    };
    const step = 3.4;
    for (let x = -PLANT_R; x < PLANT_R; x += step) for (let z = -PLANT_R; z < PLANT_R; z += step) {
      const px = x + rr(0, step), pz = z + rr(0, step), r = Math.hypot(px, pz);
      if (r < 36 || r > PLANT_R || keepOut(px, pz) || keepClear(px, pz)) continue;
      if (R() < (r > OUTER_R ? 0.45 : 0.22)) continue;          // a few gaps, thinner out in the fog
      const rust = Math.hypot(px - OAKS.x, pz - OAKS.z) < OAKS.r && R() < 0.45;
      const kind = rust ? 'round' : R() < 0.62 ? 'pine' : 'round';
      const pal = { pine: pk(season.pines), round: rust ? pk(RUST) : season.rounds ? pk(season.rounds) : null };
      const sc = rr(0.9, 1.6);
      const t = makeTree(kind, sc, pal, R() * 6.28); t.position.set(px, 0, pz);
      add(t, px, pz);
      if (r < OUTER_R + 2) {
        const k = key(Math.floor(px / CELL), Math.floor(pz / CELL));
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push({ x: px, z: pz, r: 0.55 * sc });
      }
    }
    forest = new THREE.Group();
    for (const { far, mats } of buckets.values()) for (const [material, geos] of mats) {
      const merged = mergeGeometries(geos); for (const q of geos) q.dispose();
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, cutaway(material)); m.castShadow = !far; m.receiveShadow = !far; forest.add(m);
    }
    scene.add(forest);
  }

  // blocked by the forest, a house, the pool or the edge of the world (the yard handles r < 34)
  function blocked(x, z) {
    if (x * x + z * z < 33 * 33) return false;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = grid.get(key(cx + i, cz + j)); if (!list) continue;
      for (const t of list) { const dx = x - t.x, dz = z - t.z; if (dx * dx + dz * dz < (t.r + 0.4) ** 2) return true; }
    }
    for (const s of solids) {
      const dx = x - s.x, dz = z - s.z, c = Math.cos(s.ry), sn = Math.sin(s.ry);
      const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      if (Math.abs(lx) < s.hw && Math.abs(lz) < s.hd) return true;
    }
    return false;
  }
  return { group: g, plantForest, blocked, water: inPond, keepClear };
}
