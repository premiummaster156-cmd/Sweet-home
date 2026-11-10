# SWEET HOME — Green Home

An unofficial, fan-made pixel-art survival horror browser game inspired by the Korean series *Sweet Home*. This is an original prototype and is not affiliated with Netflix or the series' rights holders.

## Features in this prototype
- Canvas-rendered pixel-art apartment floor and horror atmosphere
- Keyboard movement, melee combat, enemy pursuit, health and stamina
- Supplies, first-aid pickup, objective progress and exit condition
- Start screen, retry screen, pause, responsive website UI
- Vite build configured for Cloudflare Pages
- `pixelfx` included as the visual-effects foundation for future combat VFX

## Controls
- **WASD / Arrow keys** — Move
- **Space** — Attack
- **E** — Pick up nearby items, use first aid when hurt, or interact with the exit
- **P** — Pause

## Local development
Requires Node.js 20+.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Cloudflare Pages
Connect this repository to Cloudflare Pages with:
- **Production branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

No server-side runtime or environment variables are required for this prototype.

## Next milestones
1. Integrate selected pixelfx effect modules into combat.
2. Add room transitions, more floors and enemy variants.
3. Add sound, dialogue, save slots and story missions.
4. Improve mobile touch controls and accessibility.
5. Add original sprite sheets and animated cutscenes.

## Credits and rights
Uses [pixelfx](https://github.com/patch-gg/pixelfx) as an open-source effects library. All game-specific placeholder art is drawn in code. This is a non-commercial fan project; *Sweet Home* and its characters belong to their respective rights holders.
