# Architecture

## Scope

Independent static GitHub Pages project. Browser-only HTML, CSS, ES modules and native browser APIs. No backend, runtime npm dependencies, database, login, external API calls or analytics.

## Layers

- `dist/index.html`: semantic interface and public content.
- `dist/styles.css`: tokens, layout, responsive and reduced-motion presentation.
- `dist/src/model.js`: pure calculations; independently testable without a browser.
- `dist/src/history.js`: pure version-1 history validation, per-test summaries, comparable personal trends and durable achievement counting. No DOM, storage, clock or random source.
- `dist/src/history-store.js`: injected browser-storage boundary for bounded private records, read-modify-write, individual removal and explicit full deletion. `progress.js` validates and updates only this service's minimal shared summary.
- `dist/src/record-model.js` / `record-store.js`: strict six-kind optional-record validation and injected storage boundary. Read legacy history without rewriting; new explicit saves use a separate v2 key.
- `dist/src/completion.js`: bounded per-kind completion timestamps, legacy achievement import and minimal gallery summary, independent of optional detailed history.
- `dist/src/history-view.js`: pending results in memory, deliberate save/delete controls, record display and completion status. Receives only actual terminal results, not partial runs or answer keys.
- `dist/src/challenges.js`: pure seeded random generation, color staircase, reaction transitions/results and spatial sequence calculations. `hearing.js` owns bounded A/B audio playback and cancellation without microphone input. Challenge timing, input adapters, focus and cancellation remain in `app.js`; the pure models do not read DOM, clocks or storage.
- `dist/src/app.js`: UI state and event orchestration. SENSE LAB additionally separates browser audio/canvas lifecycle in `experiments.js`.
- `dist/src/pitch-model.js`: pure randomized cents comparisons and adaptive difficulty. `pitch-audio.js` owns finite low-frequency pairs; `pitch-ui.js` owns the twelve-round UI lifecycle. Pattern creation moved to the independent draw-desk app under the owner's approved creative scope.
- `dist/src/temporal-model.js`: pure temporal-order randomization, bounded staircase, frame estimates and onset-quality checks. `temporal-ui.js` owns deliberate two-dot trials and rAF cancellation. No periodic flicker, red flashes or full-screen stimulus. Dots brighten once and disappear together, preventing an independent offset-order answer cue. Starts remain at least 2 seconds apart, including restart/cancellation. D21 supersedes D18's memory-only result restriction with optional saves.
- `tools/`: localhost static preview and syntax/asset checks; never deployed.
- `test/`: focused pure-model tests; never deployed.
- `.github/workflows/pages.yml`: test first, upload only `dist`, deploy via GitHub Pages.

## State and safety

Active tests, seeds, target positions/sequences, audio and settings live in memory. D21 implements the owner's 2026-10-19 approval: six-kind completion is automatic at a legitimate terminal result; detailed saving is optional per result. No cookies, uploaded files, personal profile, credentials or service-worker cache. External reference links open only when clicked. CSP disallows app-initiated network connections and inline scripts. GitHub hosting logs are outside the app's control. CSP metadata is not a complete security boundary.

Legacy key `sense-lab-history-v1` retains the exact version-1, three-kind format and its 65,536-character bound. Opening the app, completion import and new saves never rewrite this key. Explicit legacy-record deletion or detailed-history clearing is allowed and preserves unrelated keys. Old records are labelled separately, especially the prior numbered memory task.

Optional key `sense-lab-records-v2` holds `{version:2,runs:{color:[],reaction:[],hearing:[],pitch:[],memory:[],temporal:[]}}`, at most 20 new records per kind and 131,072 serialized characters. Each record has UUID, actual completion ISO timestamp, mode and minimal rounds; memory additionally has pace. Color retains level/delta/correctness; reaction settled timings/coarse outcomes; hearing frequency/selected interval/correctness; pitch cents/correctness; memory length/correctness; temporal observed ms/frames/correctness. No seeds, answer cells/sequences, raw inputs, names, population ranks or clinical inference. Completed result lives in memory until an explicit Save click. Restart/reload discards an unsaved result. Saving is retryable on failure and does not count completion again. The 21st new record evicts the oldest new record for that kind, not a legacy record. No age-based expiry. Detail deletion does not remove completion.

Completion key `sense-lab-completion-v1` holds only `{version:1,tests:{kind:actualCompletionISO}}`, six allowlisted kinds, max 1,024 characters. No scores, rounds or settings. Color/pitch/temporal require 12 answered trials, hearing 9 or 18, memory 8, reaction five valid settled responses (an exhausted 15-attempt session can be optionally saved but is not complete). Hints, partial or canceled tests never complete. On first use only, valid retained legacy/new full records seed completion with their actual original dates; detailed records are not rewritten. An explicit completion reset writes an empty marker, preventing preserved history from resurrecting badges on reload. Initial empty browsing does not write completion. New completions reread current state before mutation.

Reject unknown versions, oversized/expanded payloads, duplicate IDs, invalid dates, impossible staircase paths and non-terminal runs. Corrupt data is not automatically overwritten. Each storage domain has an explicit clear/reset control; inability to read old records does not authorize deleting them. Storage denial/quota/readback/delete failure is reported while gameplay remains usable. Existing storage is reread before mutation. Storage events refresh the UI, but localStorage is not a multi-tab or multi-key transaction; simultaneous writes may race. Optional-save, completion and shared-summary failures are separate. No cross-device sync or tamper-proof scores are claimed.

Shared `web-lab-progress-v1` format and 15-service allowlist remain unchanged, max 8,192 characters. This repo writes only `sense-lab`, now with total 6 and the count of confirmed minimal completion entries. updatedAt is the latest actual retained completion date, never a visit date. Optional record save/deletion does not change the badge. Initial valid retained completion may resynchronize a previously failed aggregate; completion reset removes only sense-lab and preserves peers. Corrupt/unsupported shared state is not overwritten. The gallery reads only this summary, displays `n/6종 체험 완료`, and labels old total-3 summaries as prior records until the app refreshes them.

Device-local data is accessible to same-origin scripts, including other project Pages apps on the same host; path separation is not access isolation. Gallery integration reads only the allowlisted summary by contract, not private run payloads. Records are never sent by this app. No backend, account or public leaderboard is added.

The preview server binds to loopback only and limits file access to `dist`. Public deployment exposes only `dist`; the public repository also contains code and documentation. No private inputs are included.

## Delivery

GitHub Actions on main or manual dispatch. Actions are pinned to exact upstream commit hashes; deployment permissions exist only on the deploy job. No user-supplied secret is needed. GitHub-provided short-lived workflow credentials are never printed. Relative asset paths support project Pages subdirectories.
