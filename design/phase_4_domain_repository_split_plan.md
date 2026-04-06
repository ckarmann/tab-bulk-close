# Phase 4 Migration Plan: Split Repositories from Domain Logic

## Objective

Separate pure tab business rules from persistence/browser access so the codebase can evolve safely:
- domain logic stays pure and reusable,
- repositories own storage/browser interactions,
- app commands/queries orchestrate both.

## Scope

- In scope:
  - Extract pure tab domain rules from `js/state_service.js` into `js/domain/*` modules.
  - Introduce repository modules in `js/infra/repositories/*` for state access.
  - Keep active filter behavior explicit at app/query/command boundaries.
  - Keep runtime ownership from Phase 3 unchanged (background remains lifecycle owner).
- Out of scope:
  - UI controller decomposition beyond what is required for wiring.
  - Build/packaging changes (Phase 5+).
  - Manifest/toolchain migration.

## Design Principles

- Pure functions in domain modules:
  - no `browser.*`, no storage, no DOM.
- Repositories are adapters:
  - they read/write extension state and return plain data.
- Commands/queries orchestrate:
  - they pass explicit inputs to domain (including `activeFilters` when needed).
- No implicit cross-runtime state:
  - avoid global mutable shared assumptions across page/background.

## Step-by-Step Plan

1. Define target seams before moving code.
- Domain modules to create:
  - `js/domain/tab_enrichment.js`
  - `js/domain/tab_grouping.js`
  - `js/domain/tab_duplicates.js`
- Repository module to create:
  - `js/infra/repositories/state_repository.js`
- Keep backward-compatible wrappers during migration.

2. Extract pure grouping and duplicate helpers first.
- Move `cleanMapping`, grouping classification, and duplicate detection from `js/state_service.js`.
- Ensure these modules accept explicit inputs and return plain values.
- Add focused unit tests for extracted functions.

3. Extract enrichment logic as pure domain function.
- Move `enrichTabs` internals to `js/domain/tab_enrichment.js`.
- Inputs should include:
  - `tabs`
  - `lockedUrls`/lookup or state accessor callbacks
  - `activeFilters`
  - a `dayjs` callable (injected dependency)
- Output should be deterministic enriched tab objects/fields.

4. Introduce repository for extension state.
- Create `js/infra/repositories/state_repository.js` with methods:
  - `loadState()`
  - `saveState(state)`
  - optional focused mutation helpers (`setDomainGroup`, `addGroup`, `removeGroup`, `toggleLock`).
- Keep storage keys stable to avoid behavior change.

5. Thin down `js/state_service.js` into transitional facade.
- Keep existing exported API shape to minimize churn.
- Internally delegate:
  - persistence to repository,
  - business rules to domain modules.
- Remove mixed responsibilities incrementally, not in one large rewrite.

6. Rewire app commands/queries to use seams.
- `js/app/queries/get_tabs_snapshot.js`:
  - load via repository/facade,
  - call presenter with explicit `activeFilters`.
- `js/app/commands/close_group.js`:
  - keep explicit `activeFilters` payload,
  - call domain filter matcher/enrichment logic explicitly.

7. Stabilize runtime contract (no behavioral drift).
- Preserve Phase 3 contract:
  - `query:get_tabs_snapshot` payload can include `activeFilters`.
  - `command:close_group` payload includes `activeFilters`.
- Keep `state_changed` invalidation semantics unchanged.

8. Clean up legacy paths once stable.
- Remove dead helper code from `js/state_service.js` once references are gone.
- Keep `js/state_service.js.backup` untouched unless explicitly requested.
- Keep module names and import paths consistent with `design/target_architecture.md`.

9. Migrate in three low-risk commits.
- Commit A: introduce new domain/repository modules + pure unit tests.
- Commit B: delegate existing `state_service.js` to new modules (no API changes).
- Commit C: rewire app command/query call sites and remove dead internal helpers.

10. Validate with targeted tests.
- Domain tests:
  - enrichment, grouping, duplicates, filter matching behavior.
- App tests:
  - query snapshot path with explicit `activeFilters`.
  - close-group filtered closing behavior.
- Runtime flow tests:
  - keep existing Phase 3 message-flow tests green.

## Acceptance Criteria (Phase 4 Done)

- Domain rules are isolated in `js/domain/*` pure modules.
- Persistence/browser access is isolated to repository/gateway modules.
- `js/state_service.js` is thin facade or deprecated with no core business logic.
- `query:get_tabs_snapshot` and `command:close_group` continue to honor explicit `activeFilters`.
- No regression in existing user-visible behavior.
- Tests pass for domain, app, and runtime flow.

## Current Status (2026-04-05)

- Completed:
  - Domain modules are extracted and covered by dedicated unit tests.
  - `js/infra/repositories/state_repository.js` owns state persistence plus focused mutations.
  - App command handlers now depend on repository/domain seams rather than `js/state_service.js`.
  - `js/app/queries/get_tabs_snapshot.js` loads state through the repository seam.
  - `js/ui/presenters/tabs_presenter.js` consumes plain state data and domain helpers (no `StateService` coupling).
  - `js/state_service.js` has been removed from runtime paths and deleted.
  - Query/presenter tests were added/updated to validate explicit `activeFilters` and repository loading behavior.

## Risks and Mitigations

- Risk: hidden coupling in `state_service.js` causes regressions.
  - Mitigation: keep API compatibility wrapper while extracting internals.
- Risk: enrichment/filter behavior diverges between query and command paths.
  - Mitigation: share pure functions for filter matching and enrichment.
- Risk: broad edits create noisy diffs.
  - Mitigation: commit slicing by seam (extract, delegate, rewire).

## Suggested First PR Slice

1. Add `js/domain/tab_grouping.js`, `js/domain/tab_duplicates.js`, and tests.
2. Add `js/infra/repositories/state_repository.js` with simple load/save wrappers.
3. Make `js/state_service.js` call those modules internally without changing callers.
4. Run full test suite and verify no behavior changes.
