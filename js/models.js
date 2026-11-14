import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

// Soft-edged box with smooth shading: keeps the chunky proportions but loses the hard cube corners.
const smoothCache = new Map();
function smat(color) {
  if (!smoothCache.has(color)) smoothCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  return smoothCache.get(color);
}
export function softBox(parent, w, h, d, color, x = 0, y = 0, z = 0, round = 0.38) {
  const r = Math.min(w, h, d) * round;
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), typeof color === 'number' ? smat(color) : color);
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
  const box = softBox; // every part of a dog is a rounded box
  const bodyY = c.legLen + c.bodyH / 2;
  const body = box(inner, c.bodyW, c.bodyH, c.bodyLen, c.color, 0, bodyY, 0);
  // slightly broader chest
  box(inner, c.bodyW + 0.06, c.bodyH + 0.04, c.bodyLen * 0.4, c.color, 0, bodyY + 0.01, c.bodyLen * 0.28);
  if (c.chest !== null) {
    box(inner, c.bodyW * 0.36, c.bodyH * 0.75, 0.05, c.chest, 0, bodyY - 0.04, c.bodyLen * 0.48 + 0.01);
    box(inner, c.bodyW * 0.2, 0.05, c.bodyLen * 0.3, c.chest, 0, bodyY - c.bodyH / 2 - 0.02, c.bodyLen * 0.3);
  }
  if (c.saddle) box(inner, c.bodyW + 0.03, c.bodyH * 0.45, c.bodyLen * 0.7, c.saddle, 0, bodyY + c.bodyH * 0.3, -c.bodyLen * 0.08); // dark back
  if (c.spots) for (const [sx, sy, sz] of [[1, 0.3, 0.3], [-1, 0.1, 0.15], [1, -0.1, -0.2], [-1, 0.35, -0.3], [0, 1, 0.05], [0, 1, -0.32], [1, 0.2, -0.05], [-1, -0.15, 0.35]])
    box(inner, sx ? 0.03 : 0.12, sx ? 0.12 : 0.03, 0.12, c.spots, sx * (c.bodyW / 2 + 0.005), bodyY + (sx ? sy * c.bodyH : c.bodyH / 2 + 0.005), sz * c.bodyLen, 0.2);
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
    box(head, 0.13, 0.04, 0.05, c.color, s * 0.12, 0.225, 0.27).rotation.z = -s * 0.3;
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
 * version of themselves, prowling on all fours. Purely cosmetic. Faces +Z. */
export function makeBuffDog(look = {}) {
  const c = { color: 0x1c1c20, chest: null, snoutColor: null, chin: null, eye: 0x6b3a12, ear: 'floppy', earColor: null, collar: null, tag: false, mask: false, fluffy: false, snout: 0.3, ...look };
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
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

  // torso: deep chest, tucked waist, big haunches
  const chest = sp(inner, 0.56, 0, 1.2, 0.45, 1.05, 1.02, 1.12);
  sp(inner, 0.42, 0, 1.18, -0.3, 0.88, 0.82, 1.35);                 // waist
  for (const s of [-1, 1]) {
    sp(inner, 0.28, s * 0.22, 1.02, 0.9, 1.05, 0.9, 0.75);          // pecs
    sp(inner, 0.33, s * 0.44, 1.42, 0.5, 0.85, 1.0, 1.1);           // shoulder hump
    sp(inner, 0.24, s * 0.17, 1.62, 0.3, 1.0, 0.7, 1.6);            // back / traps
    sp(inner, 0.2, s * 0.15, 1.5, -0.35, 1.0, 0.6, 1.8);            // spinal erectors
    sp(inner, 0.4, s * 0.27, 1.16, -0.8, 0.9, 1.0, 1.05);           // haunch
    for (let i = 0; i < 3; i++) sp(inner, 0.09, s * 0.32, 0.98 + i * 0.04, 0.1 - i * 0.2, 0.5, 1.5, 1.0); // ribs / serratus
  }
  if (c.chest !== null) sp(inner, 0.11, 0, 1.0, 1.02, 0.8, 2.0, 0.45, pale);
  // neck
  const neck = cap(inner, 0.27, 0.35, 0, 1.62, 0.92); neck.rotation.x = 0.85;
  for (const s of [-1, 1]) sp(inner, 0.17, s * 0.2, 1.72, 0.85, 0.9, 1.0, 1.5);

  // legs: [front-left, front-right, hind-left, hind-right], each a pivot that swings
  const legs = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.44, 1.22, 0.56); inner.add(a);
    cap(a, 0.17, 0.3, 0, -0.3, 0);
    sp(a, 0.21, s * 0.04, -0.26, 0.07, 0.95, 1.2, 1.0);              // bicep
    sp(a, 0.18, 0, -0.3, -0.11, 0.9, 1.25, 0.85);                    // tricep
    cap(a, 0.125, 0.34, 0, -0.84, 0.02);
    sp(a, 0.16, 0, -0.72, 0.03, 1.05, 1.15, 1.0);                    // forearm
    sp(a, 0.19, 0, -1.13, 0.08, 1.0, 0.55, 1.4);                     // paw
    legs.push(a);
  }
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.31, 1.12, -0.82); inner.add(a);
    sp(a, 0.29, 0, -0.24, 0.02, 0.8, 1.35, 1.15);                    // thigh
    sp(a, 0.17, 0, -0.5, 0.12, 0.8, 1.0, 0.9);                       // stifle
    const shin = cap(a, 0.1, 0.34, 0, -0.76, -0.06); shin.rotation.x = -0.3;
    sp(a, 0.17, 0, -1.03, 0.06, 1.0, 0.55, 1.4);                     // paw
    legs.push(a);
  }

  // head
  const head = new THREE.Group(); head.position.set(0, 1.98, 1.28); inner.add(head);
  sp(head, 0.3, 0, 0, 0, 1, 0.95, 1.05);
  const sn = add(head, new THREE.CapsuleGeometry(0.13, c.snout * 0.9, 8, 16), snoutM, 0, -0.07, 0.3 + c.snout * 0.3);
  sn.rotation.x = Math.PI / 2;
  sp(head, 0.15, 0, -0.19, 0.2, 1.25, 0.6, 1.3, c.chin !== null ? new THREE.MeshStandardMaterial({ color: c.chin, roughness: 0.5 }) : skin); // heroic jaw
  sp(head, 0.07, 0, -0.03, 0.44 + c.snout * 0.75, 1.2, 0.9, 0.9, dark);
  const iris = new THREE.MeshStandardMaterial({ color: c.eye, emissive: c.eye, emissiveIntensity: 1.3, roughness: 0.2 });
  const ears = [];
  for (const s of [-1, 1]) {
    sp(head, 0.07, s * 0.125, 0.07, 0.24, 1.1, 0.7, 0.6, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    sp(head, 0.04, s * 0.125, 0.065, 0.285, 1, 1, 0.5, iris);
    sp(head, 0.016, s * 0.125, 0.065, 0.305, 1, 1, 0.5, dark);
    const brow = add(head, new THREE.BoxGeometry(0.2, 0.06, 0.1), dark, s * 0.13, 0.15, 0.25);
    brow.rotation.z = -s * 0.5; // very serious eyebrows
    const earM = c.earColor !== null ? new THREE.MeshStandardMaterial({ color: c.earColor }) : skin;
    if (c.ear === 'floppy') ears.push(sp(head, 0.15, s * 0.3, -0.06, -0.02, 0.42, 1.5, 1, earM));
    else { const e = add(head, new THREE.ConeGeometry(0.11, c.ear === 'big' ? 0.42 : 0.28, 16), earM, s * 0.19, 0.33, -0.02); e.rotation.z = -s * 0.3; ears.push(e); }
  }
  if (c.mask) sp(head, 0.3, 0, 0.07, 0.03, 1.03, 0.3, 1.02, dark);
  if (c.fluffy) { sp(head, 0.24, 0, 0.32, -0.02, 1, 1, 1); for (const l of legs) sp(l, 0.2, 0, -0.9, 0, 1, 1, 1); }
  if (c.collar !== null) {
    const col = add(inner, new THREE.TorusGeometry(0.3, 0.055, 10, 24), new THREE.MeshStandardMaterial({ color: c.collar, roughness: 0.5 }), 0, 1.72, 1.02);
    col.rotation.x = Math.PI / 2 - 0.75;
    if (c.tag) sp(inner, 0.065, 0, 1.42, 1.18, 1, 1, 0.4, new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.7, roughness: 0.25 }));
  }
  const tail = new THREE.Group(); tail.position.set(0, 1.45, -1.1); inner.add(tail);
  const tm = cap(tail, 0.075, 0.55, 0, 0.2, -0.28); tm.rotation.x = -0.95;

  g.userData = { inner, head, chest, legs, tail, ears, buff: true, popY: 2.7, phase: Math.random() * 10 };
  return g;
}

// Prowl in place: weight shifting side to side, slow deliberate steps, eyes locked on the opponent.
export function animateBuff(m, t) {
  const u = m.userData, p = t + u.phase;
  const sway = Math.sin(p * 1.25);
  u.inner.position.x = sway * 0.55;                       // strafing sway
  u.inner.position.z = Math.sin(p * 0.8) * 0.25;          // creeping in and backing off
  u.inner.position.y = Math.abs(Math.sin(p * 3.2)) * 0.05 - 0.04 + Math.sin(p * 1.25) * 0.02;
  u.inner.rotation.y = Math.cos(p * 1.25) * 0.42;         // body angles into the sidestep
  u.inner.rotation.z = sway * 0.07;
  u.inner.rotation.x = 0.06 + Math.sin(p * 0.8) * 0.04;   // shoulders low
  u.head.rotation.y = -u.inner.rotation.y * 0.9;          // head stays on target
  u.head.rotation.x = 0.18 + Math.sin(p * 2.1) * 0.05;
  const st = p * 3.2;
  u.legs[0].rotation.x = Math.sin(st) * 0.4; u.legs[3].rotation.x = Math.sin(st) * 0.35;
  u.legs[1].rotation.x = -Math.sin(st) * 0.4; u.legs[2].rotation.x = -Math.sin(st) * 0.35;
  for (let i = 0; i < 4; i++) u.legs[i].rotation.z = (i % 2 ? -1 : 1) * Math.max(0, Math.sin(st + i * 1.6)) * 0.1;
  const b = 1 + Math.sin(p * 2.4) * 0.03;
  u.chest.scale.set(1.05 * b, 1.02 * b, 1.12);
  u.tail.rotation.y = Math.sin(p * 1.6) * 0.5;
  u.tail.rotation.x = Math.sin(p * 0.9) * 0.15;
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

export function makeChicken(color = 0xa8552a, headColor = 0xd9a868) {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  box(inner, 0.3, 0.3, 0.42, color, 0, 0.36, 0);
  box(inner, 0.26, 0.2, 0.14, color, 0, 0.48, -0.24).rotation.x = -0.5; // tail feathers
  const head = new THREE.Group(); head.position.set(0, 0.52, 0.2); inner.add(head);
  box(head, 0.18, 0.26, 0.18, headColor, 0, 0.1, 0);
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
  for (let i = 0; i < 16; i++) { const r = box(g, 2.2, 0.04, 3, 0xb9a98c, 10.5 + i * 1.8, 0.02, 13 + Math.sin(i * 0.5) * 0.6); r.castShadow = false; r.rotation.y = Math.PI / 2; }
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
  beagle: { color: 0xb0743a, chest: 0xfaf7f0, snoutColor: 0xfaf7f0, earColor: 0x6b3f1d, scale: 0.8, bodyLen: 0.95, legLen: 0.32, tail: 'long', tailTip: 0xfaf7f0, collar: 0xd9342b, eye: 0x2a1500, saddle: 0x2a2420 },
  dachshund: { color: 0x8a4a22, earColor: 0x6b3518, scale: 0.75, bodyLen: 1.45, bodyW: 0.42, bodyH: 0.4, legLen: 0.14, snout: 0.36, tail: 'long', collar: 0x2fb5a8, eye: 0x1a0d00 },
  shiba: { color: 0xd9853a, chest: 0xfff3e0, snoutColor: 0xfff3e0, scale: 0.85, ear: 'pointy', bodyLen: 0.95, tail: 'curl', tailTip: 0xfff3e0, collar: 0xe8443a, eye: 0x1a0d00 },
  dalmatian: { color: 0xf6f4ef, scale: 1.0, legLen: 0.55, bodyLen: 1.1, bodyW: 0.46, snout: 0.34, tail: 'long', collar: 0xd9342b, eye: 0x2a1500, spots: 0x16161a, earColor: 0x2a2a2e },
  golden: { color: 0xd9a24e, chest: 0xf0cf8a, scale: 1.05, fluffy: true, bodyLen: 1.15, legLen: 0.5, tail: 'long', tailTip: 0xf0cf8a, collar: 0x3b6fd9, eye: 0x3a1f08 },
  boxer: { color: 0xc4874a, chest: 0xfaf7f0, snoutColor: 0x231d1a, scale: 1.0, bodyLen: 1.05, bodyW: 0.52, legLen: 0.55, snout: 0.14, tail: 'nub', collar: 0x23263a, eye: 0x2a1500 },
  shepherd: { color: 0xb5793a, snoutColor: 0x231d1a, earColor: 0x231d1a, scale: 1.15, ear: 'pointy', bodyLen: 1.2, legLen: 0.52, snout: 0.34, tail: 'long', tailTip: 0x231d1a, collar: 0xc7362b, eye: 0x3a1f08, saddle: 0x231d1a },
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

export function makeToad() {
  const g = new THREE.Group();
  const inner = new THREE.Group(); g.add(inner);
  softBox(inner, 0.46, 0.26, 0.5, 0x7a6a45, 0, 0.17, 0, 0.45);
  softBox(inner, 0.4, 0.2, 0.26, 0x857550, 0, 0.24, 0.26, 0.45);          // wide flat head
  softBox(inner, 0.34, 0.08, 0.3, 0xcfc39a, 0, 0.06, 0.12);                // pale belly
  for (const s of [-1, 1]) {
    softBox(inner, 0.1, 0.1, 0.1, 0xd9b84e, s * 0.13, 0.36, 0.3); softBox(inner, 0.05, 0.06, 0.06, 0x0a0a0a, s * 0.13, 0.37, 0.34);
    softBox(inner, 0.12, 0.09, 0.18, 0x6b5c3a, s * 0.19, 0.3, 0.12);       // the glands dogs should not lick
    softBox(inner, 0.14, 0.1, 0.3, 0x6b5c3a, s * 0.27, 0.07, -0.14); softBox(inner, 0.1, 0.07, 0.16, 0x6b5c3a, s * 0.22, 0.05, 0.26);
  }
  for (const [x, y, z] of [[0.1, 0.31, -0.05], [-0.12, 0.31, 0.04], [0.02, 0.31, -0.17], [-0.06, 0.31, -0.1]]) softBox(inner, 0.07, 0.04, 0.07, 0x5c4f33, x, y, z);
  g.userData = { inner };
  g.scale.setScalar(1.15);
  return g;
}

/* ---------- Scenery ---------- */
const SUMMER_PAL = { pine: [0x2f6b3c, 0x377a45, 0x3f8a4e], round: [0x4c9a4a, 0x5fb056] };
// pal.pine = three tier colours (bottom to top); pal.round = two canopy colours, or null for a bare winter tree
export function makeTree(kind, s = 1, pal = SUMMER_PAL, rot = Math.random() * 6.28) {
  const g = new THREE.Group();
  if (kind === 'pine') {
    shape(g, new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6), 0x6b4a2e, 0, 0.8, 0);
    for (let i = 0; i < 3; i++) shape(g, new THREE.ConeGeometry(1.7 - i * 0.4, 2.1, 7), pal.pine[i], 0, 2.2 + i * 1.25, 0);
  } else if (pal.round) {
    shape(g, new THREE.CylinderGeometry(0.25, 0.38, 2.4, 6), 0x7a5533, 0, 1.2, 0);
    shape(g, new THREE.IcosahedronGeometry(1.7, 0), pal.round[0], 0, 3.4, 0);
    shape(g, new THREE.IcosahedronGeometry(1.1, 0), pal.round[1], 0.8, 4.2, 0.3);
  } else { // bare branches
    shape(g, new THREE.CylinderGeometry(0.2, 0.38, 3.2, 6), 0x6b4f38, 0, 1.6, 0);
    for (let i = 0; i < 5; i++) {
      const b = shape(g, new THREE.CylinderGeometry(0.05, 0.11, 1.7, 5), 0x6b4f38, Math.cos(i * 1.3) * 0.55, 3.2 + (i % 3) * 0.45, Math.sin(i * 1.3) * 0.55);
      b.rotation.z = -Math.cos(i * 1.3) * 0.8; b.rotation.x = Math.sin(i * 1.3) * 0.8;
    }
    shape(g, new THREE.IcosahedronGeometry(0.35, 0), 0xf4f8fb, 0, 3.3, 0).scale.y = 0.4; // a dab of snow
  }
  g.scale.setScalar(s);
  g.rotation.y = rot;
  return g;
}

export function makeRock(s = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), mat(0x8d8f96));
  m.position.y = 0.25 * s; m.scale.y = 0.7; m.rotation.y = Math.random() * 6;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function makeFlower(r = Math.random) {
  const g = new THREE.Group();
  const cols = [0xff6b8a, 0xffd23f, 0xffffff, 0xb07cff, 0xff9a3d];
  box(g, 0.04, 0.3, 0.04, 0x3f8a4e, 0, 0.15, 0);
  box(g, 0.16, 0.1, 0.16, cols[Math.floor(r() * cols.length)], 0, 0.33, 0);
  return g;
}

export function makeBush() {
  const g = new THREE.Group();
  shape(g, new THREE.IcosahedronGeometry(0.7, 0), 0x3f8a4e, 0, 0.45, 0);
  shape(g, new THREE.IcosahedronGeometry(0.5, 0), 0x4c9a4a, 0.5, 0.35, 0.2);
  return g;
}

/* ---------- House ---------- */
// Modelled on the real one: cream siding, grey-green steep roof with three dormers,
// a raised wrap-around porch with white railings, dark green door and shutters.
// Body: x -5..5, z -21.5..-14.5. Porch deck: x -7.5..7.5, z -21.5..-11.5, raised 0.7.
// Front steps: x -1.2..1.2, z -11.5..-9.7.
export function makeHouse() {
  const g = new THREE.Group();
  const siding = 0xeee3c2, trim = 0xffffff, roofC = 0x7f9186, green = 0x2e4a3a, found = 0xd8cfb8;
  const D = 0.7; // deck height
  box(g, 15, D, 10, found, 0, D / 2, -16.5);
  box(g, 15.1, 0.06, 10.1, 0xcbc2ab, 0, D + 0.02, -16.5);
  box(g, 10, 3.2, 7, siding, 0, D + 1.6, -18);
  for (let i = 1; i < 8; i++) box(g, 10.04, 0.03, 7.04, 0xd9cfae, 0, D + i * 0.4, -18);

  // windows (shared material glows at night)
  const win = mat(0x9fd6ff, { emissive: 0xffc860, emissiveIntensity: 0 });
  g.userData.windowMat = win;
  const frontZ = -14.47;
  const windowAt = (x, y, w = 1.2, h = 1.7, shutters = true) => {
    box(g, w + 0.24, h + 0.24, 0.1, trim, x, y, frontZ);
    box(g, w, h, 0.14, win, x, y, frontZ + 0.01);
    box(g, 0.07, h, 0.16, trim, x, y, frontZ + 0.01); box(g, w, 0.07, 0.16, trim, x, y, frontZ + 0.01);
    if (shutters) for (const s of [-1, 1]) box(g, 0.42, h + 0.1, 0.1, green, x + s * (w / 2 + 0.36), y, frontZ);
  };
  windowAt(-3.4, D + 1.75); windowAt(3.4, D + 1.75); windowAt(1.75, D + 1.75, 0.8, 1.9, false);
  // front door: dark teal with a little window, wall lanterns either side (it swings open when Dexter barks)
  box(g, 1.5, 2.5, 0.1, trim, 0, D + 1.25, frontZ);
  box(g, 1.25, 2.3, 0.04, 0x2a2118, 0, D + 1.17, frontZ + 0.055);                 // dark hallway behind it
  const door = new THREE.Group(); door.position.set(-0.625, D, frontZ + 0.1); g.add(door);
  box(door, 1.25, 2.3, 0.08, 0x1d4352, 0.625, 1.17, 0);
  box(door, 0.55, 0.34, 0.09, win, 0.625, 1.95, 0); box(door, 0.6, 0.04, 0.1, 0x173845, 0.625, 1.75, 0);
  for (const y of [0.45, 1.15]) box(door, 0.8, 0.5, 0.09, 0x214b5c, 0.625, y, 0.005);
  box(door, 0.06, 0.2, 0.12, mat(0xbfc4c8, { metalness: 0.6, roughness: 0.3 }), 1.05, 1.1, 0.03);
  g.userData.frontDoor = door;
  for (const s of [-1, 1]) {
    box(g, 0.08, 0.3, 0.12, 0x2a2a2a, s * 1.05, D + 2.0, frontZ + 0.1);
    box(g, 0.22, 0.3, 0.22, mat(0xffe6a8, { emissive: 0xffc860, emissiveIntensity: 0.5 }), s * 1.05, D + 1.95, frontZ + 0.24);
    box(g, 0.28, 0.06, 0.28, 0x2a2a2a, s * 1.05, D + 2.13, frontZ + 0.24);
  }
  box(g, 0.2, 0.14, 0.05, 0xf0ead8, 0.95, D + 1.15, frontZ + 0.07);               // doorbell
  for (const x of [-5.02, 5.02]) box(g, 0.12, 1.5, 1.2, win, x, D + 1.75, -18.5);

  // porch roof (fades when Dexter is underneath so you can still see him)
  const porchM = mat(roofC, { transparent: true });
  g.userData.porchMat = porchM;
  const pf = box(g, 16, 0.16, 3.6, porchM, 0, 3.72, -13.1); pf.rotation.x = 0.13;
  for (const s of [-1, 1]) { const ps = box(g, 3.1, 0.16, 7.2, porchM, s * 6.35, 3.72, -18.1); ps.rotation.z = -s * 0.13; }
  box(g, 15.4, 0.2, 0.2, trim, 0, 3.45, -11.62);
  // posts
  for (const x of [-7.35, -3.9, -1.35, 1.35, 3.9, 7.35]) box(g, 0.22, 2.85, 0.22, trim, x, D + 1.42, -11.65);
  for (const s of [-1, 1]) for (const z of [-15, -18.3, -21.35]) box(g, 0.22, 2.85, 0.22, trim, s * 7.35, D + 1.42, z);
  // railings
  const railX = (x1, x2, z) => {
    box(g, x2 - x1, 0.09, 0.1, trim, (x1 + x2) / 2, D + 0.95, z); box(g, x2 - x1, 0.07, 0.08, trim, (x1 + x2) / 2, D + 0.15, z);
    for (let x = x1 + 0.2; x < x2; x += 0.34) box(g, 0.07, 0.8, 0.07, trim, x, D + 0.55, z);
  };
  const railZ = (z1, z2, x) => {
    box(g, 0.1, 0.09, z2 - z1, trim, x, D + 0.95, (z1 + z2) / 2); box(g, 0.08, 0.07, z2 - z1, trim, x, D + 0.15, (z1 + z2) / 2);
    for (let z = z1 + 0.2; z < z2; z += 0.34) box(g, 0.07, 0.8, 0.07, trim, x, D + 0.55, z);
  };
  railX(-7.35, -1.35, -11.6); railX(1.35, 7.35, -11.6); railZ(-21.4, -11.6, -7.4); railZ(-21.4, -11.6, 7.4);
  // front steps + handrails
  for (let i = 0; i < 4; i++) box(g, 2.4, D * (4 - i) / 4.6, 0.46, 0xdcd6c8, 0, (D * (4 - i) / 4.6) / 2, -11.27 - -i * 0.45);
  for (const s of [-1, 1]) {
    const r = box(g, 0.09, 0.09, 2.1, trim, s * 1.28, D + 0.5, -10.6); r.rotation.x = 0.36;
    box(g, 0.12, 1.0, 0.12, trim, s * 1.28, 0.5, -9.75);
  }

  // main roof: steep hip with a flatter cap, three dormers on the front
  const hipGeo = new THREE.CylinderGeometry(0.7071 * 0.5, 0.7071, 3.2, 4); hipGeo.rotateY(Math.PI / 4);
  const hip = new THREE.Mesh(hipGeo, mat(roofC)); hip.scale.set(10.9, 1, 7.9); hip.position.set(0, 3.9 + 1.6, -18); hip.castShadow = true; g.add(hip);
  const capGeo = new THREE.ConeGeometry(0.7071 * 0.5, 0.9, 4); capGeo.rotateY(Math.PI / 4);
  const capM = new THREE.Mesh(capGeo, mat(0x74867b)); capM.scale.set(10.9, 1, 7.9); capM.position.set(0, 7.1 + 0.45, -18); capM.castShadow = true; g.add(capM);
  for (const x of [-3, 0, 3]) {
    const w = x === 0 ? 1.9 : 1.4;
    box(g, w, 1.7, 2, siding, x, 5.05, -15.3);
    box(g, w - 0.35, 1.2, 0.1, trim, x, 5.1, -14.28); box(g, w - 0.55, 1.0, 0.12, win, x, 5.1, -14.27);
    box(g, 0.06, 1.0, 0.14, trim, x, 5.1, -14.27); box(g, w - 0.55, 0.06, 0.14, trim, x, 5.1, -14.27);
    const dg = new THREE.ConeGeometry(0.7071, 0.7, 4); dg.rotateY(Math.PI / 4);
    const dr = new THREE.Mesh(dg, mat(roofC)); dr.scale.set(w + 0.4, 1, 2.3); dr.position.set(x, 6.25, -15.3); dr.castShadow = true; g.add(dr);
  }

  // Dexter's bed (blue, like the couch) on the porch
  const bed = new THREE.Group();
  box(bed, 1.7, 0.22, 1.3, 0x3d67b8, 0, 0.11, 0);
  box(bed, 1.7, 0.4, 0.2, 0x335aa6, 0, 0.25, -0.6);
  box(bed, 0.2, 0.4, 1.3, 0x335aa6, -0.8, 0.25, 0); box(bed, 0.2, 0.4, 1.3, 0x335aa6, 0.8, 0.25, 0);
  box(bed, 1.2, 0.08, 0.8, 0x6f95dd, 0, 0.25, 0.05);
  bed.position.set(-4.6, D + 0.05, -13.4);
  g.add(bed);
  // potted monsteras
  for (const [x, z] of [[-2.2, -13.9], [5.6, -13.8]]) {
    shape(g, new THREE.CylinderGeometry(0.4, 0.3, 0.5, 8), x < 0 ? 0x6b4a3a : 0xc8693f, x, D + 0.3, z);
    for (let i = 0; i < 5; i++) {
      const leaf = box(g, 0.55, 0.04, 0.65, 0x2f7d3f, x + Math.cos(i * 1.4) * 0.35, D + 0.85 + i * 0.13, z + Math.sin(i * 1.4) * 0.3);
      leaf.rotation.set(0.4, i * 1.4, 0.3);
    }
  }
  // hammock hanging on the right side of the front porch
  const hamCols = [0xe8d9b0, 0xc7362b, 0xe8d9b0, 0x3f6f8f, 0xe8d9b0, 0xc7362b, 0xe8d9b0];
  for (let i = 0; i < 7; i++) {
    const u = i / 6, x = 4.35 + u * 2.6, y = D + 1.55 - Math.sin(u * Math.PI) * 0.62;
    const seg = box(g, 0.47, 0.05, 0.95, hamCols[i], x, y, -12.75);
    seg.rotation.z = -Math.cos(u * Math.PI) * 0.62;
  }
  for (const [x, s] of [[4.12, 1], [7.18, -1]]) { const rope = box(g, 0.34, 0.03, 0.03, 0xd8cfb8, x, D + 1.72, -12.75); rope.rotation.z = -s * 0.75; }
  box(g, 0.06, 0.5, 0.06, trim, 3.95, D + 2.1, -12.75); box(g, 0.06, 0.5, 0.06, trim, 7.35, D + 2.1, -12.75);

  // backyard: small screened porch with a balcony on top and stairs coming down
  const wood = 0xa9825a, scr = mat(0x7d868c, { transparent: true, opacity: 0.38 });
  box(g, 5.6, 0.3, 3.7, found, -1.4, 0.15, -23.35);
  for (const x of [-4.1, -1.4, 1.3]) box(g, 0.16, 2.8, 0.16, trim, x, 1.7, -25.1);
  for (const x of [-4.1, 1.3]) box(g, 0.16, 2.8, 0.16, trim, x, 1.7, -21.7);
  box(g, 5.3, 2.5, 0.04, scr, -1.4, 1.6, -25.1); box(g, 0.04, 2.5, 3.4, scr, -4.1, 1.6, -23.4); box(g, 0.04, 2.5, 3.4, scr, 1.3, 1.6, -23.4);
  box(g, 5.4, 0.1, 0.1, trim, -1.4, 0.95, -25.12);                                                   // kick rail
  const screenDoor = box(g, 0.06, 2.1, 0.75, scr, 1.3, 1.35, -24.3); box(g, 0.08, 2.15, 0.06, trim, 1.3, 1.35, -24.68); box(g, 0.08, 2.15, 0.06, trim, 1.3, 1.35, -23.92);
  screenDoor.castShadow = false;
  // sliding glass door from the screened porch into the living room
  box(g, 2.3, 2.3, 0.06, trim, -1.4, 0.3 + 1.15, -21.53);
  box(g, 2.1, 2.15, 0.04, 0x2a2118, -1.4, 0.3 + 1.1, -21.55);
  const glass = mat(0xbfe3f5, { transparent: true, opacity: 0.55, roughness: 0.1 });
  box(g, 1.05, 2.15, 0.05, glass, -0.88, 0.3 + 1.1, -21.6);                                          // fixed half
  const slide = new THREE.Group(); slide.position.set(-1.93, 0.3, -21.66); g.add(slide);
  box(slide, 1.05, 2.15, 0.05, glass, 0, 1.1, 0);
  for (const sx of [-0.5, 0.5]) box(slide, 0.06, 2.15, 0.07, trim, sx, 1.1, 0);
  box(slide, 0.05, 0.4, 0.06, 0x8a8f94, 0.42, 1.1, -0.04);
  g.userData.slider = slide;
  // balcony on top fades out while Dexter is in the screened porch below it
  const deckM = mat(wood, { transparent: true }), deckTrim = mat(trim, { transparent: true });
  g.userData.deckMats = [deckM, deckTrim];
  box(g, 5.9, 0.2, 3.9, deckM, -1.4, 3.15, -23.4);                                                   // balcony deck
  box(g, 5.9, 0.09, 0.1, deckTrim, -1.4, 4.15, -25.3); box(g, 0.1, 0.09, 3.8, deckTrim, -4.3, 4.15, -23.4);
  for (let x = -4.25; x <= 1.5; x += 0.38) box(g, 0.07, 0.9, 0.07, deckTrim, x, 3.7, -25.3);
  for (let z = -25.2; z <= -21.6; z += 0.38) box(g, 0.07, 0.9, 0.07, deckTrim, -4.3, 3.7, z);
  box(g, 0.1, 0.09, 1.3, deckTrim, 1.5, 4.15, -24.65); for (let z = -25.2; z <= -24.1; z += 0.38) box(g, 0.07, 0.9, 0.07, deckTrim, 1.5, 3.7, z);
  box(g, 1.7, 2.3, 1.7, siding, -1.4, 4.4, -21.7); box(g, 1.0, 1.9, 0.1, green, -1.4, 4.25, -22.57);  // balcony door dormer
  for (let i = 0; i < 9; i++) box(g, 0.52, 0.14, 1.25, wood, 1.85 + i * 0.5, 2.95 - i * 0.34, -23.3);   // stairs down
  for (const z of [-23.95, -22.65]) { const r = box(g, 5.3, 0.09, 0.09, trim, 3.9, 2.55, z); r.rotation.z = -0.6; }
  for (const x of [1.6, 5.9]) for (const z of [-23.95, -22.65]) box(g, 0.1, x < 3 ? 4.1 : 1.0, 0.1, trim, x, x < 3 ? 2.05 : 0.5, z);
  return g;
}

/* ---------- Garage, driveway and yard bits ---------- */
// Layout when facing the house: garage + driveway are behind you (south, across the yard),
// the lake is to the right (east), forest and a small side yard to the left (west),
// and the grill is in the open backyard behind the house.
// Garage body: x -2..9, z 16..23, doors on the north face looking at the house.
export function makeYard() {
  const g = new THREE.Group();
  const stucco = 0xd9c7a3, white = 0xf4f4f0, concrete = 0xd6d3cc;
  // driveway slab between the lawn and the garage
  const slab = box(g, 11.6, 0.08, 10.2, concrete, 3.5, 0.04, 11); slab.castShadow = false;
  for (let i = 0; i < 3; i++) { const j = box(g, 0.05, 0.085, 10.2, 0xb9b6ae, 0.6 + i * 2.9, 0.04, 11); j.castShadow = false; }
  // garage
  box(g, 11, 3.4, 7, stucco, 3.5, 1.7, 19.5);
  const rg = new THREE.ConeGeometry(0.7071, 1.7, 4); rg.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(rg, mat(0x6f7f76)); roof.scale.set(12, 1, 8); roof.position.set(3.5, 3.4 + 0.85, 19.5); roof.castShadow = true; g.add(roof);
  for (const x of [0.4, 5.1]) {
    box(g, 4.3, 2.7, 0.12, white, x, 1.35, 15.96);
    for (let i = 1; i < 4; i++) box(g, 4.3, 0.04, 0.14, 0xd8d8d2, x, i * 0.68, 15.95);
  }
  box(g, 0.5, 3.4, 0.2, stucco, 2.75, 1.7, 15.95);
  box(g, 0.95, 2.2, 0.1, white, 8.2, 1.1, 15.97); box(g, 1.8, 0.1, 1.4, concrete, 8.2, 0.05, 15.2); // side door + pad
  // climbing bushes with pink flowers
  for (const x of [2.75, 7.4]) {
    shape(g, new THREE.IcosahedronGeometry(0.85, 0), 0x3f8a4e, x, 2.3, 15.7); shape(g, new THREE.IcosahedronGeometry(0.65, 0), 0x4c9a4a, x + 0.15, 1.1, 15.7);
    box(g, 0.14, 0.14, 0.14, 0xe0457a, x + 0.3, 2.6, 15.2); box(g, 0.14, 0.14, 0.14, 0xe0457a, x - 0.4, 2.0, 15.25);
  }
  // blue recycling bin at the house end of the driveway
  const bin = new THREE.Group();
  const bg = new THREE.CylinderGeometry(0.7071 * 0.95, 0.7071 * 0.75, 1.25, 4); bg.rotateY(Math.PI / 4);
  const body = new THREE.Mesh(bg, mat(0x1f5fd0)); body.position.y = 0.78; body.castShadow = true; bin.add(body);
  box(bin, 1.02, 0.12, 1.05, 0x184fb3, 0, 1.46, 0.02); box(bin, 0.5, 0.08, 0.1, 0x184fb3, 0, 1.5, -0.52);
  box(bin, 0.3, 0.3, 0.02, white, 0, 1.0, 0.46);
  for (const s of [-1, 1]) { const w = shape(bin, new THREE.CylinderGeometry(0.17, 0.17, 0.1, 10), 0x1a1a1a, s * 0.42, 0.17, -0.32); w.rotation.z = Math.PI / 2; }
  bin.position.set(8.4, 0.08, 6.7); bin.rotation.y = 0.3; g.add(bin);
  // Dexter's kiddie pool on the edge of the driveway
  const pool = shape(g, new THREE.CylinderGeometry(1.75, 1.65, 0.38, 18), 0x18a7a7, -0.6, 0.27, 8);
  pool.castShadow = false;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.6, 18), mat(0x7fe3e6, { roughness: 0.15, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(-0.6, 0.475, 8); g.add(water);
  // mailbox where the driveway meets the road
  box(g, 0.12, 1, 0.12, 0x8a6a48, 10.2, 0.5, 11.9); box(g, 0.3, 0.26, 0.5, 0x3f6f8f, 10.2, 1.1, 11.9); box(g, 0.04, 0.2, 0.04, 0xd9342b, 10.38, 1.25, 12.05);

  // side yard (left of the house): green utility box, post and bird bath
  box(g, 1.7, 1.1, 1.2, 0x5d6b4a, -10.5, 0.55, -8.6); box(g, 1.75, 0.08, 1.25, 0x4e5a3e, -10.5, 1.12, -8.6);
  shape(g, new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8), 0x8a9478, -12.4, 0.45, -8);
  shape(g, new THREE.CylinderGeometry(0.12, 0.2, 0.7, 8), 0xb5654a, -13.4, 0.35, -7.2); shape(g, new THREE.CylinderGeometry(0.5, 0.3, 0.14, 10), 0xb5654a, -13.4, 0.75, -7.2);

  // backyard: the grill, on a little paver pad
  const pad = box(g, 2.6, 0.05, 2, 0xb9b6ae, 8, 0.03, -25.6); pad.castShadow = false;
  const grill = new THREE.Group();
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) box(grill, 0.07, 0.8, 0.07, 0x2a2a2a, x, 0.4, z);
  box(grill, 1.1, 0.35, 0.7, 0x1c1c1c, 0, 0.95, 0);
  const lid = shape(grill, new THREE.CylinderGeometry(0.36, 0.36, 1.1, 10, 1, false, 0, Math.PI), 0x8f1d1d, 0, 1.12, 0); lid.rotation.z = Math.PI / 2; lid.rotation.y = Math.PI / 2;
  box(grill, 0.5, 0.05, 0.6, 0x9a7850, -0.82, 0.95, 0); box(grill, 0.6, 0.05, 0.05, 0xcfcfcf, 0, 1.25, 0.42);
  grill.position.set(8, 0.05, -25.6); g.add(grill);

  // red hunting tower, left of the garage at the edge of the forest, with a green transformer crate nearby
  const tower = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = box(tower, 0.18, 5, 0.18, 0x7a5533, sx * 1.0, 2.5, sz * 1.0); leg.rotation.z = -sx * 0.05; leg.rotation.x = sz * 0.05; }
  for (const sz of [-1, 1]) for (const d of [-1, 1]) { const br = box(tower, 0.1, 2.9, 0.1, 0x8a6a48, 0, 2.4, sz * 0.98); br.rotation.z = d * 0.75; }
  for (const sx of [-1, 1]) for (const d of [-1, 1]) { const br = box(tower, 0.1, 2.9, 0.1, 0x8a6a48, sx * 0.98, 2.4, 0); br.rotation.x = d * 0.75; }
  box(tower, 2.6, 0.16, 2.6, 0x8a6a48, 0, 5, 0);
  box(tower, 2.3, 1.9, 2.3, 0xa82a22, 0, 6.0, 0);
  for (const [w, d, x, z] of [[1.7, 0.06, 0, 1.16], [1.7, 0.06, 0, -1.16], [0.06, 1.7, 1.16, 0], [0.06, 1.7, -1.16, 0]]) box(tower, w, 0.45, d, 0x1c1410, x, 6.25, z); // shooting slits
  const tr = new THREE.ConeGeometry(0.7071, 0.8, 4); tr.rotateY(Math.PI / 4);
  const troof = new THREE.Mesh(tr, mat(0x7d1f1a)); troof.scale.set(2.9, 1, 2.9); troof.position.y = 7.35; troof.castShadow = true; tower.add(troof);
  for (const sx of [-1, 1]) { const rail = box(tower, 0.08, 5.3, 0.08, 0x9a7850, sx * 0.3, 2.5, 1.75); rail.rotation.x = 0.2; }
  for (let i = 0; i < 10; i++) box(tower, 0.6, 0.06, 0.06, 0x9a7850, 0, 0.4 + i * 0.5, 2.25 - i * 0.1);
  tower.position.set(-10.5, 0, 17.5); tower.rotation.y = 0.35; g.add(tower);
  box(g, 2.0, 0.08, 1.7, 0xb9b6ae, -7.4, 0.04, 20.4);
  box(g, 1.6, 1.25, 1.25, 0x4f6b45, -7.4, 0.7, 20.4); box(g, 1.66, 0.08, 1.31, 0x415a39, -7.4, 1.35, 20.4);
  box(g, 0.3, 0.3, 0.02, 0xf2c230, -7.4, 0.85, 19.76); box(g, 0.5, 0.06, 0.03, 0x2a2a2a, -7.0, 1.05, 19.76);

  // by the lake: mini white dog house, campfire, picnic table and the chicken coop
  const dh = new THREE.Group();
  box(dh, 1.5, 1.0, 1.7, 0xf6f6f2, 0, 0.5, 0);
  const dr = new THREE.Shape(); dr.moveTo(-0.95, 0); dr.lineTo(0.95, 0); dr.lineTo(0, 0.75); dr.closePath();
  const dRoof = new THREE.Mesh(new THREE.ExtrudeGeometry(dr, { depth: 1.9, bevelEnabled: false }), mat(0xe9e9e4)); dRoof.position.set(0, 1.0, -0.95); dRoof.castShadow = true; dh.add(dRoof);
  box(dh, 0.65, 0.7, 0.06, 0x23201c, 0, 0.36, 0.86); box(dh, 0.5, 0.14, 0.04, 0x3f6f8f, 0, 0.88, 0.87);
  dh.position.set(11.3, 0, -11.5); dh.rotation.y = -0.5; g.add(dh);
  const fire = new THREE.Group();
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const r = makeRock(0.4); r.position.set(Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75); fire.add(r); }
  for (let i = 0; i < 3; i++) { const l = shape(fire, new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), 0x5a3c22, 0, 0.14, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; }
  const flameM = mat(0xff9a2e, { emissive: 0xff5a00, emissiveIntensity: 1.6 });
  const flames = [];
  for (let i = 0; i < 3; i++) flames.push(shape(fire, new THREE.ConeGeometry(0.22 - i * 0.05, 0.7 - i * 0.12, 5), i === 2 ? mat(0xffe27a, { emissive: 0xffc400, emissiveIntensity: 1.8 }) : flameM, (i - 1) * 0.16, 0.5, (i % 2) * 0.12));
  for (const f of flames) f.castShadow = false;
  fire.position.set(10.6, 0, -7.2); g.add(fire);
  for (const [x, z, ry] of [[9.1, -6.4, 0.9], [11.2, -5.6, -0.3]]) { const log = shape(g, new THREE.CylinderGeometry(0.25, 0.25, 1.4, 8), 0x7a5533, x, 0.25, z); log.rotation.z = Math.PI / 2; log.rotation.y = ry; } // log seats
  const table = new THREE.Group();
  box(table, 2.4, 0.1, 1.1, 0xa9825a, 0, 0.85, 0);
  for (const s of [-1, 1]) { box(table, 2.4, 0.08, 0.35, 0x9a7850, 0, 0.5, s * 0.85); for (const x of [-0.9, 0.9]) { const leg = box(table, 0.1, 0.95, 0.1, 0x8a6a48, x, 0.42, s * 0.45); leg.rotation.x = s * 0.5; } }
  table.position.set(14, 0, -4.2); table.rotation.y = 0.25; g.add(table);
  box(g, 1.8, 1.3, 1.6, 0xb5382c, 21, 0.85, -2.6); box(g, 2.1, 0.14, 1.9, 0xf2ede4, 21, 1.56, -2.6); box(g, 0.5, 0.6, 0.06, 0x3a241a, 21, 0.55, -1.79);
  for (const [x, z] of [[20.3, -1.9], [21.7, -1.9], [20.3, -3.3], [21.7, -3.3]]) box(g, 0.1, 0.3, 0.1, 0x8a6a48, x, 0.15, z);
  // a little dock into the lake
  box(g, 1.3, 0.12, 4, 0xa9825a, 17, 0.3, -7.4); for (const [x, z] of [[16.45, -8.9], [17.55, -8.9], [16.45, -6]]) box(g, 0.14, 0.7, 0.14, 0x7a5533, x, 0.15, z);
  g.userData.flames = flames;
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
