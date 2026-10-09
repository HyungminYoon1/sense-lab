import test from "node:test";
import assert from "node:assert/strict";
import { COLOR_DELTAS, colorStep, MEMORY_LENGTHS } from "../dist/src/challenges.js";
import { HISTORY_KEY, HISTORY_LIMIT, HISTORY_MAX_SIZE, emptyHistory, validateRun, validateHistory,
  summarizeRun, personalTrend, achievementCount } from "../dist/src/history.js";
import { createHistoryStore } from "../dist/src/history-store.js";
import { PROGRESS_KEY, REPO_IDS, parseProgress, writeProgress } from "../dist/src/progress.js";

const date = "2026-10-09T10:00:00.000Z";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function color(n = 1, answers = Array(12).fill(true)) {
  let state = { level: 3, streak: 0 };
  const rounds = answers.map((correct) => {
    const round = { correct, level: state.level, delta: COLOR_DELTAS[state.level] };
    state = colorStep(state, correct);
    return round;
  });
  return { id: id(n), completedAt: date, rounds };
}
const memory = (n = 2, pace = 850, answers = Array(8).fill(true)) => ({ id: id(n), completedAt: date, pace,
  rounds: MEMORY_LENGTHS.map((length, i) => ({ length, correct: answers[i] })) });
const reaction = (n = 3, times = [200, 205, 210, 215, 2900]) => ({ id: id(n), completedAt: date,
  rounds: times.map((elapsed) => ({ outcome: "valid", elapsed })) });
function storage() {
  const data = new Map();
  return { data, getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
const clone = (value) => structuredClone(value);

test("history summaries use actual rounds, retain adaptive paths and separate memory pace", () => {
  assert.deepEqual(summarizeRun("color", color()), { hits: 12, smallest: 0.35 });
  assert.deepEqual(summarizeRun("color", color(1, Array(12).fill(false))), { hits: 0, smallest: null });
  assert.deepEqual(summarizeRun("memory", memory()), { hits: 8, longest: 7, pace: 850 });
  assert.deepEqual(summarizeRun("memory", memory(2, 1500, Array(8).fill(false))), { hits: 0, longest: 0, pace: 1500 });
  const r = reaction();
  r.rounds.splice(1, 0, { outcome: "early" }, { outcome: "excluded" }, { outcome: "cancelled" });
  assert.deepEqual(summarizeRun("reaction", r), { count: 5, median: 210, mad: 5, best: 200, worst: 2900,
    complete: true, early: 1, excluded: 2 });
  const a = memory(4, 850, [true, false, false, false, false, false, false, false]), b = memory(5, 1500);
  assert.deepEqual(personalTrend("memory", [a, b, memory(6)]), { count: 2, latest: 8, previous: 1, change: 7, recent: [1, 8], pace: 850 });
  const exhausted = { ...reaction(7, []), rounds: Array.from({ length: 15 }, () => ({ outcome: "early" })) };
  assert.equal(summarizeRun("reaction", exhausted).complete, false);
  assert.equal(personalTrend("reaction", [exhausted]), null);
  assert.equal(personalTrend("reaction", [reaction(8), exhausted]).latest, 210);
  assert.equal(personalTrend("color", []), null);
  const observed = Array.from({ length: 7 }, (_, i) => reaction(10 + i, Array(5).fill(200 + 10 * i)));
  assert.deepEqual(personalTrend("reaction", observed), { count: 7, latest: 260, previous: 250, change: 10,
    recent: [220, 230, 240, 250, 260], pace: null });
  const colorTrend = personalTrend("color", [color(20), color(21, Array(12).fill(false))]);
  assert.equal(colorTrend.change, -12);
  assert.deepEqual(colorTrend.recent, [12, 0]);
});

test("only full legal test endings validate; partial, impossible and expanded payloads fail", () => {
  const bad = [];
  const change = (mode, base, mutate) => { const run = clone(base); mutate(run); bad.push([mode, run]); };
  change("color", color(), (r) => r.rounds.pop());
  change("color", color(), (r) => r.rounds.push(r.rounds[0]));
  change("color", color(), (r) => r.rounds[2].level = 0);
  change("color", color(), (r) => r.rounds[0].delta = 0.001);
  change("color", color(), (r) => r.rounds[0].correct = "true");
  change("color", color(), (r) => r.rounds[0].seed = 123);
  change("memory", memory(), (r) => r.rounds[0].length = 7);
  change("memory", memory(), (r) => r.pace = 1000);
  change("memory", memory(), (r) => delete r.rounds[0]);
  change("memory", memory(), (r) => r.rounds[0].sequence = [1, 2, 3]);
  change("reaction", reaction(), (r) => r.rounds[0].elapsed = 99);
  change("reaction", reaction(), (r) => r.rounds[0].elapsed = 3001);
  change("reaction", reaction(), (r) => r.rounds[0].elapsed = 200.5);
  change("reaction", reaction(), (r) => r.rounds.pop());
  change("reaction", reaction(), (r) => r.rounds.push({ outcome: "early" }));
  change("reaction", reaction(), (r) => r.rounds[0] = { outcome: "invalid", elapsed: 200 });
  change("reaction", reaction(), (r) => r.rounds[0] = { outcome: "cancelled", elapsed: 200 });
  for (const value of [null, "today", "2026-02-30T10:00:00.000Z", "2026-10-09", 1])
    change("color", color(), (r) => r.completedAt = value);
  change("color", color(), (r) => r.id = "__proto__");
  change("color", color(), (r) => r.id = [r.id]);
  change("color", color(), (r) => r.name = "visitor");
  for (const [mode, run] of bad) assert.throws(() => validateRun(mode, run));
  assert.throws(() => validateRun("hearing", reaction()));
  const min = reaction(1, Array(5).fill(100)), max = reaction(2, Array(5).fill(3000));
  assert.equal(validateRun("reaction", min), min);
  assert.equal(validateRun("reaction", max), max);
});

test("versioned storage is bounded per mode, reloads durable data and deletes one/all without touching other keys", () => {
  const disk = storage(), store = createHistoryStore(() => disk);
  disk.setItem("unrelated", "retain");
  for (let n = 1; n <= 25; n++) assert.equal(store.add("color", color(n)).ok, true);
  assert.equal(store.add("memory", memory(30)).ok, true);
  assert.equal(store.add("reaction", reaction(31)).ok, true);
  const durable = createHistoryStore(() => disk).read();
  assert.equal(durable.history.runs.color.length, HISTORY_LIMIT);
  assert.equal(durable.history.runs.color[0].id, id(6));
  assert.equal(durable.history.runs.memory.length, 1);
  assert.equal(achievementCount(durable.history), 3);
  assert.equal(store.add("color", color(25)).reason, "duplicate");
  assert.equal(store.add("memory", memory(25)).reason, "duplicate");
  assert.equal(store.remove("memory", id(30)).ok, true);
  assert.equal(achievementCount(store.read().history), 2);
  assert.equal(store.remove("color", id(6)).ok, true);
  assert.equal(store.read().history.runs.color[0].id, id(7));
  assert.equal(store.clear().ok, true);
  assert.equal(disk.getItem(HISTORY_KEY), null);
  assert.equal(disk.getItem("unrelated"), "retain");
});

test("corrupt, unsupported or oversized storage fails closed and explicit clear permits recovery", () => {
  const disk = storage(), store = createHistoryStore(() => disk);
  const invalid = ["{", "null", "[]", JSON.stringify({ ...emptyHistory(), version: 2 }), "x".repeat(HISTORY_MAX_SIZE + 1)];
  const duplicate = emptyHistory(); duplicate.runs.color = [color(), color()]; invalid.push(JSON.stringify(duplicate));
  const expanded = emptyHistory(); expanded.runs.user = []; invalid.push(JSON.stringify(expanded));
  const tooMany = emptyHistory(); tooMany.runs.memory = Array.from({ length: 21 }, (_, i) => memory(i)); invalid.push(JSON.stringify(tooMany));
  for (const raw of invalid) {
    disk.setItem(HISTORY_KEY, raw);
    assert.equal(store.read().reason, "corrupt");
    assert.equal(store.add("color", color()).ok, false);
    assert.equal(store.remove("color", id(1)).ok, false);
    assert.equal(disk.getItem(HISTORY_KEY), raw);
    assert.equal(store.clear().ok, true);
    assert.equal(store.add("color", color()).ok, true);
  }
  const bad = emptyHistory(); bad.runs.color = "wrong";
  assert.throws(() => validateHistory(bad));
});

test("storage getter, quota, readback and deletion failures do not claim success", () => {
  const denied = createHistoryStore(() => { throw new Error("blocked"); });
  assert.equal(denied.read().reason, "unavailable");
  assert.equal(denied.add("color", color()).ok, false);
  assert.equal(denied.clear().ok, false);
  const disk = storage(), store = createHistoryStore(() => disk);
  disk.setItem = () => { throw new Error("quota"); };
  assert.equal(store.add("color", color()).ok, false);
  assert.equal(store.read().history.runs.color.length, 0);
  disk.setItem = () => {};
  assert.equal(store.add("color", color()).ok, false);
  disk.data.set(HISTORY_KEY, JSON.stringify({ ...emptyHistory(), runs: { color: [color()], memory: [], reaction: [] } }));
  disk.removeItem = () => {};
  assert.equal(store.clear().ok, false);
  disk.removeItem = () => { throw new Error("blocked"); };
  assert.equal(store.clear().ok, false);
});

test("completion counts test kinds with actual durable full runs, not attempts or incomplete reaction results", () => {
  const history = emptyHistory();
  assert.equal(achievementCount(history), 0);
  history.runs.reaction = [{ ...reaction(1, []), rounds: Array.from({ length: 15 }, () => ({ outcome: "early" })) }];
  assert.equal(achievementCount(history), 0);
  history.runs.color = [color(2), color(3)];
  assert.equal(achievementCount(history), 1);
  history.runs.memory = [memory(4)];
  assert.equal(achievementCount(history), 2);
  history.runs.reaction.push(reaction(5));
  assert.equal(achievementCount(history), 3);
});

test("minimal progress read-modify-write preserves other apps and own removal affects only sense-lab", () => {
  const disk = storage(), provider = () => disk;
  assert.equal(REPO_IDS.length, 15);
  assert.equal(new Set(REPO_IDS).size, 15);
  disk.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, apps: { "packet-journey": { completed: 2, total: 7, updatedAt: date } } }));
  assert.equal(writeProgress(provider, { completed: 1, total: 3, updatedAt: date }), true);
  const progress = parseProgress(disk.getItem(PROGRESS_KEY));
  assert.deepEqual(progress.apps["sense-lab"], { completed: 1, total: 3, updatedAt: date });
  assert.deepEqual(progress.apps["packet-journey"], { completed: 2, total: 7, updatedAt: date });
  assert.equal(writeProgress(provider, null), true);
  assert.deepEqual(Object.keys(parseProgress(disk.getItem(PROGRESS_KEY)).apps), ["packet-journey"]);
  disk.removeItem(PROGRESS_KEY);
  assert.equal(writeProgress(provider, null), true);
  assert.equal(disk.getItem(PROGRESS_KEY), null);
});

test("progress rejects expanded, unknown, out-of-bounds and unsupported data without overwriting it", () => {
  const summary = { completed: 1, total: 3, updatedAt: date }, disk = storage();
  for (const bad of ["{", "null", "x".repeat(8193),
    JSON.stringify({ version: 2, apps: {} }), JSON.stringify({ version: 1, apps: { unknown: summary } }),
    '{"version":1,"apps":{"__proto__":{"completed":1,"total":3,"updatedAt":"2026-10-09T10:00:00.000Z"}}}',
    JSON.stringify({ version: 1, apps: { "sense-lab": { ...summary, actions: [] } } })]) {
    assert.throws(() => parseProgress(bad));
    disk.setItem(PROGRESS_KEY, bad);
    assert.equal(writeProgress(() => disk, summary), false);
    assert.equal(writeProgress(() => disk, null), false);
    assert.equal(disk.getItem(PROGRESS_KEY), bad);
  }
  disk.removeItem(PROGRESS_KEY);
  for (const invalid of [{ ...summary, completed: -1 }, { ...summary, completed: 4 }, { ...summary, completed: 1.5 },
    { ...summary, total: 1001 }, { ...summary, total: 2 }, { ...summary, updatedAt: "today" }, { ...summary, name: "user" }])
    assert.equal(writeProgress(() => disk, invalid), false);
  assert.equal(writeProgress(() => { throw new Error("blocked"); }, summary), false);
  disk.setItem = () => { throw new Error("quota"); };
  assert.equal(writeProgress(() => disk, summary), false);
});
