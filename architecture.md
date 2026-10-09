# Architecture

## Scope

Independent static GitHub Pages project. Browser-only HTML, CSS, ES modules and native browser APIs. No backend, runtime npm dependencies, database, login, external API calls or analytics.

## Layers

- `dist/index.html`: semantic interface and public content.
- `dist/styles.css`: tokens, layout, responsive and reduced-motion presentation.
- `dist/src/model.js`: pure calculations; independently testable without a browser.
- `dist/src/history.js`: pure version-1 history validation, per-test summaries, comparable personal trends and durable achievement counting. No DOM, storage, clock or random source.
- `dist/src/history-store.js`: injected browser-storage boundary for bounded private records, read-modify-write, individual removal and explicit full deletion. `progress.js` validates and updates only this service's minimal shared summary.
- `dist/src/history-view.js`: saved-record rendering, native details/delete controls and persistence orchestration; receives only terminal actual test results from `app.js`.
- `dist/src/challenges.js`: pure seeded random generation, color staircase, reaction transitions/results and spatial sequence calculations. `hearing.js` owns bounded A/B audio playback and cancellation without microphone input. Challenge timing, input adapters, focus and cancellation remain in `app.js`; the pure models do not read DOM, clocks or storage.
- `dist/src/app.js`: UI state and event orchestration. SENSE LAB additionally separates browser audio/canvas lifecycle in `experiments.js`.
- `tools/`: localhost static preview and syntax/asset checks; never deployed.
- `test/`: focused pure-model tests; never deployed.
- `.github/workflows/pages.yml`: test first, upload only `dist`, deploy via GitHub Pages.

## State and safety

Active tests, seeds, target positions/sequences, audio, settings and patterns live in memory. D14 supersedes D02's memory-only result rule under the owner's explicit local-persistence authorization. No cookies, uploaded files, personal profile, credentials or service-worker cache. External reference links open only when clicked. CSP disallows app-initiated network connections and inline scripts. GitHub's hosting logs are outside the app's control. Hosting response headers cannot be configured arbitrarily; CSP metadata is not a complete security boundary.

Private device-local key `sense-lab-history-v1` contains `{version:1,runs:{color:[],reaction:[],memory:[]}}`, maximum 20 terminal records per test and 65,536 serialized characters. Each record has a random UUID, actual completion ISO timestamp and bounded rounds. Color stores correctness/level/HSL delta after all 12 answers and Result control; reaction stores actual settled times and coarse early/excluded/cancelled outcomes after five valid responses or 15 attempts; memory stores correctness/sequence length/viewing pace after eight answered rounds. No seeds, target cells, raw keys, held-input timestamps, names, clinical conclusions, population scores or hearing records are persisted. An exhausted reaction record is retained for review but never counts as a completed achievement. No time expiry; adding a 21st run evicts the oldest inserted run for that test only. Native per-record delete and full-delete controls remove private records; full deletion also retries our shared-summary removal independently. New test/reset controls affect the active test only, not retained history.

Reject unknown versions, oversized/expanded payloads, duplicate IDs, invalid dates, impossible staircase paths and non-terminal runs. Corrupt data is not automatically overwritten: an explicit full delete is required for recovery. Storage denial/quota/readback/delete failure is caught and reported; gameplay remains usable and an unconfirmed write does not report progress. Existing storage is reread before each mutation. Storage events refresh the record UI across tabs, but localStorage has no multi-tab atomic transaction or two-key transaction; simultaneous writes may race, and private/history summary failures are reported separately. History does not provide tamper-proof scores or cross-device synchronization.

Shared gallery key `web-lab-progress-v1` holds only `{version:1,apps:{[repoId]:{completed,total,updatedAt}}}`. `progress.js` caps the allowlist at the 15 service IDs, payload at 8,192 characters, and generic counts at integer `0 <= completed <= total <= 1000`. This repo writes `sense-lab` only with total 3; completed is the number of retained test kinds with independent complete results (color 12, reaction five valid, memory eight). updatedAt is the latest actual retained achievement timestamp, never a fabricated visit date. Initial view, partial tests, hints, bonus experiments and audio do not write progress. A confirmed record write triggers recomputation; individual deletion recomputes from remaining achievements, full deletion removes only the sense-lab entry and preserves other apps. An empty aggregate key can be removed. Unsupported/corrupt shared data fails without overwriting another app's summary.

Device-local data is accessible to same-origin scripts, including other project Pages apps on the same host; path separation is not access isolation. Gallery integration reads only the allowlisted summary by contract, not private run payloads. Records are never sent by this app. No backend, account or public leaderboard is added.

The preview server binds to loopback only and limits file access to `dist`. Public deployment exposes only `dist`; the public repository also contains code and documentation. No private inputs are included.

## Delivery

GitHub Actions on main or manual dispatch. Actions are pinned to exact upstream commit hashes; deployment permissions exist only on the deploy job. No user-supplied secret is needed. GitHub-provided short-lived workflow credentials are never printed. Relative asset paths support project Pages subdirectories.
