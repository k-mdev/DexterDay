# DexterDay 🦴

A tiny low-poly 3D browser game about Dexter, a stank dog (and slightly confused black lab) who lives in a two-story house in the forest.

Collect treats, stash them in your bowl, and defend them from the neighbourhood dogs in Pokémon-style battles where Dexter suddenly gets Serious for once.

## Play

Hosted with GitHub Pages — no build step. To run locally:

```bash
python -m http.server 8791
```

then open <http://localhost:8791>. (It must be served over HTTP; opening `index.html` from disk won't load the ES modules.)

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD / arrows | left stick |
| Zoomies (sprint) | Shift | ⚡ |
| Use / stash / dig / sleep (or just bark) | E or Space | 🐾 |
| Eat a carried treat to heal | Q | 🍖 |
| Mute / help | M / H | buttons |

## How it works

- **Treats** spawn around the clearing. Carried treats can be stolen; treats stashed in the bowl by the porch are safe-ish.
- **Treats are also health.** Eating one restores confidence, so every treat is a choice: eat it or bank it.
- **Rivals** (Peanut, Otis, Maggie, Bella, Koda and Bandit the raccoon) occasionally snatch a treat if they catch you carrying, or raid the bowl if you're not home; a short cutscene shows who took what. Battles are opt-in: walk up to a rival and press E to challenge them and win the loot back.
- **Battles**: Slobber (ruins their aim), Whine (guilt lowers their attack), Bark (reliable damage), Duh (anything could happen). Or eat a treat, bribe your way out with one, or run. Fighters prowl and circle each other on all fours, each move gets a 3D isometric portrait banner, and the camera cuts between shots.
- **DexDetector**: a sweep radar that pings rival dogs (with a very quiet bark) as the line passes them.
- **Friends down the street** tag along for 30 seconds: the chickens fetch nearby treats, Hank the donkey punts rivals into the forest, Hamlet the pig roots up snacks. Each also helps at the start of a battle.
- **Extras**: dig spots, a squirrel worth chasing, a lake and kiddie pool that recharge zoomies, XP and levels, a day/night cycle, and a bed on the porch to end the day (rivals can't get onto the porch). Progress saves at the end of each day.

## Tech

Plain HTML/CSS/ES modules with [three.js](https://threejs.org) from a CDN. All models are built in code and all music, ambience and sound effects are synthesised with WebAudio, so there are no asset files.

- `js/main.js` — world, game loop, rivals, friends, day flow
- `js/battle.js` — turn-based battle system
- `js/cutin.js` — 3D isometric portrait for the attack banners
- `js/models.js` — every model, including Serious Mode
- `js/sfx.js` — sound effects, music sequencer, ambience
