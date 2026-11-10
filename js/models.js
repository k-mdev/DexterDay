import * as THREE from 'three';

const matCache = new Map();
export function mat(color, extra) {
  if (extra) return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 }));
  return matCache.get(color);
}

export function box(parent, w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

function shape(parent, geo, color, x, y, z) {
  const m = new THREE.Mesh(geo, typeof color === 'number' ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* ---------- Dogs ---------- */
// Model faces +Z. Returns a Group; animated parts live in userData.
export function makeDog(o = {}) {
  const c = {
    color: 0x1c1c20, scale: 1, bodyLen: 1.1, bodyW: 0.5, bodyH: 0.48, legLen: 0.45,
    ear: 'floppy', earColor: null, snout: 0.3, snoutColor: null, chin: null, chest: null,
    tail: 'long', tailTip: null, collar: null, tag: false, eye: 0x6b3a12, tongue: true,
    fluffy: false, mask: false, headSize: 1, ...o,
  };
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const bodyY = c.legLen + c.bodyH / 2;
  const body = box(inner, c.bodyW, c.bodyH, c.bodyLen, c.color, 0, bodyY, 0);
  // slightly broader chest
  box(inner, c.bodyW + 0.06, c.bodyH + 0.04, c.bodyLen * 0.4, c.color, 0, bodyY + 0.01, c.bodyLen * 0.28);
  if (c.chest !== null) {
    box(inner, c.bodyW * 0.36, c.bodyH * 0.75, 0.05, c.chest, 0, bodyY - 0.04, c.bodyLen * 0.48 + 0.01);
    box(inner, c.bodyW * 0.2, 0.05, c.bodyLen * 0.3, c.chest, 0, bodyY - c.bodyH / 2 - 0.02, c.bodyLen * 0.3);
  }
  if (c.collar !== null) {
    box(inner, c.bodyW * 0.8, 0.09, 0.3, c.collar, 0, bodyY + c.bodyH * 0.42, c.bodyLen / 2 + 0.02).rotation.x = -0.6;
    if (c.tag) box(inner, 0.09, 0.1, 0.03, mat(0xf2c230, { metalness: 0.6, roughness: 0.3 }), 0, bodyY + 0.05, c.bodyLen / 2 + 0.13);
  }

  // head
  const head = new THREE.Group();
  head.position.set(0, bodyY + c.bodyH * 0.5 + 0.12, c.bodyLen / 2 + 0.08);
  head.scale.setScalar(c.headSize);
  inner.add(head);
  box(head, 0.44, 0.4, 0.42, c.color, 0, 0.08, 0.05);
  const sc = c.snoutColor ?? c.color;
  box(head, 0.26, 0.2, c.snout, sc, 0, -0.02, 0.26 + c.snout / 2);
  if (c.chin !== null) box(head, 0.2, 0.06, c.snout * 0.7, c.chin, 0, -0.13, 0.28 + c.snout / 2);
  box(head, 0.11, 0.08, 0.06, 0x0a0a0a, 0, 0.06, 0.27 + c.snout);
  const eyeM = mat(c.eye, { roughness: 0.2 });
  for (const s of [-1, 1]) {
    box(head, 0.1, 0.1, 0.04, 0xf4f1e8, s * 0.12, 0.15, 0.265);
    box(head, 0.065, 0.075, 0.04, eyeM, s * 0.12, 0.145, 0.275);
    box(head, 0.03, 0.035, 0.04, 0x0a0a0a, s * 0.12, 0.14, 0.283);
    // brow, gives him the worried lab look
    box(head, 0.13, 0.04, 0.05, c.color, s * 0.12, 0.215, 0.27).rotation.z = s * 0.25;
  }
  if (c.mask) box(head, 0.46, 0.13, 0.05, 0x1a1a1a, 0, 0.15, 0.25);
  const ec = c.earColor ?? c.color;
  const ears = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    if (c.ear === 'floppy') {
      piv.position.set(s * 0.23, 0.26, 0.0);
      box(piv, 0.07, 0.34, 0.24, ec, 0, -0.15, 0);
      piv.rotation.z = s * 0.18;
    } else {
      piv.position.set(s * 0.15, 0.27, 0.0);
      const e = shape(piv, new THREE.ConeGeometry(c.ear === 'big' ? 0.14 : 0.1, c.ear === 'big' ? 0.36 : 0.24, 4), ec, 0, 0.1, 0);
      e.rotation.y = Math.PI / 4;
      piv.rotation.z = -s * (c.ear === 'big' ? 0.45 : 0.15);
    }
    head.add(piv); ears.push(piv);
  }
  let tongue = null;
  if (c.tongue) {
    tongue = box(head, 0.1, 0.03, 0.16, 0xf08a9c, 0, -0.13, 0.3 + c.snout * 0.75);
    tongue.rotation.x = 0.5;
  }
  if (c.fluffy) {
    shape(head, new THREE.IcosahedronGeometry(0.24, 0), c.color, 0, 0.38, 0.02);
    for (const p of ears) shape(p, new THREE.IcosahedronGeometry(0.15, 0), c.color, 0, -0.3, 0);
  }

  // legs
  const legs = [];
  const lx = c.bodyW / 2 - 0.09, lz = c.bodyLen / 2 - 0.13;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const piv = new THREE.Group();
    piv.position.set(sx * lx, c.legLen, sz * lz);
    box(piv, 0.15, c.legLen, 0.15, c.color, 0, -c.legLen / 2, 0);
    box(piv, 0.17, 0.08, 0.2, c.color, 0, -c.legLen + 0.04, 0.03);
    if (c.fluffy) shape(piv, new THREE.IcosahedronGeometry(0.13, 0), c.color, 0, -c.legLen + 0.14, 0);
    inner.add(piv); legs.push(piv);
  }

  // tail
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + c.bodyH * 0.3, -c.bodyLen / 2);
  inner.add(tail);
  if (c.tail === 'long') {
    box(tail, 0.1, 0.1, 0.55, c.color, 0, 0, -0.26);
    if (c.tailTip !== null) box(tail, 0.11, 0.11, 0.14, c.tailTip, 0, 0, -0.5);
    tail.rotation.x = 0.5;
  } else if (c.tail === 'curl') {
    box(tail, 0.12, 0.3, 0.12, c.color, 0, 0.14, -0.04);
    box(tail, 0.12, 0.12, 0.2, c.tailTip ?? c.color, 0, 0.3, 0.06);
  } else if (c.tail === 'ring') {
    for (let i = 0; i < 5; i++) box(tail, 0.17, 0.17, 0.13, i % 2 ? 0x2a2a2a : c.color, 0, 0, -0.08 - i * 0.13);
    tail.rotation.x = 0.4;
  } else if (c.tail === 'pom') {
    box(tail, 0.07, 0.07, 0.3, c.color, 0, 0, -0.14);
    shape(tail, new THREE.IcosahedronGeometry(0.14, 0), c.color, 0, 0, -0.34);
    tail.rotation.x = 0.9;
  } else {
    box(tail, 0.12, 0.12, 0.12, c.color, 0, 0, -0.05);
  }

  g.scale.setScalar(c.scale);
  g.userData = { inner, head, legs, tail, ears, tongue, body, tailBase: tail.rotation.x, phase: Math.random() * 10 };
  return g;
}

export function animateDog(dog, t, move = 0, excited = 0.3) {
  const u = dog.userData;
  const p = t + u.phase;
  if (u.derp) return derpWalk(u, p, move, excited);
  const swing = Math.sin(p * 13) * 0.75 * move;
  u.legs[0].rotation.x = swing; u.legs[3].rotation.x = swing;
  u.legs[1].rotation.x = -swing; u.legs[2].rotation.x = -swing;
  u.inner.position.y = Math.abs(Math.sin(p * 13)) * 0.06 * move + Math.sin(p * 2.2) * 0.012;
  u.tail.rotation.y = Math.sin(p * (8 + excited * 8)) * (0.25 + excited * 0.6);
  u.head.rotation.z = Math.sin(p * 1.3) * 0.05;
  u.head.rotation.x = Math.sin(p * 13) * 0.04 * move;
  for (let i = 0; i < 2; i++) u.ears[i].rotation.x = -move * 0.35 + Math.sin(p * 13 + i) * 0.1 * move;
  if (u.tongue) u.tongue.scale.z = 1 + Math.sin(p * 9) * 0.15;
}

// Dexter's walk: maximum derp. Legs flail out of sync and splay sideways, the butt
// waddles, the head lolls, ears flap, the tongue trails and the tail helicopters.
function derpWalk(u, p, move, excited) {
  const f = 11;
  const phases = [0, 2.1, 3.7, 1.2];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1;
    u.legs[i].rotation.x = Math.sin(p * f + phases[i]) * 1.15 * move;
    u.legs[i].rotation.z = side * Math.max(0, Math.sin(p * f + phases[i] + 1)) * 0.55 * move;
  }
  const hop = Math.abs(Math.sin(p * f * 0.5));
  u.inner.position.y = hop * 0.2 * move + Math.sin(p * 2.2) * 0.012;
  u.inner.rotation.z = Math.sin(p * f * 0.5) * 0.2 * move;          // waddle roll
  u.inner.rotation.y = Math.sin(p * f * 0.5 + 0.8) * 0.28 * move;   // butt wiggle
  u.inner.rotation.x = Math.sin(p * f) * 0.07 * move;
  u.head.rotation.z = Math.sin(p * f * 0.5 + 1.5) * 0.5 * move + Math.sin(p * 1.3) * 0.06;
  u.head.rotation.y = Math.sin(p * f * 0.25) * 0.35 * move;
  u.head.rotation.x = -0.15 * move + Math.sin(p * f) * 0.12 * move;
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1;
    u.ears[i].rotation.z = s * (0.18 + Math.abs(Math.sin(p * f * 0.5 + i * 0.9)) * 1.3 * move);
    u.ears[i].rotation.x = -0.3 * move;
  }
  if (u.tongue) {
    u.tongue.scale.z = 1 + move * 1.3 + Math.sin(p * 9) * 0.2;
    u.tongue.rotation.y = Math.sin(p * f) * 0.9 * move;
    u.tongue.position.x = Math.sin(p * f * 0.5) * 0.07 * move;
  }
  if (move > 0.15) { u.tail.rotation.z = p * 17; u.tail.rotation.y = 0.5; }   // helicopter
  else { u.tail.rotation.z = 0; u.tail.rotation.y = Math.sin(p * (8 + excited * 8)) * (0.25 + excited * 0.6); }
}

export const DEXTER_LOOK = {
  color: 0x26262d, chest: 0xf2f0ea, chin: 0x8a8a8c, collar: 0xc7362b, tag: true,
  eye: 0x7a4215, ear: 'floppy', tail: 'long', bodyW: 0.54, bodyLen: 1.15,
};
export function makeDexter() {
  const d = makeDog(DEXTER_LOOK);
  d.userData.derp = true;
  return d;
}

/* ---------- Serious Mode (battle only) ----------
 * When a fight starts everyone becomes an absurdly muscular, smooth, high-poly
 * biped with a menacing aura. Purely cosmetic. Faces +Z like the normal models. */
export function makeBuffDog(look = {}, auraColor = 0xb04fe0) {
  const c = { color: 0x1c1c20, chest: null, snoutColor: null, chin: null, eye: 0x6b3a12, ear: 'floppy', earColor: null, collar: null, tag: false, mask: false, fluffy: false, snout: 0.3, ...look };
  const g = new THREE.Group();
  const baseCol = new THREE.Color(c.color);
  if (baseCol.getHSL({}).l < 0.2) baseCol.offsetHSL(0, 0, 0.07); // let the muscles catch light on black fur
  const skin = new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.36, metalness: 0.08 });
  const pale = new THREE.MeshStandardMaterial({ color: c.chest ?? c.snoutColor ?? c.color, roughness: 0.4 });
  const snoutM = c.snoutColor !== null ? new THREE.MeshStandardMaterial({ color: c.snoutColor, roughness: 0.4 }) : skin;
  const dark = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3 });
  const add = (parent, geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; parent.add(mesh);
    return mesh;
  };
  const sp = (parent, r, x, y, z, sx, sy, sz, m = skin) => add(parent, new THREE.SphereGeometry(r, 28, 20), m, x, y, z, sx, sy, sz);
  const cap = (parent, r, len, x, y, z, m = skin) => add(parent, new THREE.CapsuleGeometry(r, len, 8, 20), m, x, y, z);

  // legs
  for (const s of [-1, 1]) {
    cap(g, 0.21, 0.36, s * 0.27, 0.86, 0);
    sp(g, 0.2, s * 0.3, 0.9, 0.1, 0.9, 1.3, 0.8);            // quad
    cap(g, 0.13, 0.3, s * 0.27, 0.34, -0.04);
    sp(g, 0.17, s * 0.27, 0.42, -0.14, 0.8, 1.2, 0.8);        // calf
    sp(g, 0.18, s * 0.27, 0.09, 0.1, 1, 0.55, 1.5);           // paw
  }
  sp(g, 0.36, 0, 1.14, 0, 1.15, 0.75, 0.85);
  add(g, new THREE.CylinderGeometry(0.46, 0.3, 0.6, 24), skin, 0, 1.44, 0, 1, 1, 0.75);
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) sp(g, 0.1, s * 0.105, 1.2 + i * 0.145, 0.25 + i * 0.012, 1, 0.72, 0.6); // 8-pack
  for (const s of [-1, 1]) { sp(g, 0.09, s * 0.3, 1.3, 0.14, 0.6, 1.6, 0.8); sp(g, 0.09, s * 0.34, 1.48, 0.12, 0.6, 1.6, 0.8); } // obliques
  const chest = sp(g, 0.5, 0, 1.88, -0.02, 1.3, 0.85, 0.8);
  for (const s of [-1, 1]) {
    sp(g, 0.29, s * 0.25, 1.9, 0.26, 1.05, 0.85, 0.7);        // pecs
    sp(g, 0.3, s * 0.48, 1.62, -0.05, 0.7, 1.3, 0.85);        // lats
    sp(g, 0.24, s * 0.27, 2.24, -0.06, 1.4, 0.75, 1);         // traps
    sp(g, 0.31, s * 0.76, 2.08, 0, 1, 0.95, 1);               // delts
  }
  if (c.chest !== null) sp(g, 0.1, 0, 1.86, 0.44, 0.75, 2.1, 0.45, pale);
  add(g, new THREE.CylinderGeometry(0.21, 0.26, 0.34, 20), skin, 0, 2.36, 0.02);

  // arms: a = upper-arm pivot, e = elbow pivot
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.78, 2.08, 0); g.add(a);
    cap(a, 0.17, 0.26, 0, -0.3, 0);
    sp(a, 0.22, 0, -0.28, 0.07, 1, 1.15, 1);                  // bicep
    sp(a, 0.17, 0, -0.3, -0.1, 0.9, 1.2, 0.8);                // tricep
    const e = new THREE.Group(); e.position.set(0, -0.6, 0); a.add(e);
    cap(e, 0.15, 0.24, 0, -0.26, 0);
    sp(e, 0.17, 0, -0.16, 0.02, 1.05, 1.1, 1);
    sp(e, 0.2, 0, -0.56, 0, 1, 0.9, 1.15);                    // fist-paw
    arms.push({ a, e, s });
  }
  // pose: one arm flexing, the other pointing dramatically at the opponent
  arms[1].a.rotation.z = 1.45; arms[1].e.rotation.z = 2.0;
  arms[0].a.rotation.x = -1.3; arms[0].a.rotation.z = 0.15; arms[0].e.rotation.x = -0.15;

  // head
  const head = new THREE.Group(); head.position.set(0, 2.68, 0.1); g.add(head);
  sp(head, 0.3, 0, 0, 0, 1, 0.95, 1.05);
  const sn = add(head, new THREE.CapsuleGeometry(0.13, c.snout * 0.9, 8, 16), snoutM, 0, -0.07, 0.3 + c.snout * 0.3);
  sn.rotation.x = Math.PI / 2;
  sp(head, 0.15, 0, -0.19, 0.2, 1.25, 0.6, 1.3, c.chin !== null ? new THREE.MeshStandardMaterial({ color: c.chin, roughness: 0.5 }) : skin); // heroic jaw
  sp(head, 0.07, 0, -0.03, 0.44 + c.snout * 0.75, 1.2, 0.9, 0.9, dark);
  const iris = new THREE.MeshStandardMaterial({ color: c.eye, emissive: c.eye, emissiveIntensity: 1.3, roughness: 0.2 });
  for (const s of [-1, 1]) {
    sp(head, 0.07, s * 0.125, 0.07, 0.24, 1.1, 0.7, 0.6, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    sp(head, 0.04, s * 0.125, 0.065, 0.285, 1, 1, 0.5, iris);
    sp(head, 0.016, s * 0.125, 0.065, 0.305, 1, 1, 0.5, dark);
    const brow = add(head, new THREE.BoxGeometry(0.2, 0.06, 0.1), dark, s * 0.13, 0.15, 0.25);
    brow.rotation.z = -s * 0.5; // very serious eyebrows
    if (c.ear === 'floppy') sp(head, 0.15, s * 0.3, -0.06, -0.02, 0.42, 1.5, 1, c.earColor !== null ? new THREE.MeshStandardMaterial({ color: c.earColor }) : skin);
    else { const e = add(head, new THREE.ConeGeometry(0.11, c.ear === 'big' ? 0.42 : 0.28, 16), skin, s * 0.19, 0.33, -0.02); e.rotation.z = -s * 0.3; }
  }
  if (c.mask) sp(head, 0.3, 0, 0.07, 0.03, 1.03, 0.3, 1.02, dark);
  if (c.fluffy) { sp(head, 0.24, 0, 0.32, -0.02, 1, 1, 1); for (const a of arms) sp(a.e, 0.2, 0, -0.38, 0, 1, 1, 1); }
  if (c.collar !== null) {
    const col = add(g, new THREE.TorusGeometry(0.235, 0.05, 10, 24), new THREE.MeshStandardMaterial({ color: c.collar, roughness: 0.5 }), 0, 2.4, 0.02);
    col.rotation.x = Math.PI / 2;
    if (c.tag) sp(g, 0.06, 0, 2.3, 0.27, 1, 1, 0.4, new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.7, roughness: 0.25 }));
  }
  const tail = cap(g, 0.07, 0.45, 0, 1.3, -0.42); tail.rotation.x = -0.9;

  // aura
  const auraM = new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
  const aura = add(g, new THREE.SphereGeometry(1.7, 20, 14), auraM, 0, 1.5, 0, 1, 1.25, 1); aura.castShadow = false;
  const flameM = new THREE.MeshBasicMaterial({ color: auraColor, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const f = add(g, new THREE.ConeGeometry(0.22, 1.6, 6), flameM, Math.cos(a) * 1.15, 1, Math.sin(a) * 1.15 - 0.1);
    f.castShadow = false; flames.push(f);
  }
  g.userData = { head, chest, aura, flames, arms, buff: true, popY: 3.0, phase: Math.random() * 10 };
  return g;
}

export function animateBuff(m, t) {
  const u = m.userData, p = t + u.phase;
  const b = 1 + Math.sin(p * 2.4) * 0.025;
  u.chest.scale.set(1.3 * b, 0.85 * b, 0.8 * b);
  u.aura.scale.set(1 + Math.sin(p * 5) * 0.05, 1.25 + Math.sin(p * 4) * 0.08, 1 + Math.sin(p * 5) * 0.05);
  u.flames.forEach((f, i) => { f.position.y = 0.9 + ((p * 1.6 + i * 0.37) % 1) * 1.8; f.scale.y = 0.6 + Math.sin(p * 7 + i) * 0.3; });
  u.arms[1].e.rotation.z = 2.0 + Math.sin(p * 2.4) * 0.12; // slow, deliberate flexing
}

/* ---------- Friends ---------- */
export const FRIEND_LOOKS = {
  donkey: { color: 0x8c8378, snoutColor: 0xe6ddcf, chest: 0xe6ddcf, scale: 1.55, ear: 'big', bodyLen: 1.25, bodyW: 0.5, legLen: 0.62, snout: 0.38, tail: 'long', tailTip: 0x3a342e, eye: 0x1a0d00, tongue: false, headSize: 1.05 },
  pig: { color: 0xf2a6b3, snoutColor: 0xe07f93, scale: 1.05, ear: 'pointy', bodyLen: 1.05, bodyW: 0.68, bodyH: 0.6, legLen: 0.22, snout: 0.13, tail: 'curl', eye: 0x1a0d00, tongue: false },
};

export function makeDonkey() {
  const d = makeDog(FRIEND_LOOKS.donkey);
  const u = d.userData;
  for (let i = 0; i < 5; i++) box(u.inner, 0.08, 0.16, 0.14, 0x3a342e, 0, 1.42 + i * 0.03, 0.55 - i * 0.16); // mane
  for (const e of u.ears) e.scale.y = 1.5;
  return d;
}

export function makeChicken(color = 0xffffff) {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  box(inner, 0.3, 0.3, 0.42, color, 0, 0.36, 0);
  box(inner, 0.26, 0.2, 0.14, color, 0, 0.48, -0.24).rotation.x = -0.5; // tail feathers
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.2); inner.add(head);
  box(head, 0.18, 0.26, 0.18, color, 0, 0.1, 0);
  box(head, 0.08, 0.06, 0.12, 0xf2a020, 0, 0.1, 0.14);
  box(head, 0.05, 0.1, 0.14, 0xd9342b, 0, 0.27, 0);
  box(head, 0.05, 0.08, 0.05, 0xd9342b, 0, 0.0, 0.11);
  for (const s of [-1, 1]) { box(head, 0.03, 0.04, 0.04, 0x111111, s * 0.09, 0.14, 0.05); box(inner, 0.04, 0.22, 0.04, 0xf2a020, s * 0.08, 0.11, 0); }
  g.userData = { inner, head, phase: Math.random() * 10 };
  return g;
}

export function makeFarmBits() {
  const g = new THREE.Group();
  const fence = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
    for (const y of [0.35, 0.7]) { const r = box(g, 0.08, 0.1, len, 0xb8946a, (x1 + x2) / 2, y, (z1 + z2) / 2); r.rotation.y = ang; }
    for (let i = 0; i <= len; i += 1.5) box(g, 0.14, 0.95, 0.14, 0x9a7850, x1 + ((x2 - x1) * i) / len, 0.47, z1 + ((z2 - z1) * i) / len);
  };
  // road "down the street"
  for (let i = 0; i < 16; i++) { const r = box(g, 2.2, 0.04, 3, 0xb9a98c, 5 + i * 2.1, 0.02, 14 + Math.sin(i * 0.5) * 0.6); r.castShadow = false; r.rotation.y = Math.PI / 2; }
  // mailbox at the end of Dexter's path
  box(g, 0.12, 1, 0.12, 0x8a6a48, 2.6, 0.5, 11.6); box(g, 0.3, 0.26, 0.5, 0x3f6f8f, 2.6, 1.1, 11.6); box(g, 0.04, 0.2, 0.04, 0xd9342b, 2.78, 1.25, 11.75);
  // chicken coop
  box(g, 1.8, 1.3, 1.6, 0xb5382c, 13, 0.85, 20.5); box(g, 2.1, 0.14, 1.9, 0xf2ede4, 13, 1.56, 20.5); box(g, 0.5, 0.6, 0.06, 0x3a241a, 13, 0.55, 19.69);
  for (const [x, z] of [[12.3, 21.2], [13.7, 21.2], [12.3, 19.8], [13.7, 19.8]]) box(g, 0.1, 0.3, 0.1, 0x8a6a48, x, 0.15, z);
  // donkey's hay + trough
  box(g, 1.3, 0.8, 0.9, 0xe2c25a, 24, 0.4, 7.2); box(g, 1.3, 0.8, 0.9, 0xd9b84e, 24.3, 1.15, 7.3); box(g, 1.4, 0.4, 0.6, 0x8a6a48, 21.5, 0.25, 7);
  // pig pen with mud
  const mud = new THREE.Mesh(new THREE.CircleGeometry(2.2, 12), mat(0x6b4a2e));
  mud.rotation.x = -Math.PI / 2; mud.position.set(28, 0.03, 19.5); mud.receiveShadow = true; g.add(mud);
  fence(25, 17, 31, 17); fence(31, 17, 31, 22.5); fence(25, 22.5, 31, 22.5); fence(25, 19.5, 25, 22.5);
  return g;
}

export const RIVAL_LOOKS = {
  taco: { color: 0xd9b282, scale: 0.6, ear: 'big', bodyLen: 0.8, legLen: 0.32, snout: 0.18, headSize: 1.15, tail: 'curl', collar: 0xff4fa0, eye: 0x221100 },
  pug: { color: 0xd8c39a, snoutColor: 0x2b2420, earColor: 0x2b2420, scale: 0.75, bodyLen: 0.85, bodyW: 0.6, legLen: 0.28, snout: 0.1, tail: 'curl', collar: 0x3b6fd9, eye: 0x1a0d00 },
  corgi: { color: 0xe09a45, chest: 0xfff6e6, snoutColor: 0xfff6e6, scale: 0.85, ear: 'big', bodyLen: 1.25, legLen: 0.2, tail: 'nub', collar: 0x38a860, eye: 0x2a1500 },
  poodle: { color: 0xf3ede4, scale: 0.95, fluffy: true, legLen: 0.6, bodyLen: 0.9, bodyW: 0.42, tail: 'pom', snout: 0.34, collar: 0xb04fe0, eye: 0x1a0d00, tongue: false },
  husky: { color: 0x7d8794, chest: 0xf5f6f8, snoutColor: 0xf5f6f8, scale: 1.12, ear: 'pointy', tail: 'curl', tailTip: 0xf5f6f8, eye: 0x6ecbff, collar: 0x23263a },
  raccoon: { color: 0x7b7b78, snoutColor: 0xdcdcd4, mask: true, scale: 0.62, ear: 'pointy', bodyLen: 0.9, bodyW: 0.56, legLen: 0.25, tail: 'ring', eye: 0x101010, tongue: false, snout: 0.22 },
};

export function makeSquirrel() {
  const g = new THREE.Group();
  box(g, 0.2, 0.22, 0.34, 0xa8612c, 0, 0.2, 0);
  box(g, 0.17, 0.17, 0.17, 0xa8612c, 0, 0.36, 0.2);
  box(g, 0.05, 0.08, 0.04, 0xa8612c, -0.06, 0.48, 0.18);
  box(g, 0.05, 0.08, 0.04, 0xa8612c, 0.06, 0.48, 0.18);
  const tail = box(g, 0.16, 0.42, 0.16, 0xc47a3a, 0, 0.42, -0.24);
  tail.rotation.x = -0.3;
  g.userData.tail = tail;
  return g;
}

/* ---------- Scenery ---------- */
export function makeTree(kind, s = 1) {
  const g = new THREE.Group();
  if (kind === 'pine') {
    shape(g, new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), 0x6b4a2e, 0, 0.8, 0);
    const greens = [0x2f6b3c, 0x377a45, 0x3f8a4e];
    for (let i = 0; i < 3; i++) shape(g, new THREE.ConeGeometry(1.7 - i * 0.4, 2.1, 7), greens[i], 0, 2.2 + i * 1.25, 0);
  } else {
    shape(g, new THREE.CylinderGeometry(0.25, 0.38, 2.4, 6), 0x7a5533, 0, 1.2, 0);
    shape(g, new THREE.IcosahedronGeometry(1.7, 0), 0x4c9a4a, 0, 3.4, 0);
    shape(g, new THREE.IcosahedronGeometry(1.1, 0), 0x5fb056, 0.8, 4.2, 0.3);
  }
  g.scale.setScalar(s);
  g.rotation.y = Math.random() * 6.28;
  return g;
}

export function makeRock(s = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), mat(0x8d8f96));
  m.position.y = 0.25 * s; m.scale.y = 0.7; m.rotation.y = Math.random() * 6;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function makeFlower() {
  const g = new THREE.Group();
  const cols = [0xff6b8a, 0xffd23f, 0xffffff, 0xb07cff, 0xff9a3d];
  box(g, 0.04, 0.3, 0.04, 0x3f8a4e, 0, 0.15, 0);
  box(g, 0.16, 0.1, 0.16, cols[Math.floor(Math.random() * cols.length)], 0, 0.33, 0);
  return g;
}

export function makeBush() {
  const g = new THREE.Group();
  shape(g, new THREE.IcosahedronGeometry(0.7, 0), 0x3f8a4e, 0, 0.45, 0);
  shape(g, new THREE.IcosahedronGeometry(0.5, 0), 0x4c9a4a, 0.5, 0.35, 0.2);
  return g;
}

/* ---------- House ---------- */
// Body: x -5..5, z -21.5..-14.5. Balcony/porch: z -14.5..-11.5. Stairs: x 5..7, z -11.5..-5.5.
export function makeHouse() {
  const g = new THREE.Group();
  const siding = 0xe9dfc4, trim = 0xffffff, roofC = 0x8b3f33, wood = 0xa9825a;
  box(g, 10, 6, 7, siding, 0, 3, -18);
  // siding lines
  for (let i = 1; i < 12; i++) box(g, 10.04, 0.03, 7.04, 0xd4c9ab, 0, i * 0.5, -18);
  box(g, 10.3, 0.25, 7.3, trim, 0, 3, -18);
  // gable roof
  const tri = new THREE.Shape();
  tri.moveTo(-5.7, 0); tri.lineTo(5.7, 0); tri.lineTo(0, 3); tri.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 8, bevelEnabled: false }), mat(roofC));
  roof.position.set(0, 6, -22); roof.castShadow = true; g.add(roof);
  box(g, 0.9, 2.2, 0.9, 0x9a5a4a, 3, 8, -19);
  // windows (shared material glows at night)
  const win = mat(0x9fd6ff, { emissive: 0xffc860, emissiveIntensity: 0 });
  g.userData.windowMat = win;
  const frame = (x, y) => { box(g, 1.7, 1.7, 0.1, trim, x, y, -14.48); box(g, 1.4, 1.4, 0.14, win, x, y, -14.47); box(g, 0.08, 1.4, 0.16, trim, x, y, -14.47); box(g, 1.4, 0.08, 0.16, trim, x, y, -14.47); };
  frame(-3, 1.6); frame(3, 1.6); frame(-3, 4.6); frame(3.2, 4.6);
  // doors
  box(g, 1.5, 2.4, 0.12, 0x3f6f8f, 0, 1.2, -14.47); box(g, 0.12, 0.12, 0.1, 0xf2c230, 0.5, 1.2, -14.38);
  box(g, 1.3, 2.2, 0.12, 0x3f6f8f, 0.4, 4.2, -14.47);
  // side windows
  for (const x of [-5.02, 5.02]) for (const y of [1.6, 4.6]) box(g, 0.12, 1.3, 1.3, win, x, y, -18.5);
  // balcony floor + landing
  box(g, 12, 0.2, 3, wood, 1, 2.9, -13);
  box(g, 10, 0.12, 3, 0xb8b2a6, 0, 0.06, -13); // porch slab
  for (const x of [-4.85, 0, 4.85, 6.85]) box(g, 0.25, 2.8, 0.25, trim, x, 1.4, -11.65);
  // railing: front (x -5..5) and landing outer sides
  box(g, 10, 0.1, 0.12, trim, 0, 3.9, -11.6);
  for (let x = -4.9; x <= 5; x += 0.45) box(g, 0.09, 0.9, 0.09, trim, x, 3.45, -11.6);
  box(g, 0.12, 0.1, 3, trim, -4.95, 3.9, -13);
  for (let z = -14.3; z <= -11.7; z += 0.45) box(g, 0.09, 0.9, 0.09, trim, -4.95, 3.45, z);
  box(g, 0.12, 0.1, 3, trim, 6.95, 3.9, -13);
  for (let z = -14.3; z <= -11.7; z += 0.45) box(g, 0.09, 0.9, 0.09, trim, 6.95, 3.45, z);
  // stairs
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const h = 3 * (i + 1) / steps;
    box(g, 2, 0.16, 0.62, wood, 6, h - 0.1, -5.5 - (i + 0.5) * 0.6);
  }
  for (const x of [5.05, 6.95]) {
    const rail = box(g, 0.1, 0.1, 6.75, trim, x, 2.4, -8.5);
    rail.rotation.x = Math.atan2(3, 6);
    for (let i = 0; i <= 4; i++) box(g, 0.09, 0.95 + (i === 0 ? 0 : 0), 0.09, trim, x, 0.45 + i * 0.75, -5.5 - i * 1.5);
  }
  // Dexter's bed (blue, like the couch)
  const bed = new THREE.Group();
  box(bed, 1.7, 0.22, 1.3, 0x3d67b8, 0, 0.11, 0);
  box(bed, 1.7, 0.4, 0.2, 0x335aa6, 0, 0.25, -0.6);
  box(bed, 0.2, 0.4, 1.3, 0x335aa6, -0.8, 0.25, 0); box(bed, 0.2, 0.4, 1.3, 0x335aa6, 0.8, 0.25, 0);
  box(bed, 1.2, 0.08, 0.8, 0x6f95dd, 0, 0.25, 0.05);
  bed.position.set(-3, 3, -13.2);
  g.add(bed);
  // potted monsteras on the porch
  for (const x of [-4, 4]) {
    shape(g, new THREE.CylinderGeometry(0.4, 0.3, 0.5, 8), 0xc8693f, x, 0.37, -12.3);
    for (let i = 0; i < 4; i++) {
      const leaf = box(g, 0.5, 0.04, 0.6, 0x2f7d3f, x + Math.cos(i * 1.6) * 0.3, 0.95 + i * 0.12, -12.3 + Math.sin(i * 1.6) * 0.3);
      leaf.rotation.set(0.4, i * 1.6, 0.3);
    }
  }
  return g;
}

export function makeBowl() {
  const g = new THREE.Group();
  box(g, 2, 0.05, 1.4, 0xc7362b, 0, 0.03, 0); // mat
  shape(g, new THREE.CylinderGeometry(0.5, 0.38, 0.3, 10), 0xdde3ea, 0, 0.2, 0);
  const pile = new THREE.Group(); pile.position.y = 0.3; g.add(pile);
  g.userData.pile = pile;
  return g;
}

export function fillBowl(bowl, n) {
  const pile = bowl.userData.pile;
  const want = Math.min(14, Math.ceil(n / 2));
  while (pile.children.length > want) pile.remove(pile.children[pile.children.length - 1]);
  while (pile.children.length < want) {
    const i = pile.children.length;
    const b = box(pile, 0.22, 0.1, 0.1, 0xf3e3bf, Math.cos(i * 2.4) * 0.22 * (i % 3 ? 1 : 0.3), Math.floor(i / 4) * 0.09, Math.sin(i * 2.4) * 0.22);
    b.rotation.y = i * 1.3;
  }
}

/* ---------- Treats ---------- */
export const TREATS = {
  biscuit: { value: 1, name: 'biscuit' },
  bacon: { value: 2, name: 'bacon' },
  cheese: { value: 2, name: 'cheese' },
  drumstick: { value: 3, name: 'drumstick' },
  golden: { value: 6, name: 'GOLDEN BONE' },
};

export function makeTreat(type) {
  const g = new THREE.Group();
  const bone = (col) => {
    const m = typeof col === 'number' ? mat(col) : col;
    box(g, 0.5, 0.13, 0.13, m, 0, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) shape(g, new THREE.IcosahedronGeometry(0.11, 0), m, sx * 0.27, 0, sz * 0.08);
  };
  if (type === 'biscuit') bone(0xf0dcae);
  else if (type === 'golden') bone(mat(0xffd23f, { emissive: 0xffa800, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.3 }));
  else if (type === 'bacon') {
    for (let i = 0; i < 4; i++) box(g, 0.16, 0.05, 0.26, i % 2 ? 0xf7c9b0 : 0xb5382c, -0.24 + i * 0.16, (i % 2) * 0.05, 0);
  } else if (type === 'cheese') {
    const w = shape(g, new THREE.CylinderGeometry(0.3, 0.3, 0.24, 3), 0xffc933, 0, 0, 0);
    w.scale.z = 0.7;
  } else {
    shape(g, new THREE.IcosahedronGeometry(0.22, 0), 0xb5682c, 0.1, 0, 0);
    box(g, 0.32, 0.08, 0.08, 0xf7f2e6, -0.22, 0, 0);
  }
  const holder = new THREE.Group();
  g.rotation.z = 0.3;
  holder.add(g);
  return holder;
}

export function makeDigSpot() {
  const g = new THREE.Group();
  const m = shape(g, new THREE.ConeGeometry(0.7, 0.3, 7), 0x6f5236, 0, 0.14, 0);
  m.castShadow = false;
  box(g, 0.12, 0.06, 0.12, 0x5a4029, 0.5, 0.03, 0.4); box(g, 0.1, 0.05, 0.1, 0x5a4029, -0.6, 0.03, -0.2);
  return g;
}
