# Sweet Home — Free Hybrid AI Workflow

Repository: https://github.com/premiummaster156-cmd/Sweet-home
Production branch: `main`
Hosting: Cloudflare Pages (free plan)
Build: `npm run build`
Output directory: `dist`

## Goal

Use ChatGPT and Claude Free together without requiring paid AI subscriptions, paid APIs, a database, or a backend. Keep the project deployable as a static Vite application.

## Roles

### ChatGPT — implementation and integration
- Use the connected GitHub tools when available to inspect and change repository files.
- Make focused changes, preserve working features, and explain which files changed.
- Check the package scripts and build configuration before changing architecture.
- Prefer small, reviewable commits. Never claim a build passed unless it was actually run.
- Keep all production-required assets inside the repository and bundled by Vite.

### Claude Free — independent reviewer
- Use Claude's free chat as a second opinion; do not assume Claude Code or autonomous repository access is included in the free plan.
- Give Claude the current task, relevant files or diffs, and this document.
- Ask Claude to find bugs, visual inconsistencies, accessibility issues, performance problems, and missing edge cases.
- Ask for precise file/line references and small proposed patches, not a complete rewrite of the project.
- Bring Claude's review back to ChatGPT for verification and integration before applying changes.

## Safe collaboration loop

1. Choose one small milestone (for example, main-menu polish, opening cinematic, player movement, or mobile controls).
2. ChatGPT inspects the current implementation and proposes a narrow change.
3. Implement the change in a feature branch where possible; do not let two assistants edit the same file at the same time.
4. Ask Claude Free to review the diff or relevant files independently.
5. Reconcile the review. Do not apply suggestions blindly; verify them against the actual code and installed library APIs.
6. Run `npm install` and `npm run build` in an environment that supports commands. If no runtime is available, say so and do not claim tests passed.
7. Test the affected feature in a browser, including mobile/touch behavior when relevant.
8. Merge verified changes into `main`. Cloudflare Pages can then build and deploy the production branch.
9. Record what changed, what was tested, and remaining issues in this file or the project handoff.

## Rules that keep the project free

- Do not add paid APIs or services.
- Do not add an API key, token, password, or secret to source control.
- Do not enable pay-as-you-go API billing for Claude, OpenAI, or other providers.
- Do not assume a connector, agent, cloud coding environment, or usage quota is free; verify the plan before relying on it.
- Prefer browser-native Canvas/Web Audio and static assets over services that require a server.
- Keep Cloudflare Pages configuration compatible with a static Vite build.
- Check the current free-tier limits of providers when needed; limits can change.

## Current visual and gameplay priorities

Use the Sweet Home concept screenshot as the primary visual reference:
- Dark, restrained survival-horror palette.
- Green Home exterior and detailed apartment corridors.
- Recognizable Cha Hyun-su pixel-art protagonist.
- Actual character animations rather than sliding single-frame sprites.
- Professional title menu, HUD, inventory, dialogue and status panels.
- Keyboard controls and responsive mobile virtual joystick/action buttons.
- Footsteps, ambience, monster audio and working volume settings.
- A real opening cinematic, not a static slideshow.
- Functional save/continue, interaction, combat, enemy behavior and objectives.

Build one polished, testable first chapter before expanding the world. Avoid fake buttons, placeholder systems presented as finished, and unsupported PixelFX API calls.

## Task prompt template

Paste this into either assistant at the start of a task:

> Work on the existing Sweet Home repository, not a new replacement project. Read AI_WORKFLOW.md and inspect the current files before editing. Implement this one task: [TASK]. Preserve working behavior and the dark Sweet Home visual direction. Make the smallest complete change, list every file changed, explain how to test it, and state honestly what you could and could not run. Do not add paid services, paid APIs, secrets, or dependencies without a clear need. Do not claim success without verification.

## Review prompt for Claude Free

> Review the attached code/diff for the Sweet Home browser game. Do not rewrite the whole project. Find concrete bugs, broken edge cases, visual or UX mismatches, mobile input issues, performance problems, and compatibility risks. Return findings ordered by severity, with file/line references and minimal suggested patches. Check assumptions against the supplied code and do not invent library APIs.

## Handoff checklist

For every milestone, record:
- [ ] Feature implemented
- [ ] Production build run successfully
- [ ] Browser behavior tested
- [ ] Mobile behavior tested when relevant
- [ ] No known console errors in the tested flow
- [ ] Cloudflare Pages deployment checked when applicable
- [ ] Remaining limitations documented
