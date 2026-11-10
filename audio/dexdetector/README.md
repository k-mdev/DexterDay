# DexDetector audio clips

Drop audio files (mp3, wav or ogg) in this folder and list their file names in `clips.json`:

```json
{
  "bark": ["dexter-bark-1.mp3", "dexter-bark-2.mp3"],
  "sweep": ["ping.mp3"],
  "barkVolume": 0.12,
  "sweepVolume": 0.1
}
```

- `bark` — played each time the sweep line passes a dog. One is picked at random, with a slight random pitch shift. Keep `barkVolume` low: these are meant to be super quiet.
- `sweep` — played once per full rotation of the sweep line.

While a list is empty the game uses its built-in synthesised sound for it.
