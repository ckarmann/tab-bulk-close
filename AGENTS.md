# AGENTS.md

## 30-Second Checklist

1. Read design/target_architecture.md and keep layer boundaries intact.
2. Never edit generated folders: .output/, .wxt/, coverage/.
3. Use js/shared/contracts.ts first when changing messages.
4. Use js/shared/logger.ts for debug output (no raw console.log in hot paths).
5. For non-trivial work, run: npm run compile, npm test, then at least one build target.

## Purpose

This file provides operational guidance for coding agents working in this repository.
It is optimized for safe, incremental changes and architecture consistency.

## Project Snapshot

- Stack: TypeScript, WXT, Vitest
- Targets: Firefox MV3 and Chrome MV3
- Build source of truth: wxt.config.ts
- Runtime architecture: background runtime + tabs page runtime with message-based coordination

## Fast Start

1. Install dependencies:
   - npm install
2. Typecheck:
   - npm run compile
3. Run tests:
   - npm test
4. Build:
   - npm run build
   - npm run build:chrome

## Repository Rules

- Do not edit generated output:
  - .output/
  - .wxt/
  - coverage/
- Keep changes inside source folders unless task explicitly requires tooling/docs updates.
- Prefer small, behavior-preserving commits.
- Keep browser compatibility explicit (Firefox and Chrome).

## Architecture Guardrails

- UI layer (tabs page) should handle interaction and rendering only.
- App layer should orchestrate commands/queries.
- Domain layer should remain pure (no browser API, no DOM).
- Infra layer should own browser/storage adapters.
- Keep message contracts centralized in js/shared/contracts.ts.

Dependency direction to preserve:
- ui -> app
- app -> domain, infra, shared
- infra -> shared

Forbidden:
- domain -> browser API
- domain -> DOM
- renderer -> browser API
- controller -> repository

## Entrypoints and Runtime Ownership

- Background entrypoint:
  - entrypoints/background.ts
  - js/background.ts
- Tabs page entrypoint:
  - entrypoints/tabs/main.ts
  - tabs/tabs.ts

Background runtime owns browser lifecycle listeners and state_changed notifications.
Tabs page listens for invalidation and fetches fresh snapshots.

## Messaging Contract

Use the request/response envelope and state_changed event defined in js/shared/contracts.ts.
When introducing a new message type:
1. Update shared contracts first.
2. Add router handling in js/app/message_router.ts.
3. Add/update tests for success and error paths.

## Logging

Use js/shared/logger.ts for debug logging.
Do not add raw console.log noise in hot paths.

Debug toggles:
- globalThis.__TABCLOSER_DEBUG__ = true|false
- localStorage key: tabcloser:debug

## Assets and Icons

- Canonical runtime icons location: public/icons/
- Manifest icon paths are declared in wxt.config.ts as icons/...
- If icons disappear in dev/build output, verify public/icons contains close16/32/48/128.

## Testing Expectations

Before finishing non-trivial changes:
1. npm run compile
2. npm test
3. Build at least one target (prefer both when touching manifest/runtime wiring):
   - npm run build
   - npm run build:chrome

## Change Discipline

- Preserve current behavior unless a feature request says otherwise.
- If refactoring, keep migration mechanical and covered by tests.
- Update docs when behavior or file ownership changes.
- Prefer adding focused tests with each bug fix.

## Common Safe Workflows

- New feature in tabs page:
  - controller change -> command/query contract -> router -> app/domain/infra updates -> tests
- Bug in grouping/filtering logic:
  - domain/shared fix first -> presenter/query verification -> tests
- Browser API behavior issue:
  - patch infra/background boundary -> keep domain pure -> tests
