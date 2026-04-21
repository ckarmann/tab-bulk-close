# Tabcloser Architecture

## Purpose

Tabcloser is a browser extension that helps users organize and bulk-close tabs by group, domain, lock state, duplicate status, date bucket, and window.

The architecture is organized into clear layers so UI behavior, business logic, and browser integration stay separate and testable.

## High-Level Runtime Model

The extension has two runtimes:

1. Background runtime
2. Tabs page runtime

The background runtime owns browser lifecycle events and command/query handling.
The tabs page runtime owns rendering and user interaction.

Both runtimes communicate through runtime messages with typed contracts defined in `js/shared/contracts.ts`.

## Source Layout

Files are organized by the runtime they belong to, then by layer within that runtime.

### Build entrypoints (not runtime code)

- `wxt.config.ts` — build and manifest configuration
- `entrypoints/background.ts` — boots polyfills and starts the background runtime
- `entrypoints/tabs/index.html` — tabs page shell
- `entrypoints/tabs/main.ts` — boots styles, polyfills, and starts the tabs page runtime

### Background runtime

All of the following runs exclusively in the background service worker:

- `js/background.ts` — lifecycle listeners, message handler registration
- App layer (`js/app/`):
  - `js/app/message_router.ts`
  - `js/app/commands/add_group.ts`
  - `js/app/commands/ungroup.ts`
  - `js/app/commands/move_domain.ts`
  - `js/app/commands/toggle_lock.ts`
  - `js/app/commands/close_group.ts`
  - `js/app/commands/extract_group.ts`
  - `js/app/queries/get_tabs_snapshot.ts`
- Domain layer (`js/domain/`):
  - `js/domain/tab_grouping.ts`
  - `js/domain/tab_enrichment.ts`
  - `js/domain/tab_duplicates.ts`
- Infrastructure layer (`js/infra/`):
  - `js/infra/repositories/state_repository.ts`
  - `js/infra/browser/tabs_gateway.ts`
  - `js/infra/browser/windows_gateway.ts`
- `js/tabs_service.ts` — tab snapshot retrieval and per-tab metadata, used by app queries

### Tabs page runtime (UI)

All of the following runs exclusively in the tabs page:

- `tabs/tabs.ts` — page wiring entrypoint, delegates to controllers
- `css/tabs.css` — page styles
- UI layer (`js/ui/`):
  - `js/ui/controllers/tabs_page_controller.ts`
  - `js/ui/controllers/drag_drop_controller.ts`
  - `js/ui/controllers/keyboard_controller.ts`
  - `js/ui/presenters/tabs_presenter.ts`
  - `js/ui/renderers/tabs_renderer.ts`
  - `js/ui/templates/group-template.mustache`
  - `js/ui/templates/group-shortcut-template.mustache`
  - `js/ui/templates/window-filter-template.mustache`
- `js/filters.ts` — active filter state, owned by the tabs page

### Shared (both runtimes)

These modules are imported by both the background and the tabs page:

- `js/shared/contracts.ts` — typed message/event envelopes
- `js/shared/background_notify.ts` — state_changed event emitter
- `js/shared/browser_polyfill.ts` — cross-browser polyfill loader
- `js/shared/dayjs_runtime.ts` — date formatting helpers
- `js/shared/filter_state.ts` — filter type definitions
- `js/shared/logger.ts` — toggleable debug logger

## Layer Responsibilities

### Entrypoints

- `entrypoints/background.ts` boots polyfills and background runtime.
- `entrypoints/tabs/main.ts` boots styles, polyfills, and tabs UI runtime.
- `tabs/tabs.ts` is the tabs page wiring entrypoint and delegates to controllers.

### Background Layer (background runtime)

- `js/background.ts` registers:
  - browser action click handler
  - runtime message listener for command:* and query:* messages
  - tab and window lifecycle listeners
- Lifecycle listeners emit state_changed invalidation events through `js/shared/background_notify.ts`.

### App Layer (background runtime)

- `js/app/message_router.ts` validates incoming request envelopes and dispatches handlers.
- Command handlers implement use cases:
  - add/ungroup/move/toggle lock/close/extract
- Query handler builds snapshot responses:
  - `js/app/queries/get_tabs_snapshot.ts`

### Domain Layer (background runtime)

Pure logic modules without DOM access:

- `js/domain/tab_grouping.ts`: grouping rules and mapping cleanup
- `js/domain/tab_enrichment.ts`: computed tab fields
- `js/domain/tab_duplicates.ts`: duplicate detection helpers

### Infrastructure Layer (background runtime)

Browser and persistence adapters:

- `js/infra/repositories/state_repository.ts`
  - owns persisted state for groups, mapping, and locked URLs via storage.local
- `js/infra/browser/tabs_gateway.ts`
  - tabs API wrapper for get/query/update/remove/move
- `js/infra/browser/windows_gateway.ts`
  - windows API wrapper for get/create/update
- `js/tabs_service.ts`
  - tab snapshot retrieval and per-tab metadata access
  - uses sessions API when available, with storage-backed fallback logic

### UI Layer (tabs page runtime)

- `js/ui/controllers/tabs_page_controller.ts`
  - wires click handlers, runtime subscriptions, and snapshot refresh
  - sends command messages to background
- `js/ui/controllers/drag_drop_controller.ts`
  - drag-and-drop interaction wiring
- `js/ui/controllers/keyboard_controller.ts`
  - keyboard shortcuts and focus behavior
- `js/ui/presenters/tabs_presenter.ts`
  - transforms tabs and state into render-ready view model
- `js/ui/renderers/tabs_renderer.ts`
  - renders Mustache templates into DOM regions

## Message Contract

Typed contracts are defined in `js/shared/contracts.ts`.

Request message types:

- command:add_group
- command:ungroup
- command:move_domain
- command:toggle_lock
- command:close_group
- command:extract_group
- query:get_tabs_snapshot

Request envelope fields:

- type
- payload
- optional requestId

Response envelope fields:

- ok true with result
- ok false with error code and message
- optional requestId in both success and error responses

State invalidation event:

- type: state_changed
- payload includes source, reason, timestamp, changedTabIds
- payload can include extra metadata, for example title in title update events

## Runtime Flows

### UI Command Flow

1. User action is captured by a UI controller in `js/ui/controllers/tabs_page_controller.ts`.
2. Controller sends command:* message to background.
3. Background dispatches to an app command through `js/app/message_router.ts`.
4. Command updates repositories and/or browser resources.
5. Background emits state_changed.
6. UI requests query:get_tabs_snapshot and rerenders.

### Background Lifecycle Flow

1. Browser tab/window event is received in `js/background.ts`.
2. Background updates tab access metadata if needed.
3. Background emits state_changed through `js/shared/background_notify.ts`.
4. Tabs page receives invalidation and refreshes from query snapshot.

### Snapshot Query Flow

1. UI sends query:get_tabs_snapshot.
2. `js/app/queries/get_tabs_snapshot.ts` loads persistent state and current tabs.
3. Presenter builds a TabsViewModel.
4. UI renderer renders grouped and filtered output.

## Data Ownership

- Persistent grouping state:
  - groups
  - mapping
  - lockedUrls
  - owned by `js/infra/repositories/state_repository.ts`
- Per-tab metadata:
  - lastUpdatedOrAccessed
  - accessed via `js/tabs_service.ts`
- Filter UI state:
  - held on the tabs page by `js/filters.ts`

## Dependency Rules

Allowed direction:

- UI -> App
- App -> Domain
- App -> Infrastructure
- App -> Shared
- Infrastructure -> Shared
- Background entrypoint -> App plus Shared

Forbidden direction:

- Domain -> browser APIs
- Domain -> DOM
- Renderer -> browser APIs
- Controllers -> repositories directly

## Why These Decisions

- Background owns lifecycle listeners:
  Keeps a single source of truth for tab/window events and avoids duplicated event handling across pages.
- Message-based UI/background contract:
  Decouples UI from background internals and makes command/query behavior easy to test with typed payloads.
- Layered split (UI, app, domain, infra):
  Keeps business rules independent from browser APIs and DOM concerns, which reduces regression risk during changes.
- Presenter + renderer separation:
  Presenter shapes data once; renderer focuses only on DOM/template output. This keeps rendering logic simple.
- Repository + gateway adapters:
  Browser and storage access are isolated, so command behavior can be tested with mocks instead of full extension runtime.
- Query-based refresh after state_changed:
  UI receives invalidation events and fetches a fresh snapshot, which prevents stale incremental client state.
- Typed contracts in shared module:
  Request/response/event payloads stay explicit and consistent across layers as features evolve.

## Trade-offs

- More modules and message plumbing:
  The architecture introduces additional files and indirection compared with a single-runtime script.
- Slightly higher latency on UI actions:
  Commands go through runtime messaging and then trigger a query refresh, which can be slower than direct local mutation.
- Strong boundaries require discipline:
  Keeping domain/browser/UI separation clean takes ongoing review effort during feature work.
- Snapshot refresh can do extra work:
  Fetching full state after invalidation is robust but may recompute more than strictly necessary for small changes.
- Better long-term maintainability:
  The added structure improves testability, reduces coupling, and makes cross-browser behavior easier to reason about.

## Build and Packaging

- WXT is the single build and manifest source in `wxt.config.ts`.
- Entry bundles are defined through `entrypoints/background.ts` and `entrypoints/tabs/main.ts`.
- Runtime dependencies are managed in package.json and locked in package-lock.json.

## Testing Strategy

Tests are organized by layer under `tests`:

- Domain logic tests
- App command/query and router tests
- Infra adapter and repository tests
- UI presenter/renderer/controller tests
- Background runtime behavior tests
- Shared utility and filter behavior tests

This structure keeps business logic and runtime messaging testable without full browser end-to-end coupling.

## Contributor Guidance

When adding or changing behavior:

1. Put business decisions in app or domain modules.
2. Keep browser API calls in infrastructure adapters or background runtime.
3. Keep tabs page focused on interaction and rendering.
4. Extend contracts in `js/shared/contracts.ts` before adding new message types.
5. Prefer query-driven refresh after background invalidation events.
6. Use `js/shared/logger.ts` for debug output so logs can be enabled or disabled without code changes.
