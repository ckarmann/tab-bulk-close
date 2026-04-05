# Phase 3 Migration Plan: Move Lifecycle Listeners to Background

## Objective

Move browser tab/window lifecycle handling from the tabs page runtime to the background runtime, while keeping behavior stable and minimizing churn.

## Scope

- In scope:
  - Move browser lifecycle listeners from tabs/tabs.js to js/background.js.
  - Introduce a simple UI/background message contract.
  - Refresh UI through background-driven state_changed notifications.
- Out of scope:
  - Domain/repository split (Phase 4).
  - Packaging/tooling changes (Phase 5/6).

## Step-by-Step Plan

1. Define the message contract first.
- Add a short section in design/target_architecture.md (or keep here as source of truth) with:
  - UI -> background messages:
    - command:add_group
    - command:ungroup
    - command:move_domain
    - command:toggle_lock
    - command:close_group
    - command:extract_group
    - query:get_tabs_snapshot
  - background -> UI messages:
    - state_changed
  - common payload shape:
    - { source, reason, timestamp, optionalChangedIds }

2. Introduce a background message router.
- Create js/app/message_router.js.
- Responsibilities:
  - Validate incoming message shape.
  - Dispatch command:* to existing app command modules.
  - Dispatch query:get_tabs_snapshot (current implementation path can be thin at first).
  - Return structured success/error responses.

3. Add a background notify helper.
- In js/background.js, add a helper like notifyStateChanged(reason, meta).
- Use browser.runtime.sendMessage to emit state_changed with normalized payload.
- Ensure all lifecycle handlers call this helper after successful state mutation.

4. Move lifecycle listeners to background.
- Move these listeners from tabs/tabs.js into js/background.js:
  - browser.windows.onFocusChanged
  - browser.tabs.onCreated
  - browser.tabs.onRemoved
  - browser.tabs.onActivated
  - browser.tabs.onUpdated
- Keep existing behavior as-is where possible:
  - mark tab access time updates
  - conditional refresh triggers
  - title update behavior can remain page-side until query-driven rendering is fully in place

5. Keep command invocation in background.
- Reuse existing command modules in js/app/commands.
- Background listeners should call command logic (or equivalent current service updates), then notify state_changed.

6. Simplify tabs page runtime responsibilities.
- In tabs/tabs.js:
  - Remove direct browser lifecycle listeners.
  - Keep UI interaction handlers only.
  - Subscribe to browser.runtime.onMessage and react to state_changed.
  - On state_changed, request a fresh snapshot and rerender.

7. Route UI actions through message channel.
- Gradually change UI action handlers so tabs page sends command messages to background instead of calling command modules directly.
- This can be done incrementally per command.

8. Add or stabilize snapshot query path.
- Add js/app/queries/get_tabs_snapshot.js if not present.
- Keep first version minimal:
  - gather tabs + state
  - build presenter input
  - return DTO
- The page should use query:get_tabs_snapshot to rerender after state_changed.

9. Migrate in two low-risk commits.
- Commit A:
  - Add message_router.
  - Add background message handling.
  - Add state_changed contract and page subscriber.
  - Keep existing page listeners temporarily.
- Commit B:
  - Remove page lifecycle listeners.
  - Make background the single lifecycle owner.

10. Validate with targeted tests.
- Add/adjust tests for:
  - message router dispatch and error paths.
  - background lifecycle handlers emitting state_changed.
  - tabs page refresh on state_changed.
- Keep existing command and presenter/renderer tests unchanged as safety net.

## Acceptance Criteria (Phase 3 Done)

- Lifecycle listeners exist only in js/background.js.
- tabs/tabs.js no longer listens to browser tabs/windows lifecycle events.
- UI rerender is triggered by background state_changed notifications.
- UI can request current snapshot via query message.
- Existing behavior is preserved for end users.
- Tests pass for commands, presenter/renderer, and new message/background flow.

## Notes

- Keep this phase focused on runtime ownership, not business-logic rewrites.
- Avoid mixing Phase 3 with repository/domain extraction to reduce regression risk.
- If needed, keep temporary compatibility shims and remove them in a cleanup PR after stabilization.

## Current Status (2026-04-05)

- Completed:
  - Step 1 message contract documented.
  - Step 2 message router implemented in [js/app/message_router.js](js/app/message_router.js).
  - Step 3 notify helper implemented in [js/shared/background_notify.js](js/shared/background_notify.js).
  - Step 4 lifecycle listeners centralized in [js/background.js](js/background.js).
  - Step 5 command invocation routed in background.
  - Step 6 tabs page runtime simplified in [tabs/tabs.js](tabs/tabs.js): state_changed triggers query-based rerender.
  - Step 7 UI command actions routed through runtime messages.
  - Step 8 snapshot query path implemented in [js/app/queries/get_tabs_snapshot.js](js/app/queries/get_tabs_snapshot.js).
  - Step 10 targeted tests are in place and passing for message router, background lifecycle notifications, and tabs runtime refresh flow.

- Clarification introduced during stabilization:
  - Query snapshot payload now carries `activeFilters` so presenter-driven filtering remains correct even though view-model generation happens in background.
  - Command `command:close_group` also receives `activeFilters`, ensuring close behavior matches the currently displayed filtered subset.

- Remaining:
  - Step 9 commit slicing is a delivery/process task and can be done as two commits as originally planned.
