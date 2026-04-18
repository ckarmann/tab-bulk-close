# Copilot Instructions

These instructions are specific to GitHub Copilot agents operating in this repository.

## Primary Goals

- Keep behavior stable while implementing requested changes.
- Respect architecture boundaries in design/target_architecture.md.
- Prefer minimal, reviewable diffs.

## Implementation Priorities

1. Preserve runtime flow:
   - background owns lifecycle listeners
   - tabs page reacts to state_changed and refreshes snapshot
2. Keep contracts typed and centralized in js/shared/contracts.ts.
3. Keep domain modules pure and testable.

## File and Layer Expectations

- UI interactions: js/ui/controllers/*
- View model shaping: js/ui/presenters/*
- Rendering: js/ui/renderers/* and js/ui/templates/*
- Commands/queries: js/app/commands/* and js/app/queries/*
- Browser/storage adapters: js/infra/*

## Build and Test Commands

- npm run compile
- npm test
- npm run build
- npm run build:chrome

Run compile + tests for any non-trivial change.
Run builds when entrypoints, manifest config, or static assets are involved.

## Logging

- Use js/shared/logger.ts for debug logs.
- Avoid raw console.log in production paths.
- Debug can be toggled via:
  - globalThis.__TABCLOSER_DEBUG__
  - localStorage tabcloser:debug

## Assets

- Keep extension icons in public/icons.
- Ensure wxt.config.ts icon paths remain valid for both browsers.

## Avoid

- Editing generated output in .output/ or .wxt/.
- Introducing domain dependencies on browser APIs or DOM.
- Large mixed refactors unrelated to the user request.

## When Unsure

- Prefer small changes plus tests.
- Document assumptions in commit/PR notes.
- Ask for clarification only when a choice changes behavior or architecture.
