// Easter egg level: Dexter's D-Day daydream. He rides a landing boat onto a beach and
// hoses down ten entrenched squirrels with a slobber machine gun. Nobody is hurt: a
// thoroughly slobbered squirrel just waves a white flag. Self-contained scene + logic.
import * as THREE from 'three';
import { mat, box, softBox, makeDexter, animateDog, makeSquirrel } from './models.js';
import { sfx } from './sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOTAL = 10, SHORE_Z = 12, MAX_HP = 20;

export function createDday({ keys, stick, fireHeld, onEnd }) {
  const $ = (id) => document.getElementById(id);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb7c4cc);
  scene.fog = new THREE.Fog(0xb7c4cc, 34, 85);
  scene.add(new THREE.HemisphereLight(0xe8eef5, 0x8a7a5a, 1.0));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
  sun.position.set(-14, 26, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 90 });
  sun.shadow.bias = -0.002;
  scene.add(sun);

  /* ---- terrain ---- */
  const flat = (w, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  flat(240, 90, 0x4f7f95, 0, -0.06, SHORE_Z + 44);                 // sea
  flat(240, 36, 0xd9c79a, 0, 0, SHORE_Z - 17.5);                   // beach
  flat(240, 3, 0xc2b084, 0, 0.01, SHORE_Z - 1);                    // wet sand
  box(scene, 240, 1.6, 40, 0x7da35a, 0, 0.8, -41.5);               // grassy bluff behind the beach
  const slope = box(scene, 240, 0.3, 3.2, 0xc9b88c, 0, 0.75, -20.4); slope.rotation.x = -0.52;
  const foam = [];
  for (let i = 0; i < 3; i++) { const f = flat(240, 0.5, 0xf4f8fb, 0, 0.02, SHORE_Z + i * 2.2); f.material = mat(0xf4f8fb, { transparent: true, opacity: 0.7 }); foam.push(f); }

  const solids = []; // {x, z, r}
  // beach obstacles: crossed log "hedgehogs"
  for (const [x, z] of [[-14, 6], [-6, 8], [4, 5.5], [13, 7.5], [-10, 0], [0, -1.5], [9, 1], [17, -3], [-17, -5], [-3, -8], [6, -9]]) {
    const h = new THREE.Group();
    for (let i = 0; i < 3; i++) { const b = box(h, 0.22, 2.4, 0.22, 0x5a4632, 0, 0.75, 0); b.rotation.set(i === 0 ? 0.9 : i === 1 ? -0.9 : 0, i * 1.05, i === 2 ? 0.9 : 0); }
    h.position.set(x, 0, z); h.rotation.y = rand(0, 3); scene.add(h); solids.push({ x, z, r: 0.9 });
  }

  /* ---- squirrel positions ---- */
  const posts = [];
  const concrete = 0x9a9d9f;
  for (const x of [-15, -9, -3, 3, 9, 15]) {                       // bunkers along the foot of the bluff
    box(scene, 3.4, 1.5, 2.6, concrete, x, 0.75, -17.3); box(scene, 3.8, 0.3, 3.0, 0x85888a, x, 1.6, -17.3);
    box(scene, 2.2, 0.35, 0.1, 0x1c1c1c, x, 1.0, -15.98);
    posts.push({ x, y: 1.75, z: -17.2 });
  }
  for (const x of [-7.5, 7.5]) {                                   // the large guns up on the bluff
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.7, 12), mat(concrete)); base.position.y = 0.35; base.castShadow = true; g.add(base);
    box(g, 1.3, 1.1, 1.6, 0x5c6650, 0, 1.2, 0);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 4.6, 10), mat(0x4a5340)); barrel.rotation.x = Math.PI / 2 - 0.22; barrel.position.set(0, 1.9, 2.4); barrel.castShadow = true; g.add(barrel);
    box(g, 0.5, 0.5, 0.4, 0x3a4233, 0, 2.42, 4.55);
    g.position.set(x, 1.6, -24); scene.add(g);
    posts.push({ x: x + 1.5, y: 1.6, z: -23 });
  }
  for (const [x, z] of [[-11, -8.5], [11, -6.5]]) {                // sandbag nests on the beach
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 1.5 - Math.PI * 0.25; for (let l = 0; l < 2; l++) softBox(scene, 0.8, 0.35, 0.5, 0xb7a377, x + Math.cos(a + l * 0.17) * 1.35, 0.18 + l * 0.33, z + Math.sin(a + l * 0.17) * 1.35, 0.4).rotation.y = -a; }
    solids.push({ x, z, r: 1.7 });
    posts.push({ x, y: 0, z });
  }
  for (const p of posts) if (p.y > 1.7) solids.push({ x: p.x, z: p.z, r: 1.6 });
  for (const x of [-15, -9, -3, 3, 9, 15]) solids.push({ x, z: -17.3, r: 1.9 });

  const squirrels = posts.map((p) => {
    const mesh = makeSquirrel();
    mesh.scale.setScalar(2.3);
    softBox(mesh, 0.24, 0.11, 0.24, 0x5a6b3a, 0, 0.5, 0.2, 0.45);                          // tiny helmet
    const flag = new THREE.Group(); box(flag, 0.03, 0.8, 0.03, 0x8a6a48, 0, 0.4, 0); box(flag, 0.34, 0.24, 0.02, 0xffffff, 0.18, 0.66, 0);
    flag.position.set(0.16, 0.2, 0.05); flag.visible = false; mesh.add(flag);
    const goo = softBox(mesh, 0.3, 0.14, 0.4, mat(0x9fe3ff, { transparent: true, opacity: 0.85, roughness: 0.1 }), 0, 0.36, 0.02, 0.45); goo.visible = false;
    mesh.position.set(p.x, p.y, p.z); scene.add(mesh);
    return { mesh, flag, goo, ...p, hp: 3, cool: rand(1.5, 4), done: false, hit: 0 };
  });

  /* ---- the landing boat ---- */
  const boat = new THREE.Group();
  box(boat, 3.4, 0.3, 6.4, 0x5c6650, 0, 0.15, 0);
  for (const s of [-1, 1]) box(boat, 0.2, 1.3, 6.4, 0x66705a, s * 1.6, 0.8, 0);
  box(boat, 3.4, 1.3, 0.2, 0x66705a, 0, 0.8, 3.1);
  box(boat, 1.2, 1.0, 1.0, 0x4a5340, 0.8, 1.0, 2.4);                                        // wheelhouse
  const ramp = new THREE.Group(); ramp.position.set(0, 0.3, -3.2); boat.add(ramp);
  box(ramp, 3.2, 1.9, 0.18, 0x66705a, 0, 0.95, 0);
  scene.add(boat);

  /* ---- war-torn Dexter: eye scar, camo bandana, military vest, slobber gun mounted ---- */
  const dexMesh = makeDexter();
  dexMesh.scale.setScalar(1.45);
  const du = dexMesh.userData;
  const CAMO = [0x5a6b3a, 0x3d4a2a, 0x8a7f55, 0x2f3a22];
  // big scar slashed through the left eye
  const scar = softBox(du.head, 0.05, 0.42, 0.03, 0xd98a8a, -0.12, 0.14, 0.3); scar.rotation.z = 0.35;
  for (const dy of [-0.1, 0.02, 0.14]) softBox(du.head, 0.13, 0.025, 0.03, 0xd98a8a, -0.12 + dy * 0.35, 0.14 + dy, 0.302).rotation.z = 0.35;
  softBox(du.head, 0.11, 0.05, 0.05, 0x1b1b1f, -0.12, 0.18, 0.29);                          // half-closed lid over that eye
  // camo bandana tied round his head, knot and tails at the back
  softBox(du.head, 0.5, 0.13, 0.48, CAMO[0], 0, 0.27, 0.04, 0.3);
  for (let i = 0; i < 7; i++) softBox(du.head, 0.12, 0.135, 0.1, CAMO[1 + (i % 3)], Math.cos(i * 0.9) * 0.2, 0.27, 0.04 + Math.sin(i * 0.9) * 0.2);
  softBox(du.head, 0.12, 0.1, 0.1, CAMO[1], 0, 0.27, -0.22);
  const tails = [];
  for (const s of [-1, 1]) { const t = softBox(du.head, 0.07, 0.03, 0.3, CAMO[s > 0 ? 0 : 2], s * 0.05, 0.24, -0.38); t.rotation.y = s * 0.3; tails.push(t); }
  // military dog vest with pouches and a handle
  softBox(du.inner, 0.62, 0.36, 0.72, CAMO[0], 0, 0.78, 0.02, 0.2);
  for (let i = 0; i < 8; i++) softBox(du.inner, 0.14, 0.365, 0.16, CAMO[1 + (i % 3)], (i % 2 ? 1 : -1) * 0.18, 0.78, -0.26 + (i >> 1) * 0.17);
  softBox(du.inner, 0.64, 0.07, 0.1, 0x2a2a2a, 0, 0.62, 0.3); softBox(du.inner, 0.64, 0.07, 0.1, 0x2a2a2a, 0, 0.62, -0.26);   // straps
  softBox(du.inner, 0.08, 0.06, 0.3, 0x2a2a2a, 0, 0.99, 0.02);                                                                   // grab handle
  softBox(du.inner, 0.1, 0.18, 0.22, 0x4d5c32, -0.34, 0.74, 0.12); softBox(du.inner, 0.1, 0.18, 0.22, 0x8a7f55, -0.34, 0.74, -0.14); // pouches
  softBox(du.inner, 0.03, 0.12, 0.16, 0xf2f0ea, -0.4, 0.86, 0.0);                                                                // name patch
  softBox(du.inner, 0.13, 0.13, 0.95, 0x2a2a2a, 0.42, 0.92, 0.5); softBox(du.inner, 0.3, 0.3, 0.42, mat(0x9fe3ff, { roughness: 0.15 }), 0.42, 1.0, -0.05, 0.45);
  softBox(du.inner, 0.08, 0.12, 0.08, 0x2a2a2a, 0.42, 0.9, 0.2);
  scene.add(dexMesh);

  const globGeo = new THREE.SphereGeometry(0.16, 8, 6), globMat = mat(0xbfeaff, { roughness: 0.1, emissive: 0x3a8fb8, emissiveIntensity: 0.4 });
  const acornGeo = new THREE.SphereGeometry(0.2, 8, 6), acornMat = mat(0x8a5a2b);
  let globs = [], acorns = [];
  const st = { phase: 'off', t: 0, x: 0, y: 0, z: 0, face: Math.PI, move: 0, hp: MAX_HP, count: 0, fireT: 0, hurt: 0, boatZ: 36, clock: 0 };

  const caption = (text) => { $('dday-cap').textContent = text; };
  const hud = () => {
    const bars = Math.max(0, Math.round((st.hp / MAX_HP) * 8));
    $('dday-hud').textContent = `🪖 D-DAY  ·  Squirrels slobbered ${st.count}/${TOTAL}  ·  ${'█'.repeat(bars)}${'░'.repeat(8 - bars)}`;
  };

  function start() {
    for (const g of globs) scene.remove(g.mesh); for (const a of acorns) scene.remove(a.mesh);
    globs = []; acorns = [];
    for (const s of squirrels) { s.hp = 3; s.done = false; s.flag.visible = false; s.goo.visible = false; s.cool = rand(2, 5); s.mesh.rotation.set(0, 0, 0); }
    Object.assign(st, { phase: 'boat', t: 0, x: 0, y: 0.45, z: 36, face: Math.PI, move: 0, hp: MAX_HP, count: 0, hurt: 0, boatZ: 36 });
    ramp.rotation.x = 0;
    caption('June 6th. Somewhere deep inside Dexter\'s head.');
    hud();
  }

  function fire(dt) {
    st.fireT -= dt;
    if (!fireHeld() || st.fireT > 0) return;
    st.fireT = 0.11;
    // gentle auto-aim: the nearest unslobbered squirrel in range
    let target = null, best = 21;
    for (const s of squirrels) { if (s.done) continue; const d = Math.hypot(s.x - st.x, s.z - st.z); if (d < best) { best = d; target = s; } }
    const from = new THREE.Vector3(st.x + Math.sin(st.face) * 1.3 + Math.cos(st.face) * 0.5, 1.15, st.z + Math.cos(st.face) * 1.3 - Math.sin(st.face) * 0.5);
    let dir;
    if (target) { dir = new THREE.Vector3(target.x - from.x, target.y + 0.6 - from.y, target.z - from.z).normalize(); st.face = Math.atan2(target.x - st.x, target.z - st.z); }
    else dir = new THREE.Vector3(Math.sin(st.face), 0, Math.cos(st.face));
    dir.x += rand(-0.05, 0.05); dir.y += rand(-0.02, 0.04); dir.z += rand(-0.05, 0.05);
    const mesh = new THREE.Mesh(globGeo, globMat); mesh.position.copy(from); scene.add(mesh);
    globs.push({ mesh, v: dir.multiplyScalar(24), life: 0.95 });
    sfx.spit();
  }

  function update(dt) {
    st.clock += dt; st.t += dt;
    foam.forEach((f, i) => { f.position.z = SHORE_Z + 0.4 + i * 2.2 + Math.sin(st.clock * 0.9 + i * 1.7) * 0.9; });

    if (st.phase === 'boat') {
      st.boatZ = 36 - Math.min(1, st.t / 4.6) * (36 - (SHORE_Z + 3.4));
      boat.position.set(0, -0.1 + Math.sin(st.clock * 2.4) * 0.08, st.boatZ); boat.rotation.z = Math.sin(st.clock * 1.7) * 0.03;
      st.x = 0; st.z = st.boatZ + 0.6; st.y = 0.42 + boat.position.y; st.face = Math.PI; st.move = 0;
      if (st.t > 4.6) ramp.rotation.x = -Math.min(1, (st.t - 4.6) / 0.6) * 1.75;      // ramp drops
      if (st.t > 5.4) { st.phase = 'fight'; st.t = 0; st.y = 0; caption('Move: WASD / stick  ·  Hold Space (or 🐾) to fire the slobber gun'); sfx.bark(); }
    } else if (st.phase === 'fight' || st.phase === 'end') {
      let ix = 0, iz = 0;
      if (st.phase === 'fight') {
        if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
        ix += stick.x; iz += stick.y;
      }
      let len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; len = 1; }
      if (len > 0.05) {
        const sp = 6.5 * (fireHeld() ? 0.7 : 1);
        let nx = clamp(st.x + ix * sp * dt, -21, 21), nz = clamp(st.z + iz * sp * dt, -15.2, SHORE_Z + 1.5);
        for (const o of solids) { const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), r = o.r + 0.45; if (d < r && d > 0.001) { nx = o.x + (dx / d) * r; nz = o.z + (dz / d) * r; } }
        st.x = nx; st.z = nz;
        if (!fireHeld()) { let diff = Math.atan2(ix, iz) - st.face; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2; st.face += diff * Math.min(1, dt * 12); }
      }
      st.move += ((len > 0.05 ? len : 0) - st.move) * Math.min(1, dt * 10);
      if (st.phase === 'fight') fire(dt);

      for (const s of squirrels) {
        s.hit = Math.max(0, s.hit - dt);
        s.mesh.position.y = s.y + (s.done ? Math.abs(Math.sin(st.clock * 6 + s.x)) * 0.15 : 0) + s.hit * 0.4;
        s.mesh.rotation.y = Math.atan2(st.x - s.x, st.z - s.z);
        s.mesh.userData.tail.rotation.z = Math.sin(st.clock * 9 + s.x) * 0.3;
        if (s.done) { s.flag.rotation.z = Math.sin(st.clock * 7 + s.x) * 0.5; continue; }
        s.cool -= dt;
        const d = Math.hypot(st.x - s.x, st.z - s.z);
        if (s.cool <= 0 && d < 17 && st.phase === 'fight') {
          s.cool = rand(4, 7);
          const T = clamp(d / 9, 0.7, 2.6), y0 = s.y + 1.2;
          const mesh = new THREE.Mesh(acornGeo, acornMat); mesh.position.set(s.x, y0, s.z); mesh.castShadow = true; scene.add(mesh);
          acorns.push({ mesh, v: new THREE.Vector3((st.x - s.x) / T, (0.3 - y0) / T + 7 * T, (st.z - s.z) / T) });
        }
      }
      for (let i = globs.length - 1; i >= 0; i--) {
        const g = globs[i]; g.life -= dt; g.v.y -= 5 * dt;
        g.mesh.position.addScaledVector(g.v, dt);
        let gone = g.life <= 0 || g.mesh.position.y < 0;
        for (const s of squirrels) {
          if (s.done || gone) continue;
          if (Math.hypot(g.mesh.position.x - s.x, g.mesh.position.z - s.z) < 1.0 && Math.abs(g.mesh.position.y - (s.y + 0.7)) < 1.3) {
            gone = true; s.hp--; s.hit = 0.25; sfx.squeak();
            if (s.hp <= 0) {
              s.done = true; s.flag.visible = true; s.goo.visible = true; st.count++; sfx.pickup(); hud();
              if (st.count >= TOTAL) { st.phase = 'end'; st.t = 0; caption('The beach is secure. Ten squirrels, thoroughly slobbered.'); sfx.win(); }
            }
          }
        }
        if (gone) { scene.remove(g.mesh); globs.splice(i, 1); }
      }
      for (let i = acorns.length - 1; i >= 0; i--) {
        const a = acorns[i]; a.v.y -= 14 * dt; a.mesh.position.addScaledVector(a.v, dt); a.mesh.rotation.x += dt * 9;
        const p = a.mesh.position;
        let gone = p.y < 0.05;
        if (!gone && st.phase === 'fight' && Math.hypot(p.x - st.x, p.z - st.z) < 0.85 && p.y < 1.7) {
          gone = true; st.hp -= 2; st.hurt = 0.35; sfx.hit();
          if (st.hp <= 0) { st.hp = MAX_HP; st.x = clamp(st.x, -16, 16); st.z = SHORE_Z - 0.5; caption('Bonked by too many acorns. Dexter regroups at the waterline.'); }
          hud();
        }
        if (gone) { scene.remove(a.mesh); acorns.splice(i, 1); }
      }
      if (st.phase === 'end' && st.t > 4.2) { st.phase = 'off'; onEnd(); }
    }
    st.hurt = Math.max(0, st.hurt - dt);
    dexMesh.position.set(st.x, st.y, st.z);
    dexMesh.rotation.set(0, st.face, st.hurt > 0 ? Math.sin(st.clock * 50) * 0.15 : 0);
    animateDog(dexMesh, st.clock, st.move, 0.8);
    tails.forEach((t, i) => { t.rotation.x = Math.sin(st.clock * 9 + i) * 0.3 * (0.3 + st.move); });
  }

  // where the camera should be this frame
  function camera(want, look) {
    if (st.phase === 'boat') { want.set(6.5 - st.t * 0.5, 3.2, st.boatZ + 6.5); look.set(0, 1.2, st.boatZ - 1.5); }
    else if (st.phase === 'end') { want.set(st.x * 0.6, 14, st.z + 15); look.set(0, 1, -10); }
    else { want.set(st.x * 0.85, 9.5, st.z + 11); look.set(st.x, 1, st.z - 2.5); }
  }

  return { scene, start, update, camera, state: st, squirrels };
}
