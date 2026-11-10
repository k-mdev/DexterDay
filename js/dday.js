// Easter egg level: Dexter's D-Day daydream. He rides a landing boat onto a beach and
// hoses down ten entrenched squirrels with a slobber machine gun. Nobody is hurt: a
// thoroughly slobbered squirrel just waves a white flag. Self-contained scene + logic.
import * as THREE from 'three';
import { mat, box, softBox, makeDexter, makeDog, animateDog, makeSquirrel, makeTree } from './models.js';
import { sfx } from './sfx.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOTAL = 10, SHORE_Z = 12, MAX_HP = 20;

export function createDday({ keys, stick, fireHeld, onEnd }) {
  const $ = (id) => document.getElementById(id);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb7c4cc);
  scene.fog = new THREE.Fog(0xb7c4cc, 40, 105);
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
  for (const [x, z] of [[-14, 6], [-7.5, 8], [8.5, 4.5], [14, 8], [-10, 0], [0, -1.5], [9, 1], [17, -3], [-17, -5], [-3, -8], [6, -9]]) {
    const h = new THREE.Group();
    for (let i = 0; i < 3; i++) { const b = box(h, 0.22, 2.4, 0.22, 0x5a4632, 0, 0.75, 0); b.rotation.set(i === 0 ? 0.9 : i === 1 ? -0.9 : 0, i * 1.05, i === 2 ? 0.9 : 0); }
    h.position.set(x, 0, z); h.rotation.y = rand(0, 3); scene.add(h); solids.push({ x, z, r: 0.9 });
  }

  /* ---- squirrel positions ---- */
  const posts = [], bigGuns = [];
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
    g.position.set(x, 1.6, -24); scene.add(g); bigGuns.push({ g, x, kick: 0 });
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
  const buildBoat = () => {
    const g = new THREE.Group();
    box(g, 3.4, 0.3, 6.4, 0x5c6650, 0, 0.15, 0);
    for (const s of [-1, 1]) box(g, 0.2, 1.3, 6.4, 0x66705a, s * 1.6, 0.8, 0);
    box(g, 3.4, 1.3, 0.2, 0x66705a, 0, 0.8, 3.1);
    box(g, 1.2, 1.0, 1.0, 0x4a5340, 0.8, 1.0, 2.4);                                        // wheelhouse
    const r = new THREE.Group(); r.position.set(0, 0.3, -3.2); g.add(r);
    box(r, 3.2, 1.9, 0.18, 0x66705a, 0, 0.95, 0);
    scene.add(g);
    return { g, ramp: r };
  };
  const { g: boat, ramp } = buildBoat();
  // more landing craft coming in on both sides, dropping their ramps, then backing off for another load
  const fleet = [-27, -18, -9, 9, 18, 27].map((x, i) => ({ ...buildBoat(), x, z: 40 + i * 9 + rand(0, 6), state: 'in', t: 0 }));
  // the fleet offshore, hazy on the horizon
  for (const [x, z, len] of [[-38, 82, 30], [6, 92, 38], [44, 78, 26], [-70, 96, 34], [78, 94, 30]]) {
    const ship = new THREE.Group(), grey = 0x7f8a90;
    box(ship, 5, 2.4, len, grey, 0, 1.2, 0); box(ship, 3.6, 2.6, len * 0.3, 0x8a959b, 0, 3.6, 0); box(ship, 2.2, 2, len * 0.12, 0x8a959b, 0, 5.8, 0);
    const fn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 3, 8), mat(0x6f797f)); fn.position.set(0, 6.6, -len * 0.12); ship.add(fn);
    for (const s of [-1, 1]) { box(ship, 2, 1, 2.4, 0x6f797f, 0, 2.9, s * len * 0.32); const b = box(ship, 0.3, 0.3, 4, 0x6f797f, 0, 3.3, s * len * 0.32 - 2.4); b.rotation.x = 0.12; }
    ship.position.set(x, -0.3, z); ship.rotation.y = Math.PI / 2 + rand(-0.15, 0.15); scene.add(ship);
  }
  // barrage balloons tethered over the beachhead
  const balloons = [];
  for (const [x, y, z] of [[-24, 15, 20], [-8, 18, 30], [12, 16, 24], [28, 19, 34], [-36, 20, 40], [40, 15, 18]]) {
    const b = new THREE.Group(), silver = mat(0xc9d0d4, { roughness: 0.35, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), silver); body.scale.set(1.3, 1.2, 3); b.add(body);
    for (const [fx, fy, rz] of [[0, 0.9, 0], [-0.9, -0.5, 2.1], [0.9, -0.5, -2.1]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), silver); f.scale.set(0.35, 1.1, 1.3); f.position.set(fx, fy, 2.3); f.rotation.z = rz; b.add(f); }
    const cable = box(scene, 0.04, y, 0.04, 0x4a4a4a, x, y / 2, z); cable.castShadow = false;
    b.position.set(x, y, z); scene.add(b); balloons.push({ b, y });
  }

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

  /* ---- Squirrel Normandy: the little town on the bluff beyond the bunkers ---- */
  const TOWN_Y = 1.6;
  const cottage = (x, z, w, h, d, roofC, ry = 0) => {
    const g = new THREE.Group();
    box(g, w, h, d, 0xefe6cf, 0, h / 2, 0);
    for (const sx of [-1, 0, 1]) box(g, 0.12, h, 0.06, 0x4a3524, sx * (w / 2 - 0.06), h / 2, d / 2 + 0.01);            // timber framing
    box(g, w, 0.12, 0.06, 0x4a3524, 0, h * 0.55, d / 2 + 0.01); box(g, w, 0.12, 0.06, 0x4a3524, 0, h - 0.06, d / 2 + 0.01);
    for (const sx of [-1, 1]) { const b = box(g, 0.1, h * 0.62, 0.06, 0x4a3524, sx * w * 0.25, h * 0.27, d / 2 + 0.01); b.rotation.z = sx * 0.5; }
    box(g, 0.5, 0.85, 0.07, 0x7a3b2a, 0, 0.42, d / 2 + 0.02);                                                        // squirrel-sized door
    box(g, 0.4, 0.4, 0.07, 0xffd98a, w * 0.28, h * 0.75, d / 2 + 0.02); box(g, 0.4, 0.4, 0.07, 0xffd98a, -w * 0.28, h * 0.75, d / 2 + 0.02);
    const rg = new THREE.ConeGeometry(0.7071, h * 0.9, 4); rg.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(rg, mat(roofC)); roof.scale.set(w + 0.5, 1, d + 0.5); roof.position.y = h + h * 0.45; roof.castShadow = true; g.add(roof);
    box(g, 0.3, 0.9, 0.3, 0x8a5a4a, w * 0.25, h + h * 0.55, 0);
    g.position.set(x, TOWN_Y, z); g.rotation.y = ry; scene.add(g);
  };
  const roofs = [0x8b3f33, 0x5c6470, 0x9a4a3a, 0x6b5a4a];
  [[-26, -33, 0.2], [-19, -36, -0.1], [-12, -32, 0.15], [-5, -37, 0], [6, -33, -0.2], [13, -36, 0.1], [20, -32, -0.15], [27, -36, 0.2],
    [-22, -46, 0], [-13, -49, 0.2], [14, -48, -0.2], [23, -46, 0.1], [-30, -52, 0.1], [31, -52, -0.1]]
    .forEach(([x, z, ry], i) => cottage(x, z, 3 + (i % 3) * 0.6, 2.4 + (i % 2) * 0.7, 3 + (i % 2) * 0.5, roofs[i % 4], ry));
  // church with a tall steeple
  box(scene, 4.5, 4.2, 8, 0xd9d2c0, 0, TOWN_Y + 2.1, -46);
  { const r = new THREE.Shape(); r.moveTo(-2.6, 0); r.lineTo(2.6, 0); r.lineTo(0, 2.6); r.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(r, { depth: 8.4, bevelEnabled: false }), mat(0x5c6470)); m.position.set(0, TOWN_Y + 4.2, -50.2); m.castShadow = true; scene.add(m); }
  box(scene, 2.6, 8.5, 2.6, 0xd9d2c0, 0, TOWN_Y + 4.25, -41.4);
  { const sg = new THREE.ConeGeometry(0.7071, 6, 4); sg.rotateY(Math.PI / 4); const sp = new THREE.Mesh(sg, mat(0x5c6470)); sp.scale.set(3, 1, 3); sp.position.set(0, TOWN_Y + 11.5, -41.4); sp.castShadow = true; scene.add(sp); }
  box(scene, 0.9, 1.5, 0.1, 0xffd98a, 0, TOWN_Y + 6.2, -40.05); box(scene, 1.1, 2, 0.1, 0x4a3524, 0, TOWN_Y + 1, -40.05);
  // acorn monument in the square, a great oak, hedgerows and a windmill
  { const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 1, 10), mat(0x9a9d9f)); base.position.set(0, TOWN_Y + 0.5, -33); scene.add(base);
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), mat(0xc98a3c)); nut.scale.y = 1.25; nut.position.set(0, TOWN_Y + 2.1, -33); nut.castShadow = true; scene.add(nut);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6b4a2e)); cap.position.set(0, TOWN_Y + 2.5, -33); scene.add(cap);
    box(scene, 0.12, 0.4, 0.12, 0x6b4a2e, 0, TOWN_Y + 3.6, -33); }
  for (const [x, z, sc] of [[-8, -42, 2.6], [9, -41, 2.2], [-34, -40, 2], [35, -42, 2.3], [-3, -56, 2.8], [18, -56, 2.4], [-20, -57, 2.2]]) { const t = makeTree('round', sc); t.position.set(x, TOWN_Y, z); scene.add(t); }
  for (const [x, z, w, ry] of [[-16, -28, 12, 0], [16, -28, 12, 0], [-30, -42, 10, 1.57], [30, -42, 10, 1.57], [0, -53, 18, 0]]) { const h = box(scene, w, 0.9, 0.8, 0x4c8a45, x, TOWN_Y + 0.45, z); h.rotation.y = ry; }
  const townies = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, r = 3.2 + (i % 3) * 1.3;
    const m = makeSquirrel(); m.scale.setScalar(2.1);
    const flag = new THREE.Group(); box(flag, 0.03, 0.7, 0.03, 0x8a6a48, 0, 0.35, 0); box(flag, 0.3, 0.2, 0.02, [0x3f6f8f, 0xf2f0ea, 0xc7362b][i % 3], 0.16, 0.6, 0);
    flag.position.set(0.16, 0.2, 0.05); m.add(flag);
    m.position.set(Math.cos(a) * r, TOWN_Y, -33 + Math.sin(a) * r * 0.8 + 3.5); m.visible = false; scene.add(m);
    townies.push({ m, flag, ph: i * 0.9 });
  }
  const mill = new THREE.Group();
  { const tg = new THREE.CylinderGeometry(1, 1.6, 5, 8); const tw = new THREE.Mesh(tg, mat(0xe6dcc2)); tw.position.y = 2.5; tw.castShadow = true; mill.add(tw);
    const cg = new THREE.ConeGeometry(1.25, 1.4, 8); const c = new THREE.Mesh(cg, mat(0x8b3f33)); c.position.y = 5.7; mill.add(c); }
  const sails = new THREE.Group(); sails.position.set(0, 4.6, 1.2); mill.add(sails);
  for (let i = 0; i < 4; i++) { const sl = box(sails, 0.5, 3.4, 0.06, 0xf4f1e8, 0, 1.7, 0); const piv = new THREE.Group(); piv.rotation.z = i * Math.PI / 2; piv.add(sl); sails.add(piv); }
  mill.position.set(-36, TOWN_Y, -34); mill.rotation.y = 0.5; scene.add(mill);

  /* ---- the battle around you: allied dogs charging, tracer fire, acorn bombs ---- */
  const ALLY_LOOKS = [
    { color: 0xb07a3c, snoutColor: 0x2b2420, ear: 'pointy', tail: 'long' },                    // shepherd
    { color: 0xe3c98f, ear: 'floppy', tail: 'long' },                                          // yellow lab
    { color: 0x6b4a2e, chest: 0xf2f0ea, ear: 'floppy', tail: 'long' },                         // chocolate
    { color: 0xf2f0ea, snoutColor: 0x8a5a2b, earColor: 0x8a5a2b, ear: 'floppy', tail: 'nub' }, // spotted mutt
    { color: 0x3a3a40, chest: 0xc98a3c, ear: 'pointy', tail: 'nub', scale: 1.1 },              // rottie-ish
  ];
  const kit = (mesh) => {
    softBox(mesh.userData.inner, 0.6, 0.3, 0.6, 0x5a6b3a, 0, 0.74, 0.02, 0.2);                 // vest
    softBox(mesh.userData.head, 0.5, 0.18, 0.48, 0x4d5c32, 0, 0.3, 0.04, 0.48);                // helmet
  };
  // Sergeant Biscuit: a large dog biscuit in full army gear. Built with the same animated
  // parts as a dog (legs, head, tail, ears) so it can run and idle with the rest of the crew.
  const makeBiscuitSoldier = () => {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const dough = 0xf0dcae, baked = 0xdcc189;
    softBox(inner, 0.62, 1.25, 0.3, dough, 0, 1.0, 0, 0.3);                                   // the biscuit, standing on end
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) softBox(inner, 0.44, 0.44, 0.34, dough, sx * 0.27, 1.0 + sy * 0.62, 0, 0.48); // bone knobs
    for (let i = 0; i < 5; i++) softBox(inner, 0.05, 0.05, 0.03, baked, -0.16 + (i % 3) * 0.16, 0.62 + Math.floor(i / 3) * 0.14, 0.16); // docking holes
    softBox(inner, 0.7, 0.42, 0.38, 0x5a6b3a, 0, 0.92, 0, 0.2);                               // vest
    softBox(inner, 0.72, 0.07, 0.4, 0x2a2a2a, 0, 0.78, 0); softBox(inner, 0.16, 0.16, 0.08, 0x8a7f55, -0.18, 0.95, 0.2); softBox(inner, 0.16, 0.16, 0.08, 0x4d5c32, 0.18, 0.95, 0.2);
    const head = new THREE.Group(); head.position.set(0, 1.42, 0); inner.add(head);
    for (const sx of [-1, 1]) { softBox(head, 0.14, 0.16, 0.05, 0xffffff, sx * 0.14, 0, 0.17); softBox(head, 0.07, 0.08, 0.05, 0x0a0a0a, sx * 0.14, -0.01, 0.19); softBox(head, 0.16, 0.035, 0.05, 0x7a5a30, sx * 0.14, 0.12, 0.18).rotation.z = -sx * 0.25; }
    softBox(head, 0.16, 0.04, 0.04, 0x7a5a30, 0, -0.16, 0.17);                                // a brave little mouth
    softBox(head, 0.86, 0.26, 0.5, 0x4d5c32, 0, 0.34, 0, 0.48); softBox(head, 0.94, 0.06, 0.58, 0x3d4a2a, 0, 0.24, 0); // helmet over the top knobs
    const legs = [];
    for (const [x, y, len] of [[-0.2, 1.05, 0.34], [0.2, 1.05, 0.34], [-0.17, 0.42, 0.42], [0.17, 0.42, 0.42]]) { // two arms, two legs
      const piv = new THREE.Group(); piv.position.set(x * (y > 1 ? 1.9 : 1), y, 0); inner.add(piv);
      softBox(piv, 0.11, len, 0.11, dough, 0, -len / 2, 0); softBox(piv, 0.15, 0.09, 0.2, y > 1 ? dough : 0x2a2a2a, 0, -len, 0.03); // mitts / boots
      legs.push(piv);
    }
    const tail = new THREE.Group(); inner.add(tail);
    g.userData = { inner, head, legs, tail, ears: [new THREE.Group(), new THREE.Group()], tongue: null, phase: 0, treat: true };
    return g;
  };
  const allies = [];
  // Dexter's boat crew: Sergeant Biscuit (a large treat in army gear, about to have a bad morning),
  // two black labs and a yellow lab.
  const BLACK_LAB = { color: 0x26262d, chest: 0xf2f0ea, ear: 'floppy', tail: 'long', collar: 0x3f6f8f };
  const crew = [[BLACK_LAB, -0.95, 1.5], [{ ...BLACK_LAB, chest: null, collar: 0x38a860 }, 0.95, 1.9], [ALLY_LOOKS[1], -0.75, -0.8], [{ ...BLACK_LAB, chest: null, collar: 0xf2c230 }, 0.9, -1.2]]
    .map(([look, ox, oz], i) => {
      const mesh = i === 0 ? makeBiscuitSoldier() : makeDog({ ...look, tongue: true });
      if (i) kit(mesh);
      mesh.scale.multiplyScalar(1.35); scene.add(mesh);
      return { mesh, base: mesh.scale.x, ox, oz, x: 0, z: 0, sp: 7.6 + i * 0.5, out: 0, gone: false };
    });
  const buddy = crew[0], FALL = { x: -2, z: 3.5 };
  buddy.mesh.rotation.order = 'YXZ'; // so he can topple straight onto his back whichever way he faces
  const LIE_YAW = -Math.PI * 0.75;    // lands face-up, side-on to the cutscene camera
  const stars = new THREE.Group();
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; softBox(stars, 0.16, 0.16, 0.05, mat(0xffe36a, { emissive: 0xffc400, emissiveIntensity: 1 }), Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5).rotation.z = 0.78; }
  stars.visible = false; scene.add(stars);
  const bonk = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(0xc98a3c)); bonk.visible = false; scene.add(bonk);
  for (let i = 0; i < 8; i++) {
    const mesh = makeDog({ ...ALLY_LOOKS[i % ALLY_LOOKS.length], tongue: true });
    kit(mesh);
    mesh.scale.multiplyScalar(1.3); mesh.visible = false; scene.add(mesh);
    allies.push({ mesh, base: mesh.scale.x, active: false, x: 0, z: 0, sp: 8, wob: rand(0, 6), out: 0 });
  }
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.85 });
  const tracers = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.8), tracerMat); m.visible = false; scene.add(m); tracers.push({ mesh: m, v: new THREE.Vector3(), life: 0 }); }
  const bombGeo = new THREE.SphereGeometry(0.34, 8, 6), capGeo = new THREE.SphereGeometry(0.36, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const bombs = [], puffs = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(); const nut = new THREE.Mesh(bombGeo, mat(0xc98a3c)); nut.scale.y = 1.3; g.add(nut);
    const cap = new THREE.Mesh(capGeo, mat(0x6b4a2e)); cap.position.y = 0.16; g.add(cap);
    g.visible = false; scene.add(g); bombs.push({ mesh: g, v: new THREE.Vector3(), active: false });
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(0xe6d6a8, { transparent: true, opacity: 0 })); p.visible = false; scene.add(p); puffs.push({ mesh: p, t: 0 });
  }
  const smokes = [];
  for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat(0x6f6f6f, { transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); smokes.push({ mesh: m, t: 0, life: 1, vx: 0, vy: 1, size: 1 }); }
  const smoke = (x, y, z, size = 1, life = 3.2, dark = 0.45) => {
    const o = smokes.find((q) => q.t <= 0) || smokes[0];
    o.t = o.life = life; o.size = size; o.vx = rand(0.4, 1.1); o.vy = rand(0.7, 1.3);
    o.mesh.position.set(x, y, z); o.mesh.material.color.setScalar(dark + rand(-0.08, 0.08)); o.mesh.visible = true;
  };
  const divots = []; let divotI = 0;
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.CircleGeometry(1.25, 12), mat(0xe6d6a8)); rim.rotation.x = -Math.PI / 2; g.add(rim);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), mat(0xa18a58)); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.006; g.add(hole);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10), mat(0x7d6a42)); core.rotation.x = -Math.PI / 2; core.position.y = 0.012; g.add(core);
    for (let k = 0; k < 5; k++) { const a = k * 1.3 + i; const c = softBox(g, 0.18, 0.1, 0.16, 0xb7a377, Math.cos(a) * 1.3, 0.05, Math.sin(a) * 1.3); c.castShadow = false; } // scattered clods
    g.visible = false; scene.add(g); divots.push(g);
  }
  const divot = (x, z, size = 1) => { const g = divots[divotI++ % divots.length]; g.position.set(x, 0.02, z); g.scale.setScalar(size); g.rotation.y = rand(0, 6); g.visible = true; };
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0 })); scene.add(flash);
  let flashT = 0;
  const burst = (i, x, z, vol) => { // sand puff + smoke + crater + a small, quiet boom
    const p = puffs[i]; p.t = 0.6; p.mesh.visible = true; p.mesh.position.set(x, 0.2, z);
    smoke(x, 0.5, z, 0.9, 3.4); smoke(x + rand(-0.4, 0.4), 0.9, z + rand(-0.4, 0.4), 0.6, 2.6, 0.6);
    divot(x, z, rand(0.75, 1.15));
    sfx.boom(vol * clamp(1 - Math.hypot(x - st.x, z - st.z) / 32, 0.3, 1));
  };
  let allyT = 1, gunT = 0.5, bombT = 2, popT = 5, driftT = 0;
  function ambience(dt, fighting) {
    sails.rotation.z += dt * 0.7;
    // allied dogs sprint up the beach and vanish into the smoke at the bunker line
    allyT -= dt;
    if (allyT <= 0 && st.phase !== 'off') {
      allyT = rand(0.7, 1.9);
      const a = allies.find((o) => !o.active);
      const landed = fleet.filter((f) => f.state === 'landed');
      if (a) {
        const from = landed.length ? landed[Math.floor(Math.random() * landed.length)] : null; // they pour out of whichever boat has its ramp down
        a.active = true; a.out = 0; a.inland = false; a.y = 0;
        a.x = from ? from.x + rand(-1, 1) : rand(-22, 22); a.z = SHORE_Z + rand(0.5, 2.5);
        a.gap = [-18.5, -12, -6, 0, 6, 12, 18.5].reduce((m, g) => (Math.abs(g - a.x) < Math.abs(m - a.x) ? g : m), 99);
        a.tx = rand(-24, 24); a.tz = rand(-44, -29);
        a.sp = rand(6.5, 9.5); a.mesh.visible = true; a.mesh.scale.setScalar(a.base);
      }
    }
    const won = st.phase === 'end';
    for (const a of allies) {
      if (!a.active) continue;
      if (won) {
        // the beach is taken: through the gaps between the bunkers, up the bluff and into town
        if (a.inland) { a.mesh.position.set(a.x, TOWN_Y, a.z); animateDog(a.mesh, st.clock, 0, 1); continue; }
        const goalX = a.z > -22 ? a.gap : a.tx, dx = goalX - a.x;
        const vx = clamp(dx * 1.5, -5, 5);
        a.x += vx * dt; a.z -= a.sp * 0.8 * dt;
        a.y = clamp((-19 - a.z) / 3, 0, 1) * TOWN_Y;
        a.mesh.position.set(a.x, a.y, a.z); a.mesh.rotation.y = Math.atan2(vx, -a.sp * 0.8); a.mesh.scale.setScalar(a.base);
        animateDog(a.mesh, st.clock, 1.2, 1);
        if (a.z < a.tz) { a.inland = true; a.mesh.rotation.y = rand(-0.6, 0.6); }
        continue;
      }
      const vx = Math.sin(st.clock * 1.3 + a.wob) * 1.6;
      a.z -= a.sp * dt; a.x += vx * dt;
      a.mesh.position.set(a.x, 0, a.z); a.mesh.rotation.y = Math.atan2(vx, -a.sp);
      animateDog(a.mesh, st.clock, 1.2, 1);
      if (a.z < -13.5) { a.out += dt / 0.35; a.mesh.scale.setScalar(a.base * Math.max(0.01, 1 - a.out)); if (a.out >= 1) { a.active = false; a.mesh.visible = false; } } // gone into the smoke
    }
    // the landing craft in the background
    for (const f of fleet) {
      f.t += dt;
      if (f.state === 'in') { f.z -= 5 * dt; if (f.z <= SHORE_Z + 3.6) { f.z = SHORE_Z + 3.6; f.state = 'landed'; f.t = 0; } }
      else if (f.state === 'landed') { f.ramp.rotation.x = -Math.min(1, f.t / 0.6) * 1.75; if (f.t > 5) { f.state = 'out'; f.t = 0; } }
      else { f.ramp.rotation.x = -Math.max(0, 1 - f.t / 0.6) * 1.75; f.z += 4 * dt; if (f.z > 58 + Math.abs(f.x)) { f.state = 'in'; f.t = 0; } }
      f.g.position.set(f.x, -0.1 + Math.sin(st.clock * 2.2 + f.x) * 0.08, f.z); f.g.rotation.z = Math.sin(st.clock * 1.6 + f.x) * 0.03;
    }
    balloons.forEach((o, i) => { o.b.position.y = o.y + Math.sin(st.clock * 0.6 + i) * 0.4; o.b.rotation.y = Math.sin(st.clock * 0.25 + i) * 0.3; });
    // the townsfolk come out once the dogs reach the square
    for (const tw of townies) {
      tw.m.visible = won && st.t > 8.5;
      if (tw.m.visible) { tw.m.position.y = TOWN_Y + Math.abs(Math.sin(st.clock * 5 + tw.ph)) * 0.45; tw.flag.rotation.z = Math.sin(st.clock * 8 + tw.ph) * 0.6; tw.m.rotation.y = Math.sin(st.clock * 0.8 + tw.ph) * 0.8; }
    }
    // distant gunfire: a quiet rattle plus a tracer streaking overhead
    gunT -= dt;
    if (gunT <= 0) {
      gunT = rand(0.5, 1.7);
      if (fighting) sfx.gunfire();
      const t = tracers.find((o) => o.life <= 0);
      if (t) {
        const fromBluff = Math.random() < 0.6;
        t.mesh.position.set(rand(-24, 24), rand(2.5, 7), fromBluff ? -19 : SHORE_Z + 6);
        t.v.set(rand(-6, 6), rand(-0.5, 1.5), fromBluff ? 55 : -55);
        t.mesh.lookAt(t.mesh.position.clone().add(t.v)); t.life = 0.75; t.mesh.visible = true;
      }
    }
    for (const t of tracers) { if (t.life <= 0) continue; t.life -= dt; t.mesh.position.addScaledVector(t.v, dt); if (t.life <= 0) t.mesh.visible = false; }
    // the squirrels' big guns: muzzle flash, recoil, smoke, and an acorn shell lobbed onto the beach.
    // Shells always land a few steps away from Dexter.
    bombT -= dt;
    if (bombT <= 0 && fighting) {
      bombT = rand(2.2, 4.2);
      const b = bombs.find((o) => !o.active), gun = bigGuns[Math.floor(Math.random() * bigGuns.length)];
      if (b) {
        let x, z, tries = 0;
        do { x = gun.x + rand(-14, 14); z = rand(-11, SHORE_Z - 1); } while (Math.hypot(x - st.x, z - st.z) < 4.5 && tries++ < 10);
        const mx = gun.x, my = 4.6, mz = -19.3, T = 1.7, G = 18;
        b.active = true; b.mesh.visible = true; b.mesh.position.set(mx, my, mz);
        b.v.set((x - mx) / T, (0.2 - my) / T + 0.5 * G * T, (z - mz) / T); b.g = G;
        gun.kick = 1; flash.position.set(mx, my, mz + 0.3); flashT = 0.14;
        smoke(mx, my, mz + 0.4, 0.8, 2.4, 0.75); smoke(mx + 0.3, my + 0.2, mz + 0.9, 0.5, 1.8, 0.8);
        sfx.boom(0.3); sfx.whistle();
      }
    }
    for (const gun of bigGuns) { gun.kick = Math.max(0, gun.kick - dt * 3); gun.g.position.z = -24 - gun.kick * 0.45; } // recoil
    flashT = Math.max(0, flashT - dt); flash.material.opacity = flashT > 0 ? 0.95 : 0; flash.scale.setScalar(0.6 + (0.14 - flashT) * 9);
    for (let i = 0; i < bombs.length; i++) {
      const b = bombs[i];
      if (b.active) {
        b.v.y -= b.g * dt;
        b.mesh.position.addScaledVector(b.v, dt); b.mesh.rotation.x += dt * 5; b.mesh.rotation.z += dt * 3;
        if (b.mesh.position.y <= 0.2 && b.v.y < 0) { b.active = false; b.mesh.visible = false; burst(i, b.mesh.position.x, b.mesh.position.z, 0.55); }
      }
      const p = puffs[i];
      if (p.t > 0) { p.t -= dt; const k = 1 - p.t / 0.6; p.mesh.scale.setScalar(0.4 + k * 2.6); p.mesh.material.opacity = 0.7 * (1 - k); if (p.t <= 0) p.mesh.visible = false; }
    }
    // every now and then a small, quiet pop somewhere further off
    popT -= dt;
    if (popT <= 0 && fighting) {
      popT = rand(4, 8);
      let x, z, tries = 0;
      do { x = rand(-23, 23); z = rand(-12, SHORE_Z - 1); } while (Math.hypot(x - st.x, z - st.z) < 7 && tries++ < 10);
      burst(Math.floor(Math.random() * puffs.length), x, z, 0.3);
    }
    // smoke hanging over the battlefield: drifting up from the bluff and from old craters
    driftT -= dt;
    if (driftT <= 0) {
      driftT = 0.45;
      if (Math.random() < 0.6) smoke(rand(-26, 26), 1.8, rand(-21, -17), rand(0.9, 1.5), 4.5, 0.55);
      const d = divots[Math.floor(Math.random() * divots.length)];
      if (d.visible && Math.random() < 0.5) smoke(d.position.x, 0.3, d.position.z, 0.45, 2.6, 0.5);
    }
    for (const o of smokes) {
      if (o.t <= 0) continue;
      o.t -= dt; const k = 1 - o.t / o.life;
      o.mesh.position.x += o.vx * dt; o.mesh.position.y += o.vy * dt;
      o.mesh.scale.setScalar(o.size * (0.5 + k * 1.9)); o.mesh.material.opacity = 0.55 * Math.sin(Math.min(1, k * 1.15) * Math.PI);
      if (o.t <= 0) o.mesh.visible = false;
    }
  }

  const globGeo = new THREE.SphereGeometry(0.16, 8, 6), globMat = mat(0xbfeaff, { roughness: 0.1, emissive: 0x3a8fb8, emissiveIntensity: 0.4 });
  const acornGeo = new THREE.SphereGeometry(0.2, 8, 6), acornMat = mat(0x8a5a2b);
  let globs = [], acorns = [];
  const st = { phase: 'off', t: 0, x: 0, y: 0, z: 0, face: Math.PI, move: 0, hp: MAX_HP, count: 0, fireT: 0, hurt: 0, boatZ: 36, clock: 0 };

  // The ending follows what really happened after the landings, with our cast.
  const CARD_T = 5.2;
  const EPILOGUE = [
    'The beach is secure. Ten squirrels, thoroughly slobbered.',
    'By nightfall the dogs held the shoreline. Boats kept landing all along the coast, and barrage balloons went up over the beach.',
    'They pushed inland off the sand. The first town was freed the very next morning, and its squirrels came out to cheer.',
    'It was only the beginning. The fight for Normandy went on all summer, and the capital was not freed until late August.',
    'On June 6, 1944, about 156,000 Allied troops landed on five beaches in Normandy. Thousands never came home. Remembered with respect.',
  ];
  const caption = (text) => { $('dday-cap').textContent = text; };
  const hud = () => {
    const bars = Math.max(0, Math.round((st.hp / MAX_HP) * 8));
    $('dday-hud').textContent = `🪖 D-DAY  ·  Squirrels slobbered ${st.count}/${TOTAL}  ·  ${'█'.repeat(bars)}${'░'.repeat(8 - bars)}`;
  };

  function start() {
    for (const g of globs) scene.remove(g.mesh); for (const a of acorns) scene.remove(a.mesh);
    globs = []; acorns = [];
    for (const a of allies) { a.active = false; a.mesh.visible = false; }
    fleet.forEach((f, i) => { f.state = 'in'; f.z = 40 + i * 9 + rand(0, 6); f.t = 0; f.ramp.rotation.x = 0; });
    for (const c of crew) { c.gone = false; c.out = 0; c.mesh.visible = true; c.mesh.scale.setScalar(c.base); c.mesh.rotation.set(0, Math.PI, 0); }
    buddy.down = 0; stars.visible = false; bonk.visible = false;
    for (const b of bombs) { b.active = false; b.mesh.visible = false; }
    for (const d of divots) d.visible = false; for (const o of smokes) { o.t = 0; o.mesh.visible = false; }
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
    ambience(dt, st.phase === 'fight' || st.phase === 'boat');

    if (st.phase === 'boat') {
      st.boatZ = 36 - Math.min(1, st.t / 4.6) * (36 - (SHORE_Z + 3.4));
      boat.position.set(0, -0.1 + Math.sin(st.clock * 2.4) * 0.08, st.boatZ); boat.rotation.z = Math.sin(st.clock * 1.7) * 0.03;
      st.x = 0; st.z = st.boatZ + 0.6; st.y = 0.42 + boat.position.y; st.face = Math.PI; st.move = 0;
      if (st.t > 4.6) ramp.rotation.x = -Math.min(1, (st.t - 4.6) / 0.6) * 1.75;      // ramp drops
      for (const c of crew) { c.x = c.ox; c.z = st.boatZ + c.oz; c.mesh.position.set(c.x, st.y, c.z); animateDog(c.mesh, st.clock, 0, 0.9); }
      if (st.t > 5.4) { st.phase = 'charge'; st.t = 0; st.y = 0; caption('Go go go!'); sfx.bark(); }
    } else if (st.phase === 'charge') {
      // Cutscene: everyone piles off the boat. Sergeant Biscuit, the giant treat, takes an acorn to
      // the helmet and topples over. Dexter sees it. A treat. Now it is personal.
      const t = st.t;
      const dz = SHORE_Z - 3 - st.z;
      if (Math.abs(dz) > 0.2) { st.z += Math.sign(dz) * 6 * dt; st.move = 1; st.face = Math.PI; } else st.move = 0;
      for (const c of crew) {
        if (c.gone) continue;
        if (c === buddy) {
          const dx = FALL.x - c.x, dzz = FALL.z - c.z, d = Math.hypot(dx, dzz);
          if (d > 0.3 && !buddy.down) { c.x += (dx / d) * 8 * dt; c.z += (dzz / d) * 8 * dt; c.mesh.rotation.set(0, Math.atan2(dx, dzz), 0); animateDog(c.mesh, st.clock, 1.2, 1); }
          continue;
        }
        c.z -= c.sp * dt; c.x += Math.sin(st.clock * 1.5 + c.ox * 3) * dt;
        c.mesh.rotation.y = Math.PI; animateDog(c.mesh, st.clock, 1.2, 1);
        if (c.z < -13.5) { c.out += dt / 0.35; c.mesh.scale.setScalar(c.base * Math.max(0.01, 1 - c.out)); if (c.out >= 1) { c.gone = true; c.mesh.visible = false; } }
      }
      for (const c of crew) if (!c.gone) c.mesh.position.set(c.x, c === buddy && buddy.down ? 0.24 * buddy.down : 0, c.z);
      if (t > 1.0 && t < 1.6) {                                   // the acorn comes in
        const k = (t - 1.0) / 0.6; bonk.visible = true;
        bonk.position.set(FALL.x + (1 - k) * 3, 0.9 + (1 - k) * 9, FALL.z - (1 - k) * 12);
      }
      if (t >= 1.6 && !buddy.down) {
        buddy.down = 0.001; bonk.visible = false; stars.visible = true;
        sfx.hit(); sfx.whine(); caption('Sergeant Biscuit takes an acorn straight to the helmet. A perfectly good treat.');
      }
      if (buddy.down) {
        buddy.down = Math.min(1, buddy.down + dt * 3.5);
        buddy.mesh.rotation.set(-buddy.down * 1.5, LIE_YAW, 0);   // topples flat onto his back
        animateDog(buddy.mesh, st.clock, 0, 0.1);
        stars.position.set(buddy.x + 1.35, 1.0, buddy.z + 1.35); stars.rotation.y += dt * 4;
      }
      if (t > 3.0 && t - dt <= 3.0) { caption('Dexter saw the whole thing.'); }
      if (t > 4.6 && t - dt <= 4.6) { caption('This is personal now.'); sfx.power(); }
      if (t > 6.4) { st.phase = 'fight'; st.t = 0; caption('Move: WASD / stick  ·  Hold Space (or 🐾) to fire the slobber gun'); sfx.barkBig(); }
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
              if (st.count >= TOTAL) { st.phase = 'end'; st.t = 0; st.card = -1; sfx.win(); }
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
      if (buddy.down) {
        if (st.phase === 'end') { buddy.down = Math.max(0.001, buddy.down - dt * 1.5); stars.visible = false; buddy.mesh.rotation.set(-buddy.down * 1.5, LIE_YAW, 0); buddy.mesh.position.y = 0; animateDog(buddy.mesh, st.clock, 0, 1); }
        else { animateDog(buddy.mesh, st.clock, 0, 0.15); stars.position.set(buddy.x + 1.35, 1.0, buddy.z + 1.35); stars.rotation.y += dt * 4; }
      }
      if (st.phase === 'end') {
        const card = Math.min(EPILOGUE.length, Math.floor(st.t / CARD_T));
        if (card !== st.card && card < EPILOGUE.length) { st.card = card; caption(EPILOGUE[card]); }
        const skip = fireHeld();                                  // Space / fire skips to the next card
        if (skip && !st.skipHeld && st.t > 1) st.t = (card + 1) * CARD_T;
        st.skipHeld = skip;
        if (st.t >= EPILOGUE.length * CARD_T) { st.phase = 'off'; onEnd(); }
      }
    }
    st.hurt = Math.max(0, st.hurt - dt);
    dexMesh.position.set(st.x, st.y, st.z);
    dexMesh.rotation.set(0, st.face, st.hurt > 0 ? Math.sin(st.clock * 50) * 0.15 : 0);
    animateDog(dexMesh, st.clock, st.move, 0.8);
    if (st.phase === 'charge' && st.t > 2.6) {
      const t = st.t;
      du.head.rotation.y = t < 4.3 ? -0.85 * Math.min(1, (t - 2.6) * 3) : -0.85 * Math.max(0, 1 - (t - 4.3) * 4); // looks at his friend, then back at the bunkers
      du.head.rotation.x = t > 4.3 ? 0.22 : 0.05;                                                                  // lowers his head: the stare
      du.head.rotation.z = 0;
      if (du.tongue) du.tongue.visible = false;
    } else if (du.tongue) du.tongue.visible = true;
    tails.forEach((t, i) => { t.rotation.x = Math.sin(st.clock * 9 + i) * 0.3 * (0.3 + st.move); });
  }

  // where the camera should be this frame
  function camera(want, look) {
    if (st.phase === 'boat') { want.set(6.5 - st.t * 0.5, 3.2, st.boatZ + 6.5); look.set(0, 1.2, st.boatZ - 1.5); }
    else if (st.phase === 'charge') {
      const t = st.t;
      if (t < 1.0) { want.set(-5, 1.4, SHORE_Z - 8); look.set(0, 1, SHORE_Z); return t < 0.1; }                                  // low, facing the dogs pouring off the ramp
      if (t < 3.0) { want.set(FALL.x + 4.6, 1.7 + Math.max(0, t - 1.6) * 2.1, FALL.z - 4.0); look.set(FALL.x + 0.95, 0.5, FALL.z + 0.95); return t < 1.1; } // rises over the fallen sergeant       // on Sergeant Biscuit
      if (t < 4.6) { want.set(st.x + 4.6, 2.0, st.z - 5.2); look.set(st.x - 0.6, 1.3, st.z - 0.6); return t < 3.1; }             // Dexter looks over
      want.set(st.x + 0.7, 1.75, st.z - 5.6 + (t - 4.6) * 0.7); look.set(st.x, 1.6, st.z); return t < 4.7; // slow push-in on the scarred stare
    }
    else if (st.phase === 'end') {
      const c = Math.min(EPILOGUE.length - 1, Math.floor(st.t / CARD_T)), k = st.t - c * CARD_T, cutNow = k < 0.08 && c > 0;
      if (c === 0) { want.set(st.x * 0.5, 9 + k * 0.6, st.z + 12); look.set(st.x * 0.5, 1.5, -16); }                 // the white flags
      else if (c === 1) { want.set(-30 + k * 1.2, 10, SHORE_Z + 4); look.set(4, 4, SHORE_Z + 14); }                  // boats and balloons along the shore
      else if (c === 2) { want.set(13 - k * 0.8, TOWN_Y + 6, -21); look.set(0, TOWN_Y + 1.5, -33); }                 // the town square
      else if (c === 3) { want.set(0, 20 + k * 1.5, -8); look.set(0, 3, -44); }                                      // inland, over the rooftops
      else { want.set(0, 34 + k, SHORE_Z + 34 + k * 1.5); look.set(0, 0, -18); }                                     // the whole beach, pulling away
      return cutNow;
    }
    else { want.set(st.x * 0.85, 9, st.z + 11.5); look.set(st.x, 1.2, st.z - 5); }
  }

  return { scene, start, update, camera, state: st, squirrels };
}
