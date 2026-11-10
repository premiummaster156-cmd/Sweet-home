# SWEET HOME — Green Home

An unofficial, fan-made pixel-art survival horror browser game inspired by the Korean series *Sweet Home*. This original fan project is not affiliated with Netflix or the series' rights holders.

## What is included

- A title screen with New Game, Settings and How to Play; the game never starts automatically.
- An animated opening sequence with a skip option.
- Pixel-art top-down survival gameplay with pursuing infected, combat, health, stamina, first aid and three required supplies.
- A clear chapter-complete condition and separate victory / game-over screens.
- Synthesized original sound effects and atmospheric audio generated in the browser using the Web Audio API. No external audio files, API keys or audio hosting are needed.
- Master-volume and mute controls, persisted in the browser.
- Mobile virtual joystick with dedicated RUN, STEALTH, ATTACK, USE, LIGHT and PAUSE controls.
- PC controls for sprinting (Shift), crouching (C) and flashlight (F); sprinting drains stamina and makes more noise, while crouching reduces detection range.
- Flashlight beam and rechargeable battery display, plus stamina-based movement feedback.
- Infected react to sound and distance: sprinting attracts them from farther away, while crouching reduces detection range. Low-health heartbeat, breathing and footstep cues deepen the atmosphere.
- Touch controls for phones and tablets, plus keyboard controls for desktop.
- Vite build output configured for Cloudflare Pages.
- PixelFX-powered animated melee slash effects, composited on a transparent effects layer.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD / arrow keys | Virtual joystick |
| Sprint | Hold Shift | Hold RUN |
| Crouch / stealth | C | STEALTH |
| Flashlight | F | LIGHT |
| Attack | Space | ATTACK |
| Interact / collect / use | E | USE |
| Pause | P or Escape | PAUSE |

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Run with the Cloudflare Pages local runtime:

```bash
npm run dev:pages
```

## Cloudflare Pages setup

The repository includes `wrangler.jsonc` with the Pages output directory and project name. In Cloudflare, create a **Pages** project using **Connect to Git** and select this repository. Because this is plain Vite (not React), use the **None / no framework preset** option and enter these values:

- Project name: `sweet-home`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

After the first deployment, pushes to `main` will build and publish automatically. This is a static browser game: it needs no server, database, secrets, environment variables, or separately hosted audio.

The first connection is the only Cloudflare setup step. Cloudflare installs dependencies, runs the build and publishes `dist`; each later push to `main` automatically redeploys. Node.js 22 is selected by the committed `.nvmrc`. No environment variables or secrets are needed.

## Audio note

All sound is synthesized at runtime. Browsers require a user gesture before audio can start, so sound activates after the player presses a menu button. The settings panel controls master volume and mute state.

## Credits and rights

Uses [pixelfx](https://github.com/patch-gg/pixelfx) as an open-source effects library. Game-specific placeholder art and synthesized audio are original code. *Sweet Home*, its story, and its characters belong to their respective rights holders.
