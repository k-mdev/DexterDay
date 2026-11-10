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
    name: 'Taco', breed: 'Chihuahua', hp: 15, atk: 4, speed: 5.2, xp: 9, cry: 'yap',
    intro: 'Taco is vibrating with rage!',
    moves: [
      { name: 'Yap Yap Yap', power: 5, acc: 0.95, text: 'It never stops.' },
      { name: 'Ankle Nip', power: 7, acc: 0.8, text: 'Right on the dewclaw!' },
    ],
  },
  pug: {
    name: 'Sir Snorts', breed: 'Pug', hp: 23, atk: 5, speed: 3.6, xp: 12, cry: 'bark',
    intro: 'Sir Snorts wheezes menacingly.',
    moves: [
      { name: 'Snort', power: 5, acc: 0.95, text: 'Moist.' },
      { name: 'Sit On', power: 8, acc: 0.75, text: 'Surprisingly dense!' },
    ],
  },
  corgi: {
    name: 'Biscuit', breed: 'Corgi', hp: 27, atk: 6, speed: 4.6, xp: 15, cry: 'bark',
    intro: 'Biscuit wants to herd you somewhere worse.',
    moves: [
      { name: 'Butt Bump', power: 7, acc: 0.9, text: 'Fluffy but forceful.' },
      { name: 'Herd', power: 5, acc: 1, text: 'Dexter gets bossed around.', debuff: true },
    ],
  },
  poodle: {
    name: 'Fifi', breed: 'Poodle', hp: 30, atk: 7, speed: 4.8, xp: 18, cry: 'yap',
    intro: 'Fifi looks at Dexter like he is a stain.',
    moves: [
      { name: 'Sass', power: 6, acc: 1, text: 'The judgment stings.' },
      { name: 'Prance Kick', power: 9, acc: 0.8, text: 'Elegant. Painful.' },
    ],
  },
  husky: {
    name: 'Blizzard', breed: 'Husky', hp: 40, atk: 8, speed: 5.5, xp: 28, cry: 'bark',
    intro: 'Blizzard screams about nothing in particular.',
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

/**
 * ctx: { state, enemy, dexMesh, foeMesh, project(obj)->{x,y}, refresh() }
 * state: { hp, maxHp, atk, level, carried }   enemy: { key, name, level, hp, maxHp, atk, loot }
 * resolves 'win' | 'lose' | 'run'
 */
export async function runBattle(ctx) {
  const { state: S, enemy: E, dexMesh, foeMesh } = ctx;
  const def = RIVALS[E.key];
  const B = { pAtk: 0, eAtk: 0, eAcc: 0, confused: 0 };
  const ui = $('battle'), textEl = $('b-text'), menu = $('b-menu');
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
    const n = '123456'.indexOf(e.key);
    if (n >= 0 && !menu.classList.contains('hidden')) menu.children[n].click();
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

  const popup = (text, target, cls = '') => {
    const p = ctx.project(target);
    const el = document.createElement('div');
    el.className = `pop ${cls}`; el.textContent = text;
    el.style.left = `${p.x + rand(-20, 20)}px`; el.style.top = `${p.y - 30}px`;
    $('b-popups').appendChild(el);
    setTimeout(() => el.remove(), 1150);
  };

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

  const choose = () => new Promise((res) => {
    menu.classList.remove('hidden');
    menu.querySelector('[data-move="treat"]').disabled = S.carried < 1 || S.hp >= S.maxHp;
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
    sfx.hit(); popup(`-${dmg}`, foeMesh, 'dmg');
    await shake(foeMesh, foeHome); refresh();
    if (crit) await say('A critical embarrassment!', 900);
    if (label) await say(label, 1000);
  };

  const playerTurn = async (move) => {
    if (move === 'bark') {
      await say('Dexter used BARK!', 700);
      sfx.bark(); popup('WOOF!', dexMesh, 'fx');
      await lunge(dexMesh, dexHome, foeHome, 0.8);
      if (Math.random() < 0.95) await hitFoe(8); else { sfx.miss(); await say('He barked at a tree instead.'); }
    } else if (move === 'slobber') {
      await say('Dexter used SLOBBER!', 700);
      sfx.slobber(); popup('💦💦', foeMesh, 'fx');
      await lunge(dexMesh, dexHome, foeHome, 1.6);
      await hitFoe(4);
      if (B.eAcc < 3) { B.eAcc++; refresh(); await say(`${E.name} is covered in drool and can't see straight!`); }
      else await say(`${E.name} cannot possibly get any wetter.`);
    } else if (move === 'whine') {
      await say('Dexter used WHINE...', 700);
      sfx.whine(); popup('🥺', dexMesh, 'fx');
      await wobble(dexMesh);
      if (B.eAtk > -3) { B.eAtk--; refresh(); await say(`${E.name} feels kind of bad about this. Attack fell!`); }
      else await say(`${E.name} is already drowning in guilt.`);
    } else if (move === 'duh') {
      await say('Dexter used DUH.', 700);
      sfx.duh(); popup('?', dexMesh, 'fx');
      await wobble(dexMesh);
      const r = Math.random();
      if (r < 0.32) {
        B.confused = 2; refresh();
        await say(`${pick(DUH_LINES)} ${E.name} is deeply confused!`, 1900);
      } else if (r < 0.57) {
        await say('Dexter trips over his own paws...', 1000);
        await lunge(dexMesh, dexHome, foeHome, 2.2);
        await hitFoe(15, '...and headbutts them by accident!');
      } else if (r < 0.77) {
        const heal = Math.round(S.maxHp * 0.3);
        S.hp = Math.min(S.maxHp, S.hp + heal);
        sfx.heal(); popup(`+${heal}`, dexMesh, 'heal'); refresh();
        await say('Dexter finds an old treat stuck in his fur. Delicious!');
      } else {
        await say(`${pick(DUH_LINES)} Nothing happens.`, 1700);
      }
    } else if (move === 'treat') {
      S.carried--;
      const heal = Math.round(S.maxHp * 0.45);
      S.hp = Math.min(S.maxHp, S.hp + heal);
      sfx.heal(); popup(`+${heal}`, dexMesh, 'heal'); refresh();
      await say('Dexter inhales a treat without chewing. Confidence restored!');
    }
  };

  const enemyTurn = async () => {
    if (B.confused > 0) {
      B.confused--; refresh();
      await say(`${E.name} is still trying to work out what Dexter is doing.`);
      return;
    }
    const acc = 1 - 0.17 * B.eAcc;
    const snatchChance = S.carried > 0 ? (def.snatchy ? 0.45 : 0.2) : 0;
    if (Math.random() < snatchChance) {
      await say(`${E.name} used SNATCH!`, 700);
      await lunge(foeMesh, foeHome, dexHome, 1.6);
      if (Math.random() < acc) {
        S.carried--; E.loot++;
        popup('-1 🦴', dexMesh, 'dmg'); sfx.miss(); refresh();
        await say(`${E.name} swiped a treat right out of Dexter's mouth!`);
      } else await say(`${E.name} slipped on the slobber and missed!`);
      return;
    }
    const m = pick(def.moves);
    await say(`${E.name} used ${m.name.toUpperCase()}!`, 700);
    sfx[def.cry]();
    await lunge(foeMesh, foeHome, dexHome, 1.4);
    if (Math.random() > m.acc * acc) {
      sfx.miss();
      await say(B.eAcc ? `${E.name} slipped on the slobber and missed!` : `${E.name} missed!`);
      return;
    }
    let dmg = m.power * (E.atk / 6) * (1 + 0.2 * B.eAtk) * rand(0.85, 1.15);
    dmg = Math.max(1, Math.round(dmg));
    S.hp -= dmg;
    sfx.hit(); popup(`-${dmg}`, dexMesh, 'dmg');
    await shake(dexMesh, dexHome); refresh();
    if (m.debuff && B.pAtk > -2) { B.pAtk--; await say(`${m.text} Dexter's attack fell!`); }
    else await say(m.text, 1000);
  };

  // --- intro ---
  $('b-flash').classList.remove('go'); void $('b-flash').offsetWidth; $('b-flash').classList.add('go');
  sfx.alert();
  ui.classList.remove('hidden');
  menu.classList.add('hidden');
  refresh();
  sfx.power();
  // menacing katakana drifting off both fighters, as is tradition
  const menace = setInterval(() => {
    const el = document.createElement('div');
    el.className = 'pop menace'; el.textContent = 'ゴ';
    const p = ctx.project(Math.random() < 0.5 ? dexMesh : foeMesh);
    el.style.left = `${p.x + rand(-110, 110)}px`; el.style.top = `${p.y + rand(-10, 150)}px`;
    $('b-popups').appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }, 420);
  await say(`${E.name} the ${def.breed} wants Dexter's treats!`, 1700);
  await say('Suddenly, everyone is extremely muscular.', 1600);
  await say(def.intro, 1500);
  if (ctx.friend === 'chickens') {
    sfx.cluck(); popup('🐔🐔🐔', foeMesh, 'fx');
    B.confused = 2; refresh();
    await say(`The Cluckers swarm ${E.name} in a blizzard of feathers! ${E.name} is confused!`, 1900);
  } else if (ctx.friend === 'donkey') {
    sfx.heehaw();
    await say('Hank the donkey winds up...', 900);
    await hitFoe(E.maxHp * 0.4 * (6 / S.atk), 'HEE-HAW! A flying double-hoof opener!');
  } else if (ctx.friend === 'pig') {
    sfx.oink(); popup('🐷', dexMesh, 'fx');
    B.pAtk = 2; refresh();
    await say("Hamlet oinks words of encouragement. Dexter's attack rose sharply!", 1800);
  }

  let result = E.hp <= 0 ? 'win' : null;
  while (!result) {
    const move = await choose();
    if (move === 'run') {
      await say('Dexter attempts a tactical retreat...', 900);
      if (Math.random() < 0.6) { await say('Got away! Zoom!', 900); result = 'run'; break; }
      await say(`${E.name} cut him off!`, 900);
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
    sfx.win();
    await say(`${E.name} tucks tail and trots off, humiliated!`, 1600);
    if (E.loot > 0) {
      S.carried += E.loot;
      await say(`Dexter recovered ${E.loot} stolen treat${E.loot > 1 ? 's' : ''}!`, 1400);
      E.loot = 0;
    }
  } else if (result === 'lose') {
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
  clearInterval(menace);
  $('b-popups').innerHTML = '';
  textEl.removeEventListener('click', onSkip);
  window.removeEventListener('keydown', onKey);
  ui.classList.add('hidden');
  return result;
}
