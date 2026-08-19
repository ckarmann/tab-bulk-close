# Generic tab value polyfill

## Purpose

Define a cross-browser, generic key/value persistence layer for tabs that behaves like `session.setTabValue/getTabValue` where native support is unavailable.

The polyfill is feature-agnostic and can store any JSON-serializable payload per tab key.

## Related docs

- This file is the source of truth for the generic API and storage model.
- [tab_access_persistence_chrome_restart.md](tab_access_persistence_chrome_restart.md) is a Chrome-specific restart reconciliation profile that extends this spec without redefining it.

## Implementation sequencing

Planned order for delivery:
1. Firefox-first timestamp semantics using native session tab value APIs.
2. Generic polyfill extraction and API completion in this document.
3. Chrome restart reconciliation profile implementation.

## Compatibility contract

Expose an interface compatible with session-style tab values:

- `getTabValue(tab, key): Promise<unknown | undefined>`
- `setTabValue(tab, key, value): Promise<void>`
- `removeTabValue(tab, key): Promise<void>`
- `clearTabValues(tab): Promise<void>`

Optional helper:
- `getAllTabValues(tab): Promise<Record<string, unknown>>`

Behavioral expectations:
- if native API exists, delegate to native implementation
- if native API does not exist, use storage-backed implementation
- callers do not branch by browser

## Value model

Values are namespaced by tab and key:
- tab scope: one dictionary per tab
- key scope: arbitrary feature key (`lastUpdatedOrAccessed`, `featureX`, etc.)

Value constraints:
- must be JSON-serializable
- avoid functions, symbols, class instances
- keep values small to reduce storage churn

## Storage model

Use two logical layers.

1. Runtime index (`runtimeByTabId`)
- fast in-memory map keyed by current `tabId`
- value contains metadata + `dict: Record<string, unknown>`

2. Reconciliation archive (`archiveBySignature`)
- persistent history used only when tab IDs change across restart
- stores the same `dict` payload generically (not timestamp-specific)

## Record schema

### Runtime record

- `tabId: number`
- `url: string | undefined`
- `windowId: number | undefined`
- `index: number | undefined`
- `lastAccessed: number | undefined`
- `updatedAt: number`
- `dict: Record<string, unknown>`

### Archive candidate

- `signature: string`
- `url: string | undefined`
- `windowId: number | undefined`
- `index: number | undefined`
- `lastAccessed: number | undefined`
- `savedAt: number`
- `dict: Record<string, unknown>`
- `source: "tab_removed" | "shutdown_snapshot"`

## Matching and reconciliation

When restoring after restart:

1. Build tab signature from normalized URL.
2. Find archive candidates with same signature.
3. Prefer highest score candidate using metadata (`index`, `lastAccessed`, recency).
4. Hydrate runtime record with selected candidate `dict`.

Scoring example:
- +5 exact signature
- +2 index match
- +2 close lastAccessed
- +2 savedAt recent (<24h)

On tie:
- newest candidate wins
- consume selected candidate once

## Write strategy

- all set/remove/clear operations mutate runtime memory first
- persist debounced batches to `browser.storage.local`
- on tab removed, move runtime record into archive and remove runtime entry

## Error handling

- malformed persisted data: ignore entry and continue
- storage write failures: keep runtime value and retry on next flush
- missing tab fields: still allow dictionary operations

## Limits and quotas

- enforce per-tab max keys (recommended: 100)
- enforce per-value serialized size cap (recommended: 16 KB)
- enforce global archive retention (recommended: 30 days)
- bound candidates per signature (recommended: 5)

## Security and privacy

- store only extension-required data
- never store page content
- document keys used by each feature
- ensure clear/reset operation removes runtime + archive data

## Migration

If current implementation is timestamp-specific:

1. keep existing key names as-is
2. migrate record schema to include generic `dict`
3. keep timestamp feature as one consumer of generic store
4. add tests for generic non-timestamp keys

## Test checklist

1. Generic set/get/remove works with primitive and object values.
2. Runtime survives tab updates/moves/attach/detach.
3. Restart reconciliation restores generic dict values.
4. Non-existent key returns `undefined`.
5. Delegation to native sessions API works when available.
6. Quota guards reject oversized value safely.
