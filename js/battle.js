// Turn-based "confidence" battles. Nobody gets hurt; the loser just slinks off embarrassed.
import { sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function tween(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      fn(k);
      if (k < 1) setTimeout(step, 16); else res();
    };
    step();
  });
}

export const RIVALS = {
  taco: {
    name: 'Peanut', breed: 'Chihuahua', hp: 15, atk: 4, speed: 5.2, xp: 9, cry: 'yap',
    intro: 'Peanut is vibrating with rage!',
    moves: [
      { name: 'Yap Yap Yap', power: 5, acc: 0.95, text: 'It never stops.' },
      { name: 'Ankle Nip', power: 7, acc: 0.8, text: 'Right on the dewclaw!' },
    ],
  },
  pug: {
    name: 'Otis', breed: 'Pug', hp: 23, atk: 5, speed: 3.6, xp: 12, cry: 'bark',
    intro: 'Otis wheezes menacingly.',
    moves: [
      { name: 'Snort', power: 5, acc: 0.95, text: 'Moist.' },
      { name: 'Sit On', power: 8, acc: 0.75, text: 'Surprisingly dense!' },
    ],
  },
  corgi: {
    name: 'Maggie', breed: 'Corgi', hp: 27, atk: 6, speed: 4.6, xp: 15, cry: 'bark',
    intro: 'Maggie wants to herd you somewhere worse.',
    moves: [
      { name: 'Butt Bump', power: 7, acc: 0.9, text: 'Fluffy but forceful.' },
      { name: 'Herd', power: 5, acc: 1, text: 'Dexter gets bossed around.', debuff: true },
    ],
  },
  poodle: {
    name: 'Bella', breed: 'Poodle', hp: 30, atk: 7, speed: 4.8, xp: 18, cry: 'yap',
    intro: 'Bella looks at Dexter like he is a stain.',
    moves: [
      { name: 'Sass', power: 6, acc: 1, text: 'The judgment stings.' },
      { name: 'Prance Kick', power: 9, acc: 0.8, text: 'Elegant. Painful.' },
    ],
  },
  husky: {
    name: 'Koda', breed: 'Husky', hp: 40, atk: 8, speed: 5.5, xp: 28, cry: 'bark',
    intro: 'Koda screams about nothing in particular.',
    moves: [
      { name: 'Dramatic Howl', power: 4, acc: 1, text: 'AWOOOOO! Dexter is rattled.', debuff: true },
      { name: 'Tackle', power: 9, acc: 0.85, text: 'A wall of fur!' },
    ],
  },
  raccoon: {
    name: 'Bandit', breed: 'Raccoon', hp: 24, atk: 7, speed: 5.0, xp: 20, cry: 'yap', snatchy: true,
    intro: 'Bandit rubs his tiny hands together.',
    moves: [
      { name: 'Trash Toss', power: 8, acc: 0.85, text: 'A banana peel to the face!' },
      { name: 'Hiss', power: 5, acc: 1, text: 'Unsettling.' },
    ],
  },
};

const DUH_LINES = [
  'Dexter stares at a leaf.', 'Dexter forgets why he is here.', 'Dexter tilts his head. Nothing is going on in there.',
  'Dexter looks behind him for the dog everyone is mad at.',
];

/* ---------- Attack cut-in: Dexter's face, one expression per move ---------- */
function dexFace(kind) {
  const fur = '#26262d', dark = '#17171b';
  const eye = (cx, cy, r = 13, ir = 8, dx = 0, dy = 0) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${ir}" fill="#7a4215"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${ir / 2}" fill="#0a0a0a"/><circle cx="${cx + dx - ir / 3}" cy="${cy + dy - ir / 3}" r="${ir / 4}" fill="#fff"/>`;
  const brow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0a0a0a" stroke-width="7" stroke-linecap="round"/>`;
  let eyes = '', mouth = '', extra = '', earTilt = 0;
  if (kind === 'bark') {
    eyes = eye(72, 76, 12, 7) + eye(128, 76, 12, 7) + brow(52, 54, 88, 66) + brow(148, 54, 112, 66);
    mouth = '<ellipse cx="100" cy="143" rx="24" ry="22" fill="#5a1220"/><ellipse cx="100" cy="155" rx="15" ry="9" fill="#f08a9c"/><path d="M80 128 l6 10 l6 -10 M108 128 l6 10 l6 -10" fill="#fff"/>';
    extra = [[-10, 120, -42, 112], [-8, 145, -44, 150], [-4, 168, -36, 184], [210, 120, 242, 112], [208, 145, 244, 150], [204, 168, 236, 184]]
      .map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`).join('');
    earTilt = 22;
  } else if (kind === 'slobber') {
    eyes = '<path d="M58 80 q14 -18 28 0 M114 80 q14 -18 28 0" stroke="#0a0a0a" stroke-width="7" fill="none" stroke-linecap="round"/>';
    mouth = '<path d="M72 132 q28 22 56 0" stroke="#0a0a0a" stroke-width="5" fill="#5a1220"/><rect x="86" y="134" width="30" height="62" rx="15" fill="#f08a9c"/><line x1="101" y1="140" x2="101" y2="182" stroke="#d96a80" stroke-width="3"/>';
    extra = [[60, 170, 9], [140, 176, 11], [42, 140, 7], [162, 146, 8], [118, 206, 9], [78, 208, 7]]
      .map(([x, y, r]) => `<path d="M${x} ${y - r * 1.8} q${r * 1.3} ${r * 1.9} 0 ${r * 2.6} q${-r * 1.3} ${-r * 0.7} 0 ${-r * 2.6}" fill="#9fe3ff" stroke="#fff" stroke-width="2"/>`).join('');
  } else if (kind === 'whine' || kind === 'bribe') {
    eyes = eye(70, 80, 19, 14, 0, 2) + eye(130, 80, 19, 14, 0, 2) + brow(50, 62, 84, 50) + brow(150, 62, 116, 50)
      + '<circle cx="76" cy="74" r="4" fill="#fff"/><circle cx="136" cy="74" r="4" fill="#fff"/>';
    mouth = '<path d="M84 142 q8 -8 16 0 q8 8 16 0" stroke="#0a0a0a" stroke-width="5" fill="none" stroke-linecap="round"/>';
    extra = '<path d="M52 100 q8 14 0 22 q-8 -8 0 -22" fill="#9fe3ff"/><path d="M148 100 q8 14 0 22 q-8 -8 0 -22" fill="#9fe3ff"/>';
    if (kind === 'bribe') extra += '<g transform="translate(100 186) rotate(-12)"><rect x="-26" y="-7" width="52" height="14" rx="6" fill="#f0dcae"/><circle cx="-28" cy="-7" r="8" fill="#f0dcae"/><circle cx="-28" cy="7" r="8" fill="#f0dcae"/><circle cx="28" cy="-7" r="8" fill="#f0dcae"/><circle cx="28" cy="7" r="8" fill="#f0dcae"/></g>';
    earTilt = -8;
  } else if (kind === 'treat') {
    eyes = '<path d="M58 80 q14 -18 28 0 M114 80 q14 -18 28 0" stroke="#0a0a0a" stroke-width="7" fill="none" stroke-linecap="round"/>';
    mouth = '<ellipse cx="100" cy="142" rx="20" ry="14" fill="#5a1220"/><g transform="translate(100 142) rotate(8)"><rect x="-24" y="-6" width="48" height="12" rx="6" fill="#f0dcae"/><circle cx="-25" cy="-6" r="7" fill="#f0dcae"/><circle cx="-25" cy="6" r="7" fill="#f0dcae"/><circle cx="25" cy="-6" r="7" fill="#f0dcae"/><circle cx="25" cy="6" r="7" fill="#f0dcae"/></g>';
  } else { // duh
    eyes = eye(70, 76, 15, 7, -6, -6) + eye(130, 78, 11, 6, 5, 5);
    mouth = '<path d="M80 138 q20 8 40 -2" stroke="#0a0a0a" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="112" y="132" width="20" height="34" rx="10" fill="#f08a9c" transform="rotate(-28 122 132)"/>';
    extra = '<text x="150" y="42" font-size="50" font-weight="900" fill="#fff" stroke="#23263a" stroke-width="3">?</text><text x="22" y="34" font-size="34" font-weight="900" fill="#fff" stroke="#23263a" stroke-width="3">?</text>';
    earTilt = 10;
  }
  return `<svg viewBox="-20 0 240 220" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="42" cy="98" rx="24" ry="52" fill="${dark}" transform="rotate(${14 + earTilt} 48 56)"/>
    <ellipse cx="158" cy="98" rx="24" ry="52" fill="${dark}" transform="rotate(${-14 - earTilt} 152 56)"/>
    <ellipse cx="100" cy="92" rx="62" ry="60" fill="${fur}"/>
    <ellipse cx="100" cy="130" rx="40" ry="33" fill="#30303a"/>
    <ellipse cx="100" cy="158" rx="22" ry="9" fill="#8a8a8c"/>
    ${mouth}
    <ellipse cx="100" cy="110" rx="15" ry="11" fill="#0a0a0a"/><ellipse cx="96" cy="106" rx="5" ry="3" fill="#555"/>
    ${eyes}${extra}
    <path d="M52 176 q48 26 96 0 l0 14 q-48 26 -96 0 z" fill="#c7362b"/><circle cx="100" cy="204" r="9" fill="#f2c230"/>
  </svg>`;
}

/**
 * ctx: { state, enemy, dexMesh, foeMesh, project(obj)->{x,y}, refresh(), friend, cam:{shot,shake}, glitch() }
 * state: { hp, maxHp, atk, level, carried }   enemy: { key, name, level, hp, maxHp, atk, loot }
 * resolves 'win' | 'lose' | 'run' | 'bribe'
 */
export async function runBattle(ctx) {
  const { state: S, enemy: E, dexMesh, foeMesh, cam } = ctx;
  const def = RIVALS[E.key];
  const B = { pAtk: 0, eAtk: 0, eAcc: 0, confused: 0 };
  const ui = $('battle'), textEl = $('b-text'), menu = $('b-menu'), pops = $('b-popups');
  const dexHome = dexMesh.position.clone(), foeHome = foeMesh.position.clone();

  const refresh = () => {
    $('be-name').textContent = `${E.name} the ${def.breed}`;
    $('be-lvl').textContent = `Lv${E.level}`;
    $('bp-lvl').textContent = `Lv${S.level}`;
    const eh = $('be-hp'), ph = $('bp-hp');
    eh.style.width = `${Math.max(0, E.hp / E.maxHp) * 100}%`;
    ph.style.width = `${Math.max(0, S.hp / S.maxHp) * 100}%`;
    eh.classList.toggle('low', E.hp / E.maxHp < 0.3);
    ph.classList.toggle('low', S.hp / S.maxHp < 0.3);
    $('bp-hp-text').textContent = `${Math.max(0, Math.ceil(S.hp))}/${S.maxHp}`;
    $('bp-treats').textContent = `🦴 ${S.carried}`;
    const st = [];
    if (B.eAcc) st.push(`Slobbered ×${B.eAcc}`);
    if (B.eAtk) st.push(`Guilty ×${-B.eAtk}`);
    if (B.confused) st.push('Confused');
    $('be-status').textContent = st.join(' · ');
    ctx.refresh();
  };

  let skip = null;
  const onSkip = () => skip && skip();
  const onKey = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onSkip(); }
    const n = '1234567'.indexOf(e.key);
    if (n >= 0 && !menu.classList.contains('hidden')) menu.querySelectorAll('button')[n].click();
  };
  textEl.addEventListener('click', onSkip);
  window.addEventListener('keydown', onKey);

  const say = (text, ms = 1500) => new Promise((res) => {
    textEl.textContent = text;
    let done = false;
    const fin = () => { if (done) return; done = true; skip = null; clearTimeout(tm); res(); };
    const tm = setTimeout(fin, ms);
    setTimeout(() => { if (!done) skip = fin; }, 220);
  });

  /* ---- visual helpers ---- */
  const popup = (text, target, cls = '') => {
    const p = ctx.project(target);
    const el = document.createElement('div');
    el.className = `pop ${cls}`; el.textContent = text;
    el.style.left = `${p.x + rand(-20, 20)}px`; el.style.top = `${p.y - 30}px`;
    pops.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  };
  // emoji that fly from one fighter to the other (or just burst upward if `to` is null)
  const particles = (emoji, from, to, n = 6, spread = 60) => {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const a = ctx.project(from), b = to ? ctx.project(to) : { x: a.x + rand(-spread, spread) * 2, y: a.y - rand(60, 170) };
        const el = document.createElement('div');
        el.className = 'part'; el.textContent = Array.isArray(emoji) ? pick(emoji) : emoji;
        el.style.left = `${a.x + rand(-20, 20)}px`; el.style.top = `${a.y + rand(-10, 30)}px`;
        pops.appendChild(el);
        setTimeout(() => {
          el.style.left = `${b.x + rand(-spread, spread)}px`; el.style.top = `${b.y + rand(-spread, spread) + 40}px`;
          el.style.scale = to ? '1.5' : '0.6'; el.style.opacity = to ? '1' : '0';
        }, 30);
        setTimeout(() => el.remove(), 620);
      }, i * 55);
    }
  };
  const rings = (target, n = 3, color = '#fff') => {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const p = ctx.project(target);
      const el = document.createElement('div');
      el.className = 'ring'; el.style.left = `${p.x}px`; el.style.top = `${p.y + 50}px`; el.style.borderColor = color;
      pops.appendChild(el); setTimeout(() => el.remove(), 620);
    }, i * 130);
  };
  const cutin = async (kind, label, color) => {
    const wrap = $('b-cutin'), band = wrap.firstElementChild;
    $('ci-face').innerHTML = dexFace(kind);
    $('ci-name').textContent = label;
    band.style.setProperty('--ci', color);
    wrap.classList.remove('hidden');
    band.style.animation = 'none'; void band.offsetWidth; band.style.animation = '';
    sfx.cutin();
    await wait(930);
    wrap.classList.add('hidden');
  };
  const cine = (on) => ui.classList.toggle('cine', on);

  const lunge = (mesh, home, toward, amt = 1.4) => tween(320, (k) => {
    const s = Math.sin(k * Math.PI);
    mesh.position.lerpVectors(home, toward, s * amt / home.distanceTo(toward));
    mesh.position.y = home.y + s * 0.35;
  });
  const shake = (mesh, home) => tween(350, (k) => {
    mesh.position.x = home.x + Math.sin(k * 40) * 0.12 * (1 - k);
    mesh.rotation.z = Math.sin(k * 30) * 0.2 * (1 - k);
  });
  const wobble = (mesh) => tween(700, (k) => { mesh.userData.head.rotation.z = Math.sin(k * Math.PI * 4) * 0.6 * (1 - k); });
  const spin = (mesh) => { const y0 = mesh.rotation.y; return tween(500, (k) => { mesh.rotation.y = y0 + k * Math.PI * 2; }); };

  const choose = () => new Promise((res) => {
    cam.shot(pick(['wide', 'wide', 'side']), false);
    menu.classList.remove('hidden');
    menu.querySelector('[data-move="treat"]').disabled = S.carried < 1 || S.hp >= S.maxHp;
    menu.querySelector('[data-move="bribe"]').disabled = S.carried < 1;
    textEl.textContent = 'What will Dexter do?';
    const handler = (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      menu.removeEventListener('click', handler);
      menu.classList.add('hidden');
      res(b.dataset.move);
    };
    menu.addEventListener('click', handler);
  });

  const hitFoe = async (power, label) => {
    let dmg = power * (S.atk / 6) * (1 + 0.25 * B.pAtk) * rand(0.85, 1.15);
    const crit = Math.random() < 0.1;
    if (crit) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    E.hp -= dmg;
    sfx.hit(); popup(`-${dmg}`, foeMesh, 'dmg'); particles('💥', foeMesh, null, 3, 30);
    cam.shake(crit ? 0.9 : 0.5);
    await shake(foeMesh, foeHome); refresh();
    if (crit) await say('A critical embarrassment!', 900);
    if (label) await say(label, 1000);
  };

  const playerTurn = async (move) => {
    cine(true);
    cam.shot('dex');
    if (move === 'bark') {
      textEl.textContent = 'Dexter used BARK!';
      await cutin('bark', 'BARK!', '#ff8a3c');
      cam.shot('overDex');
      sfx.barkBig(); popup('WOOF!', dexMesh, 'fx');
      rings(foeMesh, 4);
      await lunge(dexMesh, dexHome, foeHome, 0.8);
      cam.shot('foe');
      if (Math.random() < 0.95) await hitFoe(8); else { sfx.miss(); await say('He barked at a tree instead.'); }
    } else if (move === 'slobber') {
      textEl.textContent = 'Dexter used SLOBBER!';
      await cutin('slobber', 'SLOBBER!', '#5db7ff');
      cam.shot('overDex');
      sfx.splat(); particles(['💦', '💧'], dexMesh, foeMesh, 10, 45);
      await lunge(dexMesh, dexHome, foeHome, 1.6);
      await wait(250);
      cam.shot('foe');
      await hitFoe(4);
      if (B.eAcc < 3) { B.eAcc++; refresh(); await say(`${E.name} is covered in drool and can't see straight!`); }
      else await say(`${E.name} cannot possibly get any wetter.`);
    } else if (move === 'whine') {
      textEl.textContent = 'Dexter used WHINE...';
      await cutin('whine', 'WHINE...', '#b79cff');
      sfx.whimper(); particles(['🥺', '💧', '🎵'], dexMesh, null, 7, 50);
      await wobble(dexMesh);
      cam.shot('foe');
      particles('💔', foeMesh, null, 3, 30);
      if (B.eAtk > -3) { B.eAtk--; refresh(); await say(`${E.name} feels kind of bad about this. Attack fell!`); }
      else await say(`${E.name} is already drowning in guilt.`);
    } else if (move === 'duh') {
      textEl.textContent = 'Dexter used DUH.';
      await cutin('duh', 'DUH.', '#8fdc6a');
      sfx.derp(); particles(['❓', '❔', '💫'], dexMesh, null, 7, 60);
      await spin(dexMesh);
      const r = Math.random();
      if (r < 0.32) {
        cam.shot('foe');
        B.confused = 2; refresh(); particles('❓', foeMesh, null, 5, 40);
        await say(`${pick(DUH_LINES)} ${E.name} is deeply confused!`, 1900);
      } else if (r < 0.57) {
        cam.shot('side');
        await say('Dexter trips over his own paws...', 1000);
        await lunge(dexMesh, dexHome, foeHome, 2.2);
        cam.shot('foe');
        await hitFoe(15, '...and headbutts them by accident!');
      } else if (r < 0.77) {
        const heal = Math.round(S.maxHp * 0.3);
        S.hp = Math.min(S.maxHp, S.hp + heal);
        sfx.chomp(); sfx.heal(); popup(`+${heal}`, dexMesh, 'heal'); refresh();
        await say('Dexter finds an old treat stuck in his fur. Delicious!');
      } else {
        await say(`${pick(DUH_LINES)} Nothing happens.`, 1700);
      }
    } else if (move === 'treat') {
      textEl.textContent = 'Dexter eats a treat!';
      await cutin('treat', 'NOM!', '#ffd76a');
      S.carried--;
      const heal = Math.round(S.maxHp * 0.45);
      S.hp = Math.min(S.maxHp, S.hp + heal);
      sfx.chomp(); sfx.heal(); popup(`+${heal}`, dexMesh, 'heal'); particles('✨', dexMesh, null, 6, 50); refresh();
      await say('Dexter inhales a treat without chewing. Confidence restored!');
    }
    cine(false);
  };

  const enemyTurn = async () => {
    cam.shot('foe');
    if (B.confused > 0) {
      B.confused--; refresh();
      particles('❓', foeMesh, null, 3, 40);
      await say(`${E.name} is still trying to work out what Dexter is doing.`);
      return;
    }
    const acc = 1 - 0.17 * B.eAcc;
    const snatchChance = S.carried > 0 ? (def.snatchy ? 0.45 : 0.2) : 0;
    if (Math.random() < snatchChance) {
      await say(`${E.name} used SNATCH!`, 700);
      cam.shot('overFoe'); sfx.swipe();
      await lunge(foeMesh, foeHome, dexHome, 1.6);
      if (Math.random() < acc) {
        S.carried--; E.loot++;
        popup('-1 🦴', dexMesh, 'dmg'); particles('🦴', dexMesh, foeMesh, 1, 10); sfx.miss(); refresh();
        cam.shot('dex');
        await say(`${E.name} swiped a treat right out of Dexter's mouth!`);
      } else await say(`${E.name} slipped on the slobber and missed!`);
      return;
    }
    const m = pick(def.moves);
    await say(`${E.name} used ${m.name.toUpperCase()}!`, 700);
    cam.shot('overFoe');
    sfx[def.cry](); sfx.swipe();
    await lunge(foeMesh, foeHome, dexHome, 1.4);
    if (Math.random() > m.acc * acc) {
      sfx.miss();
      await say(B.eAcc ? `${E.name} slipped on the slobber and missed!` : `${E.name} missed!`);
      return;
    }
    let dmg = m.power * (E.atk / 6) * (1 + 0.2 * B.eAtk) * rand(0.85, 1.15);
    dmg = Math.max(1, Math.round(dmg));
    S.hp -= dmg;
    cam.shot('dex');
    sfx.hit(); popup(`-${dmg}`, dexMesh, 'dmg'); particles('💥', dexMesh, null, 3, 30);
    cam.shake(0.6);
    ctx.glitch(); // Dexter briefly loses his composure (and his muscles)
    await shake(dexMesh, dexHome); refresh();
    if (m.debuff && B.pAtk > -2) { B.pAtk--; await say(`${m.text} Dexter's attack fell!`); }
    else await say(m.text, 1000);
  };

  // --- intro ---
  $('b-flash').classList.remove('go'); void $('b-flash').offsetWidth; $('b-flash').classList.add('go');
  sfx.alert();
  ui.classList.remove('hidden');
  menu.classList.add('hidden');
  $('b-cutin').classList.add('hidden');
  cine(true);
  refresh();
  cam.shot('foe');
  await say(`${E.name} the ${def.breed} wants Dexter's treats!`, 1700);
  cam.shot('dex'); sfx.power();
  await say('Suddenly Dexter gets Serious for once.', 1700);
  cam.shot('side');
  await say(def.intro, 1500);
  if (ctx.friend === 'chickens') {
    cam.shot('foe');
    sfx.cluck(); particles('🐔', dexMesh, foeMesh, 6, 50);
    B.confused = 2; refresh();
    await say(`The chickens swarm ${E.name} in a blizzard of feathers! ${E.name} is confused!`, 1900);
  } else if (ctx.friend === 'donkey') {
    cam.shot('foe');
    sfx.heehaw();
    await say('Hank the donkey winds up...', 900);
    await hitFoe(E.maxHp * 0.4 * (6 / S.atk), 'HEE-HAW! A flying double-hoof opener!');
  } else if (ctx.friend === 'pig') {
    sfx.oink(); popup('🐷', dexMesh, 'fx');
    B.pAtk = 2; refresh();
    await say("Hamlet oinks words of encouragement. Dexter's attack rose sharply!", 1800);
  }
  cine(false);

  let result = E.hp <= 0 ? 'win' : null;
  while (!result) {
    const move = await choose();
    if (move === 'run') {
      cam.shot('top');
      await say('Dexter attempts a tactical retreat...', 900);
      if (Math.random() < 0.6) { await say('Got away! Zoom!', 900); result = 'run'; break; }
      await say(`${E.name} cut him off!`, 900);
    } else if (move === 'bribe') {
      cine(true); cam.shot('dex');
      textEl.textContent = 'Dexter offers a bribe...';
      await cutin('bribe', 'bribe...', '#8d93a8');
      sfx.whimper();
      cam.shot('side');
      S.carried--; E.loot++; refresh();
      particles('🦴', dexMesh, foeMesh, 1, 8);
      await say('Dexter sadly nudges a treat across the grass.', 1700);
      cam.shot('foe'); sfx[def.cry]();
      await say(`${E.name} takes it and decides Dexter isn't worth the trouble.`, 1700);
      cine(false);
      result = 'bribe'; break;
    } else {
      await playerTurn(move);
    }
    if (E.hp <= 0) { result = 'win'; break; }
    await enemyTurn();
    dexMesh.position.copy(dexHome); foeMesh.position.copy(foeHome);
    dexMesh.rotation.z = 0; foeMesh.rotation.z = 0;
    if (S.hp <= 0) { result = 'lose'; break; }
  }

  dexMesh.position.copy(dexHome); foeMesh.position.copy(foeHome);
  dexMesh.rotation.z = 0; foeMesh.rotation.z = 0;
  if (result === 'win') {
    cine(true); cam.shot('victory');
    sfx.win(); particles(['✨', '⭐'], dexMesh, null, 8, 70);
    await say(`${E.name} tucks tail and trots off, humiliated!`, 1800);
    if (E.loot > 0) {
      S.carried += E.loot;
      await say(`Dexter recovered ${E.loot} stolen treat${E.loot > 1 ? 's' : ''}!`, 1400);
      E.loot = 0;
    }
  } else if (result === 'lose') {
    cine(true); cam.shot('top');
    sfx.lose();
    S.hp = 0; refresh();
    await say("Dexter's confidence is shattered. He flops over dramatically.", 1900);
    const lost = Math.ceil(S.carried / 2);
    if (lost > 0) {
      S.carried -= lost; E.loot += lost;
      await say(`${E.name} made off with ${lost} treat${lost > 1 ? 's' : ''}!`, 1600);
    }
  }
  refresh();
  cine(false);
  pops.innerHTML = '';
  $('b-cutin').classList.add('hidden');
  textEl.removeEventListener('click', onSkip);
  window.removeEventListener('keydown', onKey);
  ui.classList.add('hidden');
  return result;
}
