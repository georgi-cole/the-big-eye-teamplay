# The Big Eye Teamplay

Standalone Teamplay adaptation of The Big Eye. This checkout is the **development foundation**, with the existing Classic engine as its playable baseline. Tribe/reserve gameplay is not implemented yet.

Source pin: `georgi-cole/bbmobilenew-source@50676d77b76362b7d8461c23ca7c7473b7b66bdb`.

## Start locally

Use Node 22 or newer and install the pinned dependencies with `npm ci`. Run `npm run dev` and open `/the-big-eye-teamplay/`. Production web output is built with `npm run build`; the packaged web target uses `npm run build:mobile`.

No original-app environment file or credential is required. Native billing, advertising, cloud profiles and live configuration are intentionally disabled in this foundation. The copied original store catalog is source reference only. The launcher offers only the Classic baseline, explicitly labelled as development work.

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

Run `npm run check:pr` before publishing a change, as required by AGENTS.md. Foundation-specific checks are in `tests/teamplayFoundation.test.ts`; the Classic-only launcher is covered alongside the inherited HomeHub tests. When package files change, also run `npm audit --omit=dev --audit-level=high`.

## Repository publication

A local repository has been initialized. Remote creation and pushing require a working authenticated GitHub connection. No source-repository branch or file should be changed to publish this separate product. Archived inherited deployment workflows are under `docs/teamplay/inherited-workflows/`; they must be reviewed for Teamplay before re-enabling.
