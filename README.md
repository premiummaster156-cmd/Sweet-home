# SWEET HOME — Green Home

An unofficial, fan-made pixel-art survival horror browser game inspired by the Korean series *Sweet Home*. This original fan project is not affiliated with Netflix or the series' rights holders.

## What is included

- A title screen with New Game, Settings and How to Play; the game never starts automatically.
- An animated opening sequence with a skip option.
- Pixel-art top-down survival gameplay with pursuing infected, combat, health, stamina, first aid and three required supplies.
- A clear chapter-complete condition and separate victory / game-over screens.
- Synthesized original sound effects and atmospheric audio generated in the browser using the Web Audio API. No external audio files, API keys or audio hosting are needed.
- Master-volume and mute controls, persisted in the browser.
- Touch controls for phones and tablets, plus keyboard controls for desktop.
- Vite build output configured for Cloudflare Pages.
- The [pixelfx](https://github.com/patch-gg/pixelfx) library retained as the pixel-effects foundation.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD / arrow keys | Direction pad |
| Attack | Space | Attack |
| Interact / collect / use | E | Interact |
| Pause | P or Escape | — |

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

The repository includes `wrangler.jsonc` with the Pages output directory and project name. When creating the Pages project, connect this GitHub repository and choose the **Vite** framework preset. Confirm these values:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

After the first deployment, pushes to `main` will build and publish automatically. This is a static browser game: it needs no server, database, secrets, environment variables, or separately hosted audio.

Cloudflare's Git setup still requires the one-time framework/build selection during project creation; the checked-in Wrangler config keeps the Pages project name and output directory alongside the code.

## Audio note

All sound is synthesized at runtime. Browsers require a user gesture before audio can start, so sound activates after the player presses a menu button. The settings panel controls master volume and mute state.

## Credits and rights

Uses [pixelfx](https://github.com/patch-gg/pixelfx) as an open-source effects library. Game-specific placeholder art and synthesized audio are original code. *Sweet Home*, its story, and its characters belong to their respective rights holders.
