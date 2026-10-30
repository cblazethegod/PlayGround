# GEO DASH — NEON RUSH

A fast, neon-soaked one-tap rhythm platformer in the spirit of Geometry Dash, built for mobile browsers. Jump, fly, and flip through four hand-tuned levels or chase your best distance in Endless mode.

Everything is generated at runtime: **no build step, no dependencies, and zero external assets.** Visuals are drawn on a single HTML5 canvas, and the soundtrack and sound effects are synthesized with the Web Audio API.

## Play

The game is a static site with no build step. Because it uses ES modules, serve the folder over HTTP rather than opening the file directly:

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

For the best experience use a phone, or open devtools and enable device emulation. Progress saves automatically in `localStorage`.

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Jump / hold to fly / flip gravity | Tap or press anywhere on the playfield | `Space`, `↑`, or `W` |
| Pause | Pause button in the HUD | `Esc` or `P` |
| Restart from pause | — | `R` |

Buttons are sized for touch, respect device safe areas, and support haptics where the browser exposes them.

## Modes

- **Cube** — tap to jump. Time jumps over spikes, saws, and gaps. Hold for chained jumps off the ground.
- **Ship** — hold to thrust upward, release to fall. Thread narrow corridors and slaloms.
- **Ball** — tap to slam gravity in the opposite direction. Stay off the ceiling and floor hazards.
- **Portals** — mode portals switch between cube, ship, and ball mid-run, with a screen flash and a beat-synced transition.
- **Practice mode** — toggle from the pause menu, then place checkpoints to learn a tough section. Practice completions are not recorded.
- **Endless** — an infinite, difficulty-ramping run. One hit ends the run; chase your best distance.

## Levels and progression

Four levels — **Neon Runner**, **Crimson Circuit**, **Electric Dream**, and **Void Overdrive** — unlock in sequence as you finish the previous one. Each level has:

- Three collectible coins, recorded per level.
- Best completion percentage and attempt count.
- A distinct palette, background, and music variation.

Your selected icon and trail, audio volumes, screen shake, particles, and haptics are saved locally. Use **Settings → Reset All Progress** to start clean.

## Project layout

```
index.html       screens, overlays, and HUD markup
styles.css       responsive neon UI and layout
js/main.js       app flow, save data, menus, and input wiring
js/game.js       fixed-step physics, collisions, camera, and run state
js/levels.js     seeded level builder, pattern pools, and level definitions
js/render.js     canvas scenes, player rendering, and menu backdrop
js/objects.js    obstacle, portal, coin, and decoration drawing
js/icons.js      icon and trail definitions
js/audio.js      Web Audio music scheduler and synthesized SFX
```

### How it works

The simulation runs on a fixed timestep with a variable-rate render loop. Levels are assembled from seeded pattern pools with enforced spacing between hazards, so runs are deterministic while still feeling hand-placed. The camera follows the player, and every visual effect — parallax grids, particles, trails, and bloom-like glows — is drawn procedurally.

## Debugging

Append `?debug=1` to the URL to expose a small testing handle:

```js
window.__geodash // { game, audio, save, LEVELS, levelById, startLevel, startEndless, persist }
```

This is opt-in and absent in normal play.

---

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/cblazethegod/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/cblazethegod/PlayGround)

- 🎮 [Open the project](https://omgithub.com/cblazethegod/PlayGround).
- ✨ [Remix this project](https://omgithub.com/?remix=cblazethegod%2FPlayGround).
- 💻 [Explore the source](https://github.com/cblazethegod/PlayGround).
- 🛠️ [Check build runs](https://github.com/cblazethegod/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/cblazethegod/PlayGround/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/cblazethegod).
- 🌍 [Create with OMGithub](https://omgithub.com).
<!-- omgithub:readme:end -->
