# Target architecture for tabcloser

## Goals

- Keep browser-specific details behind adapter interfaces.
- Keep business use cases independent from UI and browser APIs.
- Keep UI code mostly focused on rendering and interaction dispatch.
- Make cross-browser behavior explicit and testable.
- Support incremental migration without a full rewrite.

## Proposed folder layout

```text
.
|-- manifest.json
|-- chrome/
|   `-- manifest.json
|-- firefox/
|   `-- manifest.json
|-- css/
|   `-- normalize.css
|-- icons/
|-- design/
|   |-- tab_access_date.md
|   `-- target_architecture.md
|-- tabs/
|   |-- tabs.html
|   |-- tabs.css
|   `-- tabs.js                    # UI entrypoint only
|-- third_party/
|   |-- dayjs/
|   |   |-- dayjs.js
|   |   `-- plugin/
|   |       `-- relativeTime.js
|   |-- mustache/
|   |   `-- mustache.js
|   |-- webextension-polyfill/
|   |   `-- browser-polyfill.js
|   `-- THIRD_PARTY.md             # source/version/license/checksum for vendored libs
`-- js/
    |-- background.js              # background entrypoint only
    |-- app/
    |   |-- commands/
    |   |   |-- add_group.js
    |   |   |-- close_group.js
    |   |   |-- extract_group.js
    |   |   |-- move_domain.js
    |   |   |-- toggle_lock.js
    |   |   `-- ungroup.js
    |   |-- queries/
    |   |   `-- get_tabs_snapshot.js
    |   `-- message_router.js      # maps UI/background messages to app handlers
    |-- domain/
    |   |-- tab_grouping.js        # apply grouping and group/domain calculations
    |   |-- tab_filters.js         # pure filter predicates
    |   |-- tab_metadata.js        # duplicate detection and day bucket logic
    |   `-- types.js               # JSDoc typedefs for shared structures
    |-- infra/
    |   |-- browser/
    |   |   |-- tabs_gateway.js
    |   |   |-- windows_gateway.js
    |   |   |-- storage_gateway.js
    |   |   `-- sessions_gateway.js
    |   |-- repositories/
    |   |   |-- state_repository.js
    |   |   `-- tab_state_repository.js
    |   `-- mappers/
    |       `-- tab_mapper.js
    |-- ui/
    |   |-- controllers/
    |   |   |-- tabs_page_controller.js
    |   |   |-- drag_drop_controller.js
    |   |   `-- keyboard_controller.js
    |   |-- presenters/
    |   |   `-- tabs_presenter.js
    |   |-- renderers/
    |   |   `-- tabs_renderer.js
    |   `-- filters/
    |       `-- filters_controller.js
    |-- shared/
    |   |-- events.js              # small event bus helpers
    |   |-- logger.js
    |   `-- constants.js
    `-- vendor/
        `-- vendor_loader.js       # optional helper for loading/centralizing vendor globals
```

## Third-party dependency policy

- Keep third-party libraries committed in the repository for inspectability.
- Isolate all third-party source under `third_party/`.
- Keep application code under `js/` and `tabs/`; do not mix app modules with vendored source.
- Track each vendored dependency in `third_party/THIRD_PARTY.md` with:
  - upstream URL
  - exact version
  - license type
  - date imported
  - optional checksum/signature

Recommended import strategy:

- Use explicit paths from `tabs/tabs.html` to `third_party/...` scripts.
- If you later adopt ESM wrappers, keep wrappers in `js/vendor/` and leave upstream files untouched.
- Avoid editing vendored files directly; patch with wrapper code or document local patch diffs in `THIRD_PARTY.md`.

## Responsibilities by layer

### 1) Entrypoints

- `js/background.js`
  - Boot background runtime.
  - Register browser event listeners.
  - Forward events into app commands.
  - Serve query/command messages from UI.
- `tabs/tabs.js`
  - Boot page controllers.
  - Request initial snapshot.
  - Subscribe to state updates.
  - No business logic.

### 2) App layer (use cases)

- Located in `js/app/commands` and `js/app/queries`.
- Orchestrates domain + repositories + gateways.
- No DOM access.
- No direct template rendering.

Examples:
- `close_group.js` decides which tabs are closable, then asks gateway to remove tabs.
- `get_tabs_snapshot.js` gathers tabs, state, filter state, and builds a DTO for presenter.

### 3) Domain layer (pure logic)

- Located in `js/domain`.
- No browser API calls.
- No storage access.
- No UI references.

Examples:
- Grouping calculations.
- Duplicate detection.
- Date bucket assignment (`today`, `yesterday`, etc.).
- Lock and closable rules.

### 4) Infra layer

- Located in `js/infra`.
- Encapsulates browser API differences and persistence details.

Repositories:
- `state_repository.js` for groups/mapping/locked URLs.
- `tab_state_repository.js` for per-tab metadata (`lastUpdatedOrAccessed`) with fallback strategy.

Gateways:
- One file per browser API surface (`tabs`, `windows`, `storage`, `sessions`).

### 5) UI layer

- Located in `js/ui`.
- Controllers translate user events into app commands.
- Presenter maps DTOs to a render-friendly view model.
- Renderer performs Mustache rendering and targeted DOM patching.

## Dependency rules

- `ui -> app`
- `app -> domain, infra, shared`
- `infra -> shared`
- `domain -> shared` (optional)
- `background entrypoint -> app + infra gateways`
- `tabs entrypoint -> ui + app(query client)`

Forbidden dependencies:
- `domain -> browser API`
- `domain -> DOM`
- `renderer -> browser API`
- `controller -> repository`

## Runtime data flow

### Background-driven state updates

1. Browser tab/window event fires in background.
2. Background calls app command.
3. Command updates repositories as needed.
4. Background emits `state_changed` message with a lightweight payload (or invalidation token).
5. Tabs page fetches fresh snapshot via query and rerenders.

### UI-driven commands

1. User action in tabs page controller.
2. Controller sends command message (for example, `close_group`).
3. Background executes command and persists changes.
4. Background emits `state_changed`.
5. UI requests query snapshot and rerenders.

### Message contract (Phase 3)

Use `browser.runtime.sendMessage` for UI/background communication.

UI -> background message envelope:

```json
{
  "type": "command:add_group | command:ungroup | command:move_domain | command:toggle_lock | command:close_group | command:extract_group | query:get_tabs_snapshot",
  "payload": {},
  "requestId": "optional-string"
}
```

Background -> UI event envelope:

```json
{
  "type": "state_changed",
  "payload": {
    "source": "background",
    "reason": "tab_created | tab_removed | tab_updated | tab_activated | window_focus_changed | command:add_group | command:ungroup | command:move_domain | command:toggle_lock | command:close_group | command:extract_group",
    "timestamp": 0,
    "changedTabIds": []
  }
}
```

Background direct response for request/response calls:

```json
{
  "ok": true,
  "requestId": "optional-string",
  "result": {}
}
```

```json
{
  "ok": false,
  "requestId": "optional-string",
  "error": {
    "code": "invalid_message | unknown_type | execution_failed",
    "message": "human-readable"
  }
}
```

Contract notes:

- `state_changed` is an invalidation event; UI should fetch fresh snapshot via `query:get_tabs_snapshot`.
- `requestId` is optional but recommended for tracing/debug logs.
- `changedTabIds` is optional and can remain empty until incremental refresh is implemented.

## Suggested file mapping from current code

- Current `js/state_service.js`
  - Split into:
    - `js/infra/repositories/state_repository.js`
    - `js/domain/tab_grouping.js`
    - `js/domain/tab_metadata.js`
- Current `js/tabs_service.js`
  - Split into:
    - `js/infra/repositories/tab_state_repository.js`
    - `js/infra/browser/tabs_gateway.js`
    - `js/infra/browser/sessions_gateway.js`
- Current `tabs/tabs_view.js`
  - Split into:
    - `js/ui/presenters/tabs_presenter.js`
    - `js/ui/renderers/tabs_renderer.js`
- Current `tabs/tabs.js`
  - Keep as entrypoint and move logic into:
    - `js/ui/controllers/tabs_page_controller.js`
    - `js/ui/controllers/drag_drop_controller.js`
    - `js/ui/controllers/keyboard_controller.js`
    - `js/app/commands/*`

## Incremental migration plan

### Phase 1: Extract app commands (low risk)

- Create `js/app/commands` files for each user action.
- Keep existing call sites but route logic through command modules.
- Keep behavior unchanged.

### Phase 2: Separate presenter from renderer

- Move data shaping from current view module into `tabs_presenter.js`.
- Keep Mustache templates and rendering strategy unchanged.

### Phase 2.5: Introduce browser gateways

- Create concrete `tabs_gateway.js` and `windows_gateway.js` modules as soon as commands need browser APIs.
- Replace inline `browser.tabs` and `browser.windows` wrapper objects in commands with imports from `js/infra/browser/`.
- Keep `storage_gateway.js` and `sessions_gateway.js` for the later repository split, when that value becomes immediate.
- Benefit: commands become easier to test and the future background migration has a clear API boundary.

### Phase 3: Move browser lifecycle listeners to background

- Move tab/window event listeners from tabs page runtime into background runtime.
- Introduce simple message channel for UI refresh.

### Phase 4: Split repositories from domain logic

- Extract pure functions to `js/domain`.
- Keep repository modules focused on persistence and browser APIs.

### Phase 5: Normalize manifests and packaging

- Keep browser-specific manifests.
- Add a small build/copy script to generate effective root manifest from source templates.

### Phase 6: Introduce WXT (optional but recommended long-term)

- Add WXT as the packaging/build layer after architecture boundaries are stable.
- Keep the same domain/app/ui/infra module boundaries; only change build and manifest orchestration.
- Start with a no-behavior-change migration:
  - produce equivalent background and tabs page entrypoints
  - keep existing HTML/CSS templates
  - keep vendored dependencies in `third_party/`
- Move browser-specific manifest differences into WXT config/env handling.
- Add release scripts for browser-specific artifacts (Chrome zip, Firefox zip/xpi).

Suggested WXT adoption steps:

1. Initialize WXT in a migration branch and configure equivalent entrypoints.
2. Verify generated manifests match current permission and background behavior.
3. Point UI script references to the same modules used today.
4. Add CI task to build both browser targets.
5. Remove manual manifest copy workflow from README once builds are verified.

WXT adoption criteria (when to switch):

- You maintain multiple extension pages or content scripts.
- Manual manifest sync starts causing drift.
- You need consistent release packaging and automated checks.
- You want typed config and cleaner dev/prod build workflows.

## Testing strategy after migration

- Domain unit tests (pure logic): grouping, duplicate detection, closable rules.
- App integration tests with mocked gateways/repositories: command behavior.
- Lightweight UI tests for presenter and renderer snapshots.

## Naming conventions

- Commands: verb_noun (`close_group.js`, `move_domain.js`).
- Queries: `get_*` (`get_tabs_snapshot.js`).
- Repositories: `*_repository.js`.
- Gateways: `*_gateway.js`.
- Presenters/renderers/controllers keep explicit suffix names.

## Practical notes for this project

- Keep `tabregistry` code as inspiration only; do not include it in runtime paths.
- Preserve current templates and styling until architecture split is complete.
- Prefer message contracts over importing background internals into tabs page code.
- Keep third-party code visible, but isolated in `third_party/`.
- Adopt WXT only after Phase 1-4 boundaries are in place, to avoid mixing architecture refactor with toolchain migration.

## Definition of done for the refactor

- `tabs/tabs.js` is mostly wiring.
- Background owns browser lifecycle listeners.
- Domain modules are browser-agnostic and testable.
- Repositories/gateways are the only place with browser API calls.
- UI rendering path is presenter -> renderer with clear boundaries.
