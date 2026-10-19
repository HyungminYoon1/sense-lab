import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../dist/src/app.js", import.meta.url), "utf8");
const temporal = await readFile(new URL("../dist/src/temporal-ui.js", import.meta.url), "utf8");

test("navigation connects the gallery, not an unrelated experiment", () => {
  const header = html.match(/<header[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(header, /packet-journey|PACKET JOURNEY/);
  assert.match(header, /web-lab/);
});

test("each test explains its task, controls and result before play", () => {
  for (const mode of ["color", "reaction", "sound", "pitch", "memory", "temporal"]) {
    const panel = html.split(`data-panel="${mode}"`)[1].split('data-panel="')[0];
    assert.match(panel, /class="test-guide"/);
    for (const heading of ["무엇을 해보나요", "진행 방법", "결과 읽기"]) assert.ok(panel.includes(heading), `${mode}: ${heading}`);
  }
  assert.match(html, /빨리 누르는 능력이 아니라/);
});

test("memory targets cannot be read as visible numbered coordinates during presentation", () => {
  assert.doesNotMatch(app, /button\.textContent = cell \+ 1/);
  assert.doesNotMatch(app, /textContent = `\$\{i \+ 1\}번째: \$\{cell \+ 1\}번 칸`/);
});

test("temporal order has no independent disappearance cue revealing the earlier side", () => {
  assert.doesNotMatch(temporal, /tick === current\.wait \+ 10/);
});

test("classic memory cannot offer challenge-only speeds that silently reset", () => {
  for (const value of ["650", "450"]) assert.match(html, new RegExp(`<option value="${value}" disabled>`));
});
