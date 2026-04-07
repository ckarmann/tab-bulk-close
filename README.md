# Tab-bulk-closer

A Chrome and Firefox extension for managing tabs: automatic categorization and bulk tab closing.

## Prerequisites

- Node.js (v18+)
- npm

## Setup

```sh
npm install
```

## Build

Build for Firefox (default):

```sh
npm run build
```

Build for Chrome:

```sh
npm run build:chrome
```

Output is written to `.output/firefox-mv3/` and `.output/chrome-mv3/` respectively.

To build and produce a zip for store submission:

```sh
npm run zip           # Firefox
npm run zip:chrome    # Chrome
```

## Development (live reload)

```sh
npm run dev           # Firefox
npm run dev:chrome    # Chrome
```

Then load the extension from `.output/chrome-mv3/` or `.output/firefox-mv3/` as described below. WXT will rebuild on file changes and reload the extension automatically.

## Installing in the browser

### Chrome

1. Run `npm run build:chrome` (or `npm run dev:chrome` for live reload).
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked**.
5. Select the `.output/chrome-mv3/` folder.

### Firefox

1. Run `npm run build` (or `npm run dev` for live reload).
2. Go to `about:debugging`.
3. Click **This Firefox**.
4. Click **Load Temporary Add-On**.
5. Open any file inside the `.output/firefox-mv3/` folder (e.g. `manifest.json`).

## Other commands

| Command | Description |
|---|---|
| `npm test` | Run the test suite |
| `npm run compile` | TypeScript typecheck |
| `npm run test:coverage` | Run tests with coverage report |

## CI and Release

- CI is defined in `.github/workflows/ci.yml` and runs:
	- `npm run compile`
	- `npm test`
	- `npm run build` (Firefox)
	- `npm run build:chrome` (Chrome)
- Release packaging is defined in `.github/workflows/release.yml`.
	- On tag pushes (`v*`), it creates and publishes browser-specific zip artifacts.
	- It can also be run manually via `workflow_dispatch`.

## Third-party libraries

- Runtime libraries are managed via npm dependencies in `package.json`.
- Version pinning is enforced by `package-lock.json`.

