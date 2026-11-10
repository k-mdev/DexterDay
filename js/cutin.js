// Attack banner portrait: a detailed, smooth-shaded 3D model of Dexter's head rendered
// from an isometric three-quarter angle and animated per move. It has its own tiny
// renderer so it can sit inside the HTML banner on top of the game canvas.
import * as THREE from 'three';

let R = null; // { renderer, scene, camera, parts }

function build() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(300, 300, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  // isometric: orthographic camera looking down from the front-right
  const camera = new THREE.OrthographicCamera(-1.35, 1.35, 1.4, -1.3, 0.1, 30);
  camera.position.set(3.2, 2.6, 4.2);
  camera.lookAt(0, -0.18, 0.25);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 3.2); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db8ff, 2.4); rim.position.set(-4, 2.5, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(-2, 0, 5); scene.add(fill);

  const fur = new THREE.MeshPhysicalMaterial({ color: 0x15151a, roughness: 0.46, sheen: 1, sheenColor: new THREE.Color(0x6a6a80), sheenRoughness: 0.45 });
  const furSoft = new THREE.MeshPhysicalMaterial({ color: 0x1d1d24, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x77778c), sheenRoughness: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8d8d92, roughness: 0.7 });
  const wet = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ec, roughness: 0.1, clearcoat: 1 });
  const irisM = new THREE.MeshPhysicalMaterial({ color: 0x7a4315, roughness: 0.15, clearcoat: 1, emissive: 0x2a1404, emissiveIntensity: 0.6 });
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xe8788c, roughness: 0.3, clearcoat: 0.6 });
  const gum = new THREE.MeshStandardMaterial({ color: 0x4a0f1a, roughness: 0.5 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xf4f0e2, roughness: 0.3 });
  const water = new THREE.MeshPhysicalMaterial({ color: 0xbfe9ff, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1 });
  const boneM = new THREE.MeshStandardMaterial({ color: 0xefdcae, roughness: 0.6 });

  const sph = (parent, r, x, y, z, sx = 1, sy = 1, sz = 1, m = fur) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), m);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group(); scene.add(root);
  // neck, chest blaze, collar
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.7, 8, 24), fur); neck.position.set(0, -0.85, -0.22); neck.rotation.x = 0.35; root.add(neck);
  sph(root, 0.2, 0, -1.2, 0.2, 0.7, 1.6, 0.5, new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7 }));
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.065, 12, 40), new THREE.MeshStandardMaterial({ color: 0xc7362b, roughness: 0.55 }));
  collar.position.set(0, -0.62, -0.1); collar.rotation.x = Math.PI / 2 + 0.35; root.add(collar);
  sph(root, 0.075, 0, -0.86, 0.3, 1, 1, 0.35, new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.8, roughness: 0.25 }));

  const head = new THREE.Group(); root.add(head);
  sph(head, 0.5, 0, 0, 0, 1, 0.95, 1.05);                         // skull
  sph(head, 0.3, 0, 0.1, 0.3, 1.15, 0.8, 1);                      // forehead / stop
  for (const s of [-1, 1]) sph(head, 0.27, s * 0.3, -0.13, 0.14, 1, 1, 1.1, furSoft); // cheeks
  sph(head, 0.25, 0, -0.09, 0.62, 1.0, 0.72, 1.75, furSoft);      // muzzle
  for (const s of [-1, 1]) sph(head, 0.17, s * 0.14, -0.2, 0.74, 1, 1.05, 1.6, furSoft); // flews
  sph(head, 0.105, 0, -0.02, 1.06, 1.3, 0.9, 0.9, wet);           // nose
  for (const s of [-1, 1]) sph(head, 0.028, s * 0.055, -0.03, 1.15, 1, 0.8, 0.5, new THREE.MeshStandardMaterial({ color: 0x000000 }));
  for (let i = 0; i < 6; i++) {                                    // upper teeth
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, i % 5 === 0 ? 0.13 : 0.07, 10), tooth);
    t.position.set((i - 2.5) * 0.055, -0.3, 0.95 - Math.abs(i - 2.5) * 0.04); t.rotation.x = Math.PI; head.add(t);
  }

  // lower jaw (pivots open), mouth interior, tongue
  const jaw = new THREE.Group(); jaw.position.set(0, -0.22, 0.18); head.add(jaw);
  sph(jaw, 0.2, 0, -0.09, 0.5, 0.95, 0.5, 1.75, furSoft);
  sph(jaw, 0.13, 0, -0.12, 0.8, 1.05, 0.6, 1, grey);              // the grey chin
  sph(jaw, 0.17, 0, -0.03, 0.45, 0.85, 0.28, 1.6, gum);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.026, i % 5 === 0 ? 0.11 : 0.055, 10), tooth);
    t.position.set((i - 2.5) * 0.05, 0.03, 0.8 - Math.abs(i - 2.5) * 0.04); jaw.add(t);
  }
  const tongue = new THREE.Group(); tongue.position.set(0, 0.0, 0.42); jaw.add(tongue);
  const tongueMesh = sph(tongue, 0.13, 0, 0, 0.26, 0.85, 0.2, 2.0, pink);
  const bone = new THREE.Group(); bone.position.set(0, 0.06, 0.78); jaw.add(bone);
  const bm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.5, 6, 14), boneM); bm.rotation.z = Math.PI / 2; bone.add(bm);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) sph(bone, 0.08, sx * 0.3, 0, sz * 0.05, 1, 1, 1, boneM);

  // eyes with lids and brows
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * 0.21, 0.11, 0.41); head.add(e);
    sph(e, 0.088, 0, 0, 0, 1, 1, 1, white);
    const look = new THREE.Group(); e.add(look);
    sph(look, 0.062, 0, 0, 0.04, 1, 1, 0.75, irisM);
    sph(look, 0.03, 0, 0, 0.075, 1, 1, 0.6, wet);
    sph(look, 0.012, 0.022, 0.028, 0.092, 1, 1, 0.5, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.096, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fur); e.add(lid);
    const brow = sph(head, 0.075, s * 0.21, 0.26, 0.4, 1.7, 0.55, 0.9);
    const tear = sph(e, 0.035, s * 0.02, -0.12, 0.06, 1, 1.4, 1, water);
    eyes.push({ look, lid, brow, tear, s });
  }
  // ears
  const ears = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 0.42, 0.24, -0.06); head.add(p);
    sph(p, 0.27, s * 0.07, -0.34, 0.06, 0.3, 1.25, 0.95);
    ears.push(p);
  }
  // drool
  const drops = [];
  for (let i = 0; i < 5; i++) drops.push(sph(root, 0.04, 0, 0, 0, 1, 1.6, 1, water));

  R = { renderer, scene, camera, canvas, P: { root, head, jaw, tongue, tongueMesh, bone, eyes, ears, drops } };
}

function pose(kind, t, k) {
  const { root, head, jaw, tongue, tongueMesh, bone, eyes, ears, drops } = R.P;
  // neutral
  root.rotation.set(0, 0, 0); root.position.set(0, 0, 0); head.rotation.set(0, 0, 0);
  jaw.rotation.x = 0.04; tongue.rotation.set(0, 0, 0); tongue.scale.set(1, 1, 1); tongueMesh.visible = true;
  bone.visible = false;
  for (const e of eyes) { e.look.rotation.set(0, 0, 0); e.lid.rotation.x = -1.15; e.brow.position.y = 0.26; e.brow.rotation.z = 0; e.tear.visible = false; }
  ears.forEach((p, i) => { p.rotation.set(0, 0, (i ? 1 : -1) * 0.12); });
  for (const d of drops) d.visible = false;
  const ease = Math.min(1, t * 4);

  if (kind === 'bark') {
    const open = Math.max(0, Math.sin(t * 17)) ** 0.6;
    jaw.rotation.x = 0.1 + open * 0.75;
    root.position.z = open * 0.14; root.rotation.x = -0.12 - open * 0.12;
    tongue.rotation.x = 0.1; tongue.scale.z = 0.8;
    for (const e of eyes) { e.lid.rotation.x = -0.75; e.brow.position.y = 0.22; e.brow.rotation.z = -e.s * 0.55; }
    ears.forEach((p, i) => { p.rotation.z = (i ? 1 : -1) * (0.15 + open * 0.55); p.rotation.x = -open * 0.3; });
  } else if (kind === 'slobber') {
    jaw.rotation.x = 0.45 + Math.sin(t * 6) * 0.08;
    tongue.rotation.x = 0.95 + Math.sin(t * 9) * 0.18; tongue.rotation.z = Math.sin(t * 7) * 0.3; tongue.scale.set(1.1, 1, 1.7);
    root.rotation.z = Math.sin(t * 5) * 0.08; root.rotation.x = -0.05;
    for (const e of eyes) { e.lid.rotation.x = -0.45; e.brow.position.y = 0.28; }
    drops.forEach((d, i) => {
      const f = (t * 1.3 + i * 0.21) % 1;
      d.visible = true; d.position.set(Math.sin(i * 2.3) * 0.16, -0.5 - f * 1.0, 0.95 + Math.cos(i * 1.7) * 0.12); d.scale.set(1, 1.2 + f * 1.4, 1);
    });
  } else if (kind === 'whine' || kind === 'bribe') {
    root.rotation.x = (kind === 'bribe' ? 0.2 + k * 0.22 : 0.26) * ease; root.rotation.z = 0.14 * ease;
    root.position.x = Math.sin(t * 46) * 0.006;
    jaw.rotation.x = 0.07 + Math.sin(t * 38) * 0.02;
    for (const e of eyes) { e.look.rotation.x = -0.4 * ease; e.lid.rotation.x = -1.25; e.brow.position.y = 0.3; e.brow.rotation.z = e.s * 0.6 * ease; e.tear.visible = true; e.tear.position.y = -0.1 - ((t * 0.7) % 1) * 0.35; }
    ears.forEach((p, i) => { p.rotation.z = (i ? 1 : -1) * 0.02; p.rotation.x = 0.25; });
    if (kind === 'bribe') { bone.visible = true; tongueMesh.visible = false; jaw.rotation.x = 0.22; }
  } else if (kind === 'treat') {
    jaw.rotation.x = 0.12 + Math.abs(Math.sin(t * 15)) * 0.4;
    bone.visible = true; tongueMesh.visible = false;
    root.rotation.z = Math.sin(t * 15) * 0.04; root.rotation.x = -0.1;
    for (const e of eyes) e.lid.rotation.x = -0.4;
  } else { // duh: the classic head tilt, eyes pointing wherever
    root.rotation.z = 0.55 * ease + Math.sin(t * 2) * 0.03;
    jaw.rotation.x = 0.2;
    tongue.rotation.y = 0.85; tongue.rotation.x = 0.35; tongue.scale.z = 1.35;
    eyes[0].look.rotation.set(-0.35, -0.35, 0); eyes[1].look.rotation.set(0.25, 0.4, 0);
    const blink = k > 0.5 && k < 0.6 ? 0.4 : -1.1;
    eyes[0].lid.rotation.x = blink; eyes[1].lid.rotation.x = -0.85;
    eyes[0].brow.position.y = 0.33; eyes[1].brow.position.y = 0.24;
    ears[1].rotation.z = -0.9 * ease; ears[0].rotation.z = -0.25;
  }
}

/** Show and animate the portrait inside `host` for `ms` milliseconds. Returns false if WebGL is unavailable. */
export function playCutin(kind, host, ms) {
  try {
    if (!R) build();
  } catch (e) {
    console.warn('Cut-in portrait unavailable:', e);
    R = null;
    return false;
  }
  host.replaceChildren(R.canvas);
  const t0 = performance.now();
  const step = () => {
    const el = performance.now() - t0;
    pose(kind, el / 1000, Math.min(1, el / ms));
    R.renderer.render(R.scene, R.camera);
    if (el < ms && R.canvas.isConnected) setTimeout(step, 16);
  };
  step();
  return true;
}
