# Decision log

## D06 — Audio and exported visuals

- Context: interactive audio and downloadable patterns should be deliberate and local.
- Options: autoplay or microphone input; explicit low-gain synthesis; remotely uploaded exports.
- Decision: explicit button-only synthesis, ramped gain, bounded frequency/volume, stop on tab change/visibility/page exit; no microphone. PNG exports use an in-memory blob and a local browser download.
- Rationale: avoid unexpected sound or data collection. This is an illustrative waveform/particle model, not a calibrated instrument.
- Affected: dist/src/experiments.js, model.js, index.html.
- Review: hardware listening volume is outside app control. Export results are user-owned local files; no remote copies or retention.

+## D07 — Public commit identity
+- Context: the existing global Git email is not a GitHub noreply address.
+- Options: reuse it; change global settings; use repository-local GitHub noreply identity.
+- Decision: configure only these new repositories with the verified account's GitHub noreply identity.
+- Rationale: public commits should not expose a private email, and unrelated repositories must keep their settings.
+- Affected: local .git/config (not tracked), public commit metadata.
+- Review: owner may change the repo-local identity later; never print the pre-existing email.

-

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
