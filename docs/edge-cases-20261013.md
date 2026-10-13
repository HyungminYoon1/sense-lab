# Edge-case verification — 2026-10-13 — sense-lab

LOCAL ONLY. Parent integrates/releases. No commit, push, deployment, sibling change or new server. Main loopback server remains running. Baseline tracked tree was clean; starting HEAD: 5853e75.

## Results and reproducible commands

- NEW ordinary Node tests: **8** in `test/edge-20261013.test.js`. E01 etc. below mean declaration order in that file.
- Initial new regression batch: **2 actual failures** on unchanged production modules; remaining initial cases passed on baseline and are coverage additions, not RED_GREEN. E07/E08 audio lifecycle coverage was added afterward and passes without an audio implementation change.
- Confirmed defect groups: **1** (group repeated write/delete manifestations by the boundary described below). 
- Full `npm test`: **44/44 PASS**. `npm run check` and `git diff --check`: PASS.
- NEW browser B: `tools/browser-edge-20261013.mjs`, local Chrome, fresh isolated contexts, muted audio, 1440/390/320 pixels, real keyboard and mobile-emulated taps. Full results in `output/playwright/edge-20261013/browser.json`. No uncaught page exceptions; no horizontal overflow.
- CI: new Node file is automatically discovered by existing `node --test` / `npm test` in `.github/workflows/pages.yml`. Workflow unchanged. Browser script is repeatable optional tooling, **NOT in ordinary CI** (Playwright is an existing local QA dependency). Remote CI and LIVE: **NOT_RUN**.

Run from this repository:
```powershell
node --test test/edge-20261013.test.js
npm test
npm run check
node tools/browser-edge-20261013.mjs
git diff --check
```

Browser defaults: existing sibling-root `../output/playwright/implement-20261012/package.json` (Playwright 1.61.1), Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`, URL `http://127.0.0.1:59540/sense-lab/`. Overrides: `PLAYWRIGHT_PACKAGE`, `CHROME_PATH`, `EDGE_BASE_URL`; `EDGE_FIXTURES_ONLY=1` runs just the injected fixture group. Dependencies are read only; evidence is written only within this owned repo. Script closes its own browser/contexts and never controls the shared server.

## Actual red / green evidence

E01 sparse calibration samples returned a plausible interval/rate; E02 sparse onset gaps returned 16 ms. Both now reject with null. This is pure model boundary coverage: current UI pushes dense arrays, so no ordinary-UI exploit is claimed.

Production edits: `dist/src/temporal-model.js`. Test doubles are explicit bounded in-memory fixtures, not real device denial/quota measurements or external validation. Readback confirms the value observed immediately afterward; it cannot make two localStorage keys transactional or prevent future concurrent writes.

- `output/playwright/edge-20261013/red.tap`: original new tests before production edits.
- `output/playwright/edge-20261013/green.tap`: same regression tests after minimal changes.
- `output/playwright/edge-20261013/full-test.txt`, `check.txt`: full suite and static check.

Evidence folder is ignored. Red logs are preserved, not reconstructed by reverting code. Previously documented 2026-10-13 bugs are existing work and are not counted here.

## Feature/control matrix

| Feature/control | Concrete test / command | Result and boundary |
| --- | --- | --- |
| Color 12-round staircase / reset | Existing challenges.test.js + NEW B real first-cell choices, keyboard Enter, 12 rounds, restart | PASS; terminal record survives restart; no answer injection |
| Reaction 100..3000 ms / 250 ms settle | NEW E04 exact inclusive endpoints, just outside, immutable go, repeated terminal; B early Enter, repeated input, switch-away timer | PASS; stale timer never shows go after 4.5s |
| Spatial 8 rounds / seed 0, uint32 max | NEW E05 seeded unique cells, complete sequence, terminal inert; existing challenges/ui tests cancellation | PASS; no seed/history retention change |
| Temporal samples 16..120 / types / sparse / entropy | NEW E01–03; temporal.test.js existing staircase/onset | RED_GREEN E01/E02; min/max/outside/NaN/Infinity/string/null/empty reject or accept as specified |
| Pitch / high-frequency A/B / pending resume | NEW E07/E08 canceled resume and hidden document TEST_DOUBLE; B muted play-stop late answer gate; existing pitch/hearing audio gain tests | PASS; no new stimulus, gain, timing or safety threshold |
| Private history / 20 per test / terminal retention | Existing history.test.js readback/denial/quota/corrupt/size/delete tests + B denied storage completion | PASS; fixtures only, browser completion still usable |
| Gallery peer isolation / readback / repeat clear | NEW E06 silent set/clear preserves traffic peer; existing history tests | PASS-on-baseline; storage adapter already confirmed readback |
| Export/import / undo | Current sensory UI has no import/export or undo control | N/A; history reset/delete and retry are tested instead |

B = the new browser command above. Existing tests are explicitly marked; running them again does not make them new coverage. No source-string-only test was added.

## Source accounting

- **VERIFIED**: `architecture.md`, `README.md`, `docs/decisions.md` read with authority precedence. `api-spec.md`, `requirements.md` absent in this repo (N/A, not silently skipped).
- **VERIFIED**: modified production modules `dist/src/temporal-model.js`, added executable test/browser files, `package.json`, `.gitattributes`, `.gitignore`, and Pages workflow.
- **PARTIAL**: whole `dist/`, `test/`, `tools/`, `docs/` source review. Inventoried first; inspected applicable storage, model, UI lifecycle and existing regression files. All ordinary tests executed, but this is not a claim of full line-by-line review of every renderer, historical verification note or optional browser script.
- Existing `docs/verification.md` receives a new top link; old LOCAL/CI/LIVE claims remain historical.
- **NOT_INSPECTED / out of scope**: siblings' implementation and private files. No .env/credential values read or printed.

Inventory at intake (repository files, excluding .git/dependencies/output; inventory is not full-file review):

```text
.gitignore
package.json
README.md
.gitattributes
architecture.md
dist\styles.css
tools\serve.mjs
tools\check.mjs
tools\browser-audit-20261013.js
dist\index.html
.github\workflows\pages.yml
docs\verification.md
docs\qa-20261012.md
docs\decisions.md
dist\src\app.js
dist\src\challenges.js
dist\src\experiments.js
dist\src\temporal-ui.js
dist\src\temporal-model.js
dist\src\progress.js
dist\src\pitch-ui.js
dist\src\pitch-model.js
dist\src\pitch-audio.js
dist\src\model.js
dist\src\history.js
dist\src\history-view.js
dist\src\history-store.js
dist\src\hearing.js
test\ui.test.js
test\temporal.test.js
test\pitch.test.js
test\pitch-audio.test.js
test\model.test.js
test\history.test.js
test\hearing.test.js
test\challenges.test.js
```

## Capture and limitations

`output/playwright/edge-20261013/viewport-1440.png`, `viewport-390.png`, `viewport-320.png` and injected storage-error capture. Narrow captures inspected for clipping/overlap; no layout/CSS redesign was made. Browser validation covers Chrome emulation, not a physical touchscreen, screen reader, Firefox/WebKit or all OS lifecycle behavior. No actual clinical/audio/photometric or real-world traffic/biology measurement. Concurrency fixtures are deterministic schedules, not exhaustive races. No stronger flash or new visual stimulus was introduced; temporal browser validation only verifies the consent gate. Full temporal session optical timing remains NOT_RUN.

See [decision log](decisions.md) for D20. Preserve existing scientific model, game rules, safety and retention boundaries.
