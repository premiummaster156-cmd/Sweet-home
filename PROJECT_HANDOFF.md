# Sweet Home — Project Handoff

## Current milestone

**M0 — Make the first chapter playable (implementation pass).**

Work is on the review branch `fix/m0-playable-chapter`. The production branch `main` has not been changed by this M0 patch.

## M0 changes on this branch

- Added the missing `spawnBurst()`, `attack()`, and `interact()` functions.
- Implemented pipe attacks, enemy health reduction, hit feedback, knockback, and enemy removal.
- Integrated PixelFX's documented `impacts/blunt-hit` effect on successful melee hits.
- Implemented supply pickup progression and first-aid collection/use.
- Implemented the stairwell lock, which requires all three supplies, plus a victory state when the player crosses the open exit.
- Added simple circle-versus-rectangle collision against corridor boundaries, furniture, utility objects, and the locked exit door; enemy movement uses the same collision resolver.
- Moved an initially spawned infected out of a furniture collider.
- Updated the flashlight percentage label and corrected the HUD floor to 06.
- Removed the misleading "LOCAL SAVE" intro label; a real save/continue system is not implemented.
- Scheduled the animation frame before updating/rendering and added a runtime error guard so one exception cannot permanently stop RAF scheduling.
- Pinned PixelFX to upstream commit `044e12a45dc9cc312cec50ee606dfc98afe5adc2`.
- Enabled GitHub Actions push checks for `fix/**` branches.

## Verification

- Static JavaScript syntax compilation of the edited `main.js` passed after removing its top-level import declarations for the syntax check.
- GitHub Actions production dependency installation and `npm run build` passed on the M0 branch, including its latest commit `b6d4fc77b1501ead542a2d835f0bfabf5ccbb5ea`.
- Build run: https://github.com/premiummaster156-cmd/Sweet-home/actions/runs/42856798012

## Not yet verified

- No live browser playthrough has been completed.
- No iPhone or Android physical-device test has been completed.
- Attack range, enemy/furniture navigation, item pickup reach, stairwell interaction, and full win/loss flow still need hands-on browser QA.
- Collision geometry is a first-pass static rectangle map, not a general map editor or navigation mesh.
- The frame error guard prevents the RAF loop from silently terminating but it does not make an underlying gameplay exception harmless; any caught runtime error still pauses gameplay and needs fixing.
- A lockfile has not yet been generated; PixelFX is pinned, but dependency installation is not yet fully lockfile-reproducible.

## Known systems still outside M0

- Persistent save/continue and checkpoints.
- Full interactive inventory UI.
- Dialogue and character interaction system.
- Map, journal, and multi-room progression.
- Enemy state machine, line of sight, investigation and pathfinding.
- Authored sprite sheets and complete directional animation frames.
- Mobile overlay controls and physical-device testing.
- Separate music and SFX volume settings.

## Recommended next steps

1. Review this branch and the M0 diff.
2. Run the game in a browser and test: New Game → collect three supplies → use first aid → attack an infected → unlock stairwell → cross exit; then separately verify the game-over flow.
3. Inspect the browser console and fix every runtime error.
4. Test collision against every listed obstacle and verify enemies do not spawn inside or become permanently trapped in furniture.
5. Test the mobile controller on a phone after M0 browser QA.
6. Only merge into `main` after review and hands-on verification.
7. Begin M1 (module boundaries, pre-rendered floor, lockfile and `npm ci`) after M0 is verified.

## Deployment

Cloudflare Pages remains configured to build the production `main` branch using `npm run build` and publish `dist`. This feature branch has not been merged, so it has not replaced production code.
