# Changelog

Every release of Forjr, newest first. A version is three numbers: a change that breaks a project comes only with a new major version, and with `forjr upgrade`, which rewrites a project for it.

## Forjr 1.1.0 - not yet released

### Core Changes

- Rename Tent.js to Forjr: the package `forjr` with `npm create forjr`, the command `forjr`, `forjr.ts`, `forjr.d.ts` and `.forjr/`, `ForjrError`, the words of the environment `FORJR_*`, the runner's folder `~/.forjr`, the packages `@forjr/runtime-<system>`, and `forjr.exe`, `forjrw.exe` and `forjr service` on Windows: 2a4ae05
- Rename the error codes to begin with `F`, each keeping its number, and the engine's own tables and addresses to `_f_` and `/_f/`: 2a4ae05
- Write the description as `forjr.description/2`; an engine reads no data of the former name: 2a4ae05
- Fix `forjr dev` that never ended when it was closed while a build still ran: 2a4ae05
- Add `forjr map`: the app for the AI that reads it, each definition on one line with who may call it, what it reads and writes, who uses it and its tests, cut to a size in tokens: 2a4ae05
- Add tests made for AI: a test whose files are unchanged is replayed, a failed call tells its facts, the clock is held and chance is seeded, and tests are made from the declarations: 24216c9

## Tent.js

The releases below were made under the former name, Tent.js, and are kept as they were written.

## 1.0.1 - 2026-10-25

### Core Changes

- Fix `tent start` from npm for apps whose server modules share a file: 63db1c3
- Fix running `tent` from an npm global install on Ubuntu, where folders are group-writable: 63db1c3
- Fix `tent service` for npm installs: program path, working directory and the printed `sudo` command: 63db1c3
- Fix `tent start --seed --domain` failing to start: 63db1c3
- Fix `tent check` reporting a type error inside the framework for a new project with a test: 5ee3b0a
- Fix loading modules on macOS when the app folder is reached through a symlink: 5ee3b0a
- Fix private files (keys, tokens) on Windows folders without inherited permissions and on Entra ID-joined machines: 5ee3b0a
- Fix `tent test` and `tent shot` on Ubuntu 23.10+ and as root, where Chromium's sandbox is refused: 5ee3b0a
- Fix `head` scripts so `load: 'idle'` runs after `load: 'alive'`: 5ee3b0a
- Fix `tent test --plan` leaving choice fields empty: 5ee3b0a
- Fix `app.settled()` after `app.clock.advance` on busy machines: 4b8722c
- Make key checks take the same time for unknown ids as for wrong keys: 4b8722c

### Misc Changes

- `tent new`: add the Tent.js icon as `assets/icon.svg`: 5ee3b0a

## 1.0.0 - 2026-10-24

The first stable release of Tent.js.

- Data: tables with row-level access rules, vectors, files, and data kept apart per tenant
- Functions and flows: queries, changes and actions, durable flows, schedules and mail
- AI: models, agents with tools, and workspaces where your users build apps inside your product
- Screens: React views with live data, forms, layouts, images, languages, and server-rendered pages
- Connections: services with keys, rate limits and retries; your functions as an API, an MCP server and a command line; incoming webhooks
- History: every change of the app recorded, and rollback with its data
- Tooling: `tent new`, `dev`, `check`, `test`, `build`, `map`, `docs` and every other command, each with `--json`; the docs and `AGENTS.md` in every project
- Deploy: `tent start` on any server, with HTTPS for your domains and readers beside one writer; install with npm
