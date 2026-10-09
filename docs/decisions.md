# Decision log

## D11 — Adaptive randomized color difficulty (2026-10-09, LOCAL ONLY)

- Context: owner authorized a local difficulty/originality upgrade; D08's fixed color progression makes repeated attempts predictable.
- Options: fixed increasingly tiny deltas; clinically calibrated color-space thresholds; bounded response-dependent game stages.
- Decision: supersede the fixed-color part of D08 with 12 trials starting at level 4, two consecutive hits advancing two levels and one miss dropping one level. Clamp to 12 levels, ΔL 14–0.35%, 4×4/5×5/6×6 grids. Randomize hue, saturation, base lightness, target position and target polarity. Inject seeded random functions into pure models; generate fresh seeds in UI memory only.
- Rationale: rewards consistent correct responses, allows recovery from errors and reaches harder stages within a finite session. Two-level jumps are a game rule, not a psychophysical threshold estimator. Report actual answered deltas; do not infer ΔE, diagnostic status or comparable ability from different adaptive paths. Very small deltas may quantize on consumer displays.
- Affected files: dist/src/challenges.js, app.js, index.html, styles.css, test/challenges.test.js, ui.test.js, architecture.md, README.md.
- Review: main agent owns browser/preview QA, including hard-grid touch target layout and focus. No persistent seed, remote write, external asset or changed hosting boundary.

## D12 — Provisional reaction responses and finite sessions (2026-10-09)

- Context: D09 needs stronger handling of held input, mixed input methods and signal-time spam while preserving honest local results.
- Options: accept the first signal-time event immediately; server-side anti-cheat; a bounded local state machine and response quarantine.
- Decision: extend D09 with held pointer/key tracking, pre-signal event timestamp rejection, repeat/multi-pointer/outside-input exclusion, a 100–3,000 ms game acceptance window and 250 ms provisional phase. Any extra activation in that phase invalidates the attempt. At most five valid records and 15 total attempts; cancellations consume a started attempt. Show median, median absolute deviation and range without deleting valid outliers. Require a distinct retry control. UI owns events/clock/cancellation; pure models own transitions and calculations.
- Rationale: stops common input bursts from becoming records and prevents an unbounded retry session. 100 ms is an explicit game policy, not a physiological assertion. Keyboard/pointer and assistive button activation are supported; script tampering remains possible. Results include device/display and event-loop timing limitations.
- Affected files: dist/src/challenges.js, app.js, index.html, styles.css, test/challenges.test.js, ui.test.js, README.md.
- Review: physical devices, native synthesized click differences and screen-reader interaction require browser/device QA. Audio safety, app network policy and memory-only storage remain as documented; no backend or security anti-bot guarantee.

## D13 — Spatial order memory challenge (2026-10-09)

- Context: owner allowed a distinct perception/memory game within the existing static model/UI architecture.
- Options: another color variant; rapid animation; numbered spatial sequence recall with deliberate start/stop.
- Decision: add a fifth panel, eight rounds of 3–7 unique positions on a 4×4 grid. Shuffle in the pure model, show one position at a time with a 350 ms gap, provide 850/1,500 ms viewing options, then allow untimed ordered answers. Stop on user action, panel switch, blur, visibility/page exit and cancel without scoring; resumed rounds get a fresh sequence. Reveal order after a hit/miss and require explicit next-round action.
- Rationale: exercises order retention rather than color discrimination or reaction time. Native buttons, visible numbers, shape/contrast highlighting, status announcements and deliberate focus support multiple input paths. No microphone, audio, remote assets, retention or diagnostic result is added.
- Affected files: dist/src/challenges.js, app.js, index.html, styles.css, test/challenges.test.js, ui.test.js, architecture.md, README.md.
- Review: announce positions for accessibility, but screen-reader queue speed and reduced-motion rendering still need real-browser QA. Different viewing modes are game settings, not interchangeable standardized scores. Main owns browser QA; this worker performs Node/static/test-double checks only.

## D08 — Sensory arcade and interpretation of scores (2026-10-08 redesign)

- Context: owner approved a full redesign with color discrimination, reaction and high-frequency experiences, including failure for pre-signal clicking.
- Options: arbitrary age/percentile labels; calibrated clinical testing with extra hardware/services; transparent local challenge results.
- Decision: 12 HSL-lightness color rounds; five valid reaction trials summarized by median; nine 10–18 kHz A/B sine/silence pairs. Report observed responses only, not hearing age, diagnosis, color vision status, human percentile or normative ranking.
- Rationale: consumer hardware/environment are uncalibrated; guessing can affect A/B results. Keep the experience interesting without invented personal assessments.
- Affected: dist/index.html, styles.css, src/challenges.js, hearing.js, app.js, test/challenges.test.js, README.md.
- Review: verify with real output hardware separately. References: ASHA adult screening and WHO safe listening; UI safety instructions remain brief. No personal input or persistent score data.

## D09 — Timing and early-input lifecycle

- Context: repeated clicks/held keys must not fabricate reaction records, and hidden tabs must not skew timing.
- Options: score every input; accept only a waiting-to-signal-to-response state transition.
- Decision: randomized 1.6–4.3 s waiting; pre-signal pointer/keyboard input fails the trial; waiting key repeat also fails. Failure/result requires an explicit separate retry control. Stop timers on navigation/blur/hidden/page exit; cancelled/failed trials do not count among five valid observations. Use monotonic browser time at the rendered signal frame.
- Rationale: avoids click-spam restarting itself and excludes interrupted observations. This is input handling, not secure anti-bot protection; client code is inspectable.
- Affected: src/app.js, challenges.js and tests.
- Review: browser tests are automated timing, not evidence of a human reaction score. Physical display/input delays are not calibrated.

## D10 — Short, cancellable audio

- Context: high-frequency sound should be explicit, finite and non-overlapping.
- Options: continuous sweep with rising volume; bounded sine bursts with silent comparison and user stop.
- Decision: each A/B interval lasts 1.1 s, with a 0.6 s gap; a single sine burst has 35 ms attack and a finite release; peak app gain <=0.02. Reject frequencies at/above Nyquist, stop immediately on user cancellation/tab changes/hidden/page exit. No microphone, autoplay or gain escalation for missed tones. Existing waveform and particle experiments remain as bonuses.
- Rationale: bounded listening and honest equipment limitations, with no added architecture or data collection.
- Affected: src/hearing.js, experiments.js, app.js, index.html.
- Review: app gain is not sound pressure level; low device volume and no volume escalation remain necessary. Hearing results are local response records only.

## D06 — Audio and exported visuals

- Context: interactive audio and downloadable patterns should be deliberate and local.
- Options: autoplay or microphone input; explicit low-gain synthesis; remotely uploaded exports.
- Decision: explicit button-only synthesis, ramped gain, bounded frequency/volume, stop on tab change/visibility/page exit; no microphone. PNG exports use an in-memory blob and a local browser download.
- Rationale: avoid unexpected sound or data collection. This is an illustrative waveform/particle model, not a calibrated instrument.
- Affected: dist/src/experiments.js, model.js, index.html.
- Review: hardware listening volume is outside app control. Export results are user-owned local files; no remote copies or retention.

## D07 — Public commit identity

- Context: the existing global Git email is not a GitHub noreply address.
- Options: reuse it; change global settings; use repository-local GitHub noreply identity.
- Decision: configure only these repositories with the verified account's GitHub noreply identity.
- Rationale: public commits should not expose a private email, and unrelated repositories must keep their settings.
- Affected: local .git/config (not tracked), public commit metadata.
- Review: owner may change the repo-local identity later; never print the pre-existing email.

2026-10-08. Authorized automated implementation session: two independent repositories, push and GitHub Pages deployment.

## D01 — Static architecture and hosting

- Context: separate experiments should run on GitHub Pages without maintaining a paid service.
- Options: native static modules; framework export; external backend.
- Decision: HTML/CSS/ES modules with browser APIs, no runtime dependencies or backend. Deploy only dist through GitHub Actions to the requested provider.
- Rationale: matches Pages and the small interactive scope; avoids API keys, costs, account setup and dependency supply-chain exposure.
- Affected: dist, package.json, tools, architecture.md, .github/workflows/pages.yml.
- Review: revisit only when genuine server-side requirements appear; do not imply that Pages supports a backend.

## D02 — Public access and data lifecycle

- Context: a public coursework demonstration is requested, while personal disclosure is undesirable.
- Options: private access with extra hosting; public content with personal profile; public neutral-topic experiment.
- Decision: public neutral-topic repositories and sites, no biography, private email, forms, login, analytics, remote data writes, persistent browser storage or secret files. Keep all settings in page memory.
- Rationale: visitors can try the experiments without giving personal information; reload provides a clean state.
- Affected: index.html, app.js, .gitignore, README.md.
- Review: GitHub can keep hosting logs independently; do not claim that the host records no visitor data. No license grant is added without owner choice.

## D03 — Publication and automation access

- Context: source and deployed site must remain separately verifiable.
- Options: branch publishing; Actions deploying repository root; test-gated Actions deploying dist only.
- Decision: separate main branches; test-gated Pages Actions; exact commit pins; contents-read verification and scoped pages-write/id-token-write deployment. Preserve the pre-existing personal Pages repository.
- Rationale: excludes development files from the site and separates local checks, remote CI and live deployment.
- Affected: .github/workflows/pages.yml, docs/verification.md.
- Review: update action pins deliberately; inspect origin before every push. Local and live UI checks are manual agent/browser evidence, not a persistent cross-browser CI guarantee.

## D04 — Accessibility, motion and device support

- Context: visual experiences should remain operable without a mouse and on smaller screens.
- Options: canvas-only controls; semantic controls with labeled visualizations.
- Decision: semantic native inputs and buttons, keyboard focus, touch support, responsive layouts and reduced-motion handling. No automatic audio. Main interface is Korean with short English exhibit labels.
- Rationale: experiments remain understandable and actionable without relying only on color or animation.
- Affected: index.html, styles.css, src.
- Review: browser QA covers selected desktop/mobile sizes, not a formal WCAG certification or every device.

## D05 — Optional browser agent tools

- Context: the website-building workflow calls for structured access to primary interactions where supported.
- Options: no structured access; new hidden capabilities; progressive-enhancement WebMCP tools sharing existing UI actions.
- Decision: feature-detect document.modelContext and register only visible, local configuration/navigation/step operations. Validate input before changing state, handle unsupported browsers, unregister on page exit. Never enable audio or export files through a tool.
- Rationale: no hidden network or persistence capability; ordinary browsers work without WebMCP.
- Affected: src/app.js.
- Review: distinguish runtime validation in a supported context from unsupported/unverified states.
