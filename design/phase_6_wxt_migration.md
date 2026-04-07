# Phase 6: WXT + TypeScript Migration Plan

## Decision

This phase moves the project immediately to:

- WXT for build/dev/package orchestration
- TypeScript for application source
- WXT-managed manifest generation for Chrome and Firefox

The migration is tooling-first and behavior-preserving.

## Goals

- Keep the existing architecture boundaries (domain, app, infra, ui)
- Remove manual manifest synchronization and drift
- Support Chrome and Firefox builds from one configuration
- Introduce static typing for message contracts and state/view models
- Preserve current user-visible behavior while changing tooling

## Non-goals

- No feature rewrite during migration
- No UI redesign
- No domain behavior changes except type-driven fixes

## Scope

In scope:

- WXT setup and browser targets
- Manifest migration into WXT config
- TypeScript configuration and incremental conversion
- Build scripts, CI, and docs updates

Out of scope for this phase:

- New runtime features
- Deep optimization/refactor unrelated to WXT/TS adoption

## Baseline Before Starting

1. Branch off from current `refactoring` state.
2. Confirm tests pass.
3. Capture parity checklist for both browsers:
	- Open tabs page
	- Load snapshot
	- Add/rename/remove group
	- Move domain
	- Toggle lock
	- Close group
	- Extract group

## Migration Principles

- Keep changes small and reversible.
- Migrate tooling first, code second.
- Keep JS and TS coexisting temporarily.
- Validate in both Chrome and Firefox at each milestone.
- Keep one source of truth for manifests (WXT config).

## Execution Status

Current status snapshot:

- M1 - Scaffold WXT Without Behavior Changes: DONE
- M2 - Move Manifest Ownership to WXT: DONE
- M3 - Establish TypeScript Foundation: DONE
- M4 - Incremental TS Conversion by Layer: DONE
- M5 - Build, CI, and Release Workflow: DONE
- M6 - Cleanup Legacy Workflow: DONE

Detailed checklist:

- [x] M1.1 Add WXT dependencies and scripts in `package.json`
- [x] M1.2 Add WXT config and entrypoint wiring
- [x] M1.3 Map WXT entrypoints to existing runtime logic
- [x] M1 Acceptance: `dev` works for Chrome and Firefox
- [x] M1 Acceptance: tests still pass

- [x] M2.1 Port shared manifest fields into WXT config
- [x] M2.2 Encode browser-specific differences in WXT config
- [x] M2.3 Verify generated manifests for Firefox/Chrome
- [x] M2 Acceptance: no manual manifest copy required
- [x] M2 Acceptance: runnable outputs include tabs page and icons

- [x] M3.1 Add `tsconfig` and typecheck script
- [x] M3.2 Configure JS+TS interoperability
- [x] M3.3 Introduce shared type contracts (messages/state/view-models)
- [x] M3 Acceptance: typecheck runs
- [x] M3 Acceptance: existing JS modules continue to run

- [x] M4.0 Update Vitest config to include JS/TS tests and coverage inputs
- [x] M4.1 Convert first low-risk pure modules to TypeScript (`js/shared/filter_state.ts`, `js/domain/tab_duplicates.ts`, `js/domain/tab_grouping.ts`)
- [x] M4.2 Convert additional simple shared/domain modules (`js/domain/tab_enrichment.ts`, `js/shared/background_notify.ts`)
- [x] M4.3 Convert `js/app` commands and queries (`js/app/commands/*.ts`, `js/app/queries/get_tabs_snapshot.ts`, `js/app/message_router.ts`)
- [x] M4.4 Convert `js/infra` gateways and repositories (`js/infra/browser/*.ts`, `js/infra/repositories/state_repository.ts`)
- [x] M4.5 Convert `js/ui` presenter/renderer/controllers
- [x] M4.6 Convert entrypoints and all 20 tests to TypeScript

- [x] M5.1 Finalize local npm scripts (Firefox default + explicit Chrome commands)
- [x] M5.2 Add CI jobs (test + typecheck + dual browser builds)
- [x] M5.3 Produce release artifact flow in CI

- [x] M6 All tasks

## Manifest Management Strategy

WXT config becomes the only manifest source of truth.

Shared manifest fields in base config:

- Name/version/description
- Icons/action
- Permissions

Per-browser overrides in WXT target config:

- Chrome:
  - `background.service_worker`
  - Any Chrome-specific metadata if needed
- Firefox:
  - `background.scripts`
  - `browser_specific_settings.gecko.id`

Important note:

- Browsers require the file name to be exactly `manifest.json`.
- The correct way to test both simultaneously is separate WXT output directories (for example `.output/firefox-mv3` and `.output/chrome-mv3`), each containing its own `manifest.json`.

## Milestones

### M1 - Scaffold WXT Without Behavior Changes

Tasks:

1. Add WXT dependencies and scripts in `package.json`.
2. Add WXT config and entrypoint wiring.
3. Map WXT entrypoints to existing runtime logic (`js/background.ts`, tabs page flow).

Acceptance criteria:

- `dev` works for Chrome
- `dev` works for Firefox
- Existing behavior parity checklist still passes

### M2 - Move Manifest Ownership to WXT

Tasks:

1. Port shared manifest fields from current baseline into WXT config.
2. Encode browser-specific differences as target overrides.
3. Verify generated manifests are valid and behavior-equivalent.

Acceptance criteria:

- No manual manifest copy workflow required
- Chrome and Firefox extension loads succeed
- Permission/background behavior unchanged

### M3 - Establish TypeScript Foundation

Tasks:

1. Add `tsconfig` and typecheck script.
2. Configure JS+TS interoperability for incremental conversion.
3. Introduce core shared types:
	- Message envelopes
	- Repository state data shape
	- Presenter/view-model DTOs

Acceptance criteria:

- Typecheck runs successfully
- Existing JS modules continue to run

### M4 - Incremental TS Conversion by Layer

Recommended conversion order:

1. `js/shared` and pure `js/domain`
2. `js/app` commands and queries
3. `js/infra` gateways and repositories
4. `js/ui` presenter/renderer/controllers
5. Entrypoints

Acceptance criteria:

- Converted modules compile cleanly
- Tests stay green after each slice
- No behavior regressions in browser smoke checks

### M5 - Build, CI, and Release Workflow

Tasks:

1. Finalize scripts for:
	- dev chrome
	- dev firefox
	- build chrome
	- build firefox
	- test
	- typecheck
2. Add CI jobs for test + typecheck + dual builds.
3. Produce browser-specific artifacts from WXT output.

Acceptance criteria:

- Reproducible build outputs for both browsers
- CI verifies both targets

### M6 - Cleanup Legacy Workflow

Tasks:

1. Remove or archive manual manifest generation/copy scripts.
2. Remove obsolete duplicate manifest maintenance docs.
3. Update contributor workflow docs and architecture docs.

Acceptance criteria:

- Exactly one documented build/manifest workflow (WXT)
- No stale or conflicting instructions

## Developer Workflow After Migration

Typical daily workflow:

1. Run dev server for one browser target.
2. Load extension from WXT output for that target.
3. Edit code; WXT rebuilds/reloads extension contexts.
4. For Firefox and Chrome side-by-side testing, run each target separately and load from each output directory.

Live reload expectations:

- Extension pages: reload/HMR depending on context
- Background: restart/reload when code changes
- Manifest changes: extension reload required
- Content scripts on already-open tabs may require tab refresh in some cases

## Validation Matrix (Run Continuously)

At each milestone validate:

1. Unit and integration tests
2. Typecheck
3. Chrome smoke checklist
4. Firefox smoke checklist
5. Message flow (`state_changed` invalidation + snapshot refresh)

## Risks and Mitigations

1. Entry-point mismatch during migration
	- Mitigation: adapt wiring first, keep existing modules unchanged
2. Manifest regressions
	- Mitigation: compare generated manifests and smoke test both browsers
3. TS migration churn
	- Mitigation: convert in small slices with strict CI checks
4. Browser API differences
	- Mitigation: test each target independently in every PR

## Suggested PR Breakdown

1. PR-1: WXT scaffold and scripts, no logic changes
2. PR-2: Manifest management moved to WXT config
3. PR-3: TypeScript foundation and shared contracts
4. PR-4+: Layered conversion batches (domain/app/infra/ui)
5. Final PR: cleanup old workflow + docs

## Definition of Done

- WXT is the authoritative build/dev/package system
- Manifest is generated from WXT config with browser-specific overrides
- Core code is migrated to TypeScript (or has an explicit remaining list)
- Tests and typecheck are green in CI
- Chrome and Firefox builds both run without manual manifest edits
