# The Big Eye Teamplay

Standalone Teamplay adaptation of The Big Eye. This checkout includes a **playable tribe-stage development prototype** and the retained Classic baseline. Teamplay runs three tribes, secret weighted ballots, separate nominee/reserve duels, captures, the eight-player merger and Final Five fusion. The individual Classic endgame handoff and full social/game pools remain later work.

Source pin: `georgi-cole/bbmobilenew-source@50676d77b76362b7d8461c23ca7c7473b7b66bdb`.

## Start locally

Use Node 22 or newer and install the pinned dependencies with `npm ci`. Run `npm run dev` and open `/the-big-eye-teamplay/`. Production web output is built with `npm run build`; the packaged web target uses `npm run build:mobile`.

No original-app environment file or credential is required. Native billing, advertising, cloud profiles and live configuration remain disabled. The copied original store catalog is source reference only. The Play menu offers Teamplay and the Classic baseline.

## Play and inspect Teamplay

- Play: `/the-big-eye-teamplay/#/teamplay`. Choose an existing contestant and create a season. Every decision is saved before its result appears. A human can play the existing 30-second Classic Quick Tap engine, explicitly delegate a performance to its saved AI skill model, or watch an AI-only competition.
- Test page: run `npm run dev -- --port 4198`, then open `http://127.0.0.1:4198/the-big-eye-teamplay/#/teamplay-preview`. Its scene selector reaches actual engine states, including both duel results, capture, merger and fusion. Test saves are separate from playable seasons. The route is omitted from ordinary release builds; `VITE_ENABLE_QA_ROUTES=true` enables it for an intentional QA build.
- Prototype scope: one existing game in both competition contexts and five direct social actions. There is no fabricated winner, paid revive or Classic endgame jump. An interrupted race can restart the same saved challenge. A human reserve can skip AI-only phases to the next defence and retain the public recap.
- See [cycle implementation, rule trace and remaining gaps](docs/teamplay/CYCLE_ENGINE_STATUS.md).

## Review the foundation

- [Source audit and reuse map](docs/teamplay/SOURCE_AUDIT.md)
- [Validation and delivery status](docs/teamplay/FOUNDATION_STATUS.md)
- [Versioned handbook](docs/teamplay/HANDBOOK.md)
- [Exact social action prices/effects](docs/teamplay/audit/social-actions.md)
- [Complete action metadata](docs/teamplay/audit/social-actions.json)
- [Minigame/AI/result inventory](docs/teamplay/audit/minigame-inventory.json)
- [Original README](docs/teamplay/UPSTREAM_README.md)

## Identity

`com.georgicole.thebigeyeteamplay` is the separate application ID on both native platforms. Saves and photos use separate Teamplay storage/database names. Native signing, store listings, purchases, backend configuration and device validation remain explicit delivery gates.

## Checks

Run `npm run check:pr` before publishing a change, as required by AGENTS.md. Run `npx vitest run src/teamplay/` for the Teamplay controller, save/recovery, scene fixtures and atomic UI presentation checks. Foundation-specific checks are in `tests/teamplayFoundation.test.ts`; launcher coverage remains alongside the inherited HomeHub tests. When package files change, also run `npm audit --omit=dev --audit-level=high`.

After `npm run build:mobile`, run `npx playwright test --config=playwright.bundle.config.ts` to check the production launcher, real Quick Tap input, cycle progression, saved reload and closed store at phone and desktop sizes. This fixture serves local build assets through Playwright request interception and does not need an HTTP server. It uses a secure test origin so normal browser APIs remain available. External asset requests are blocked; it does not certify online services.

Native preparation uses `npx cap sync android` or `npx cap sync ios` after the mobile build. Android validation is `cd android` followed by `./gradlew lintDebug assembleDebug` (Windows: `gradlew.bat lintDebug assembleDebug`). Keep both the checkout and Gradle cache in ASCII-only directories on Windows. iOS compilation requires macOS/Xcode. The baseline workflow includes browser, Android debug/lint and unsigned iOS simulator build jobs; these jobs have not run on GitHub yet.

## Repository publication

The separate repository is [georgi-cole/the-big-eye-teamplay](https://github.com/georgi-cole/the-big-eye-teamplay). Foundation commit `54da276` was verified on GitHub on 17 November 2026. No source-repository branch or file was changed. Archived inherited deployment workflows are under `docs/teamplay/inherited-workflows/`; they must be reviewed for Teamplay before re-enabling. Remote build results must be checked independently of local verification.
