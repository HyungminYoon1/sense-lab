import test from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_DELTAS,
  HEARING_FREQUENCIES,
  makeColorRound,
  reactionInput,
  median,
  seededRandom,
  colorStep,
  COLOR_ROUNDS,
  reactionSignal,
  reactionDelay,
  settleReaction,
  reactionSummary,
  REACTION_RULES,
  MEMORY_LENGTHS,
  makeMemoryRound,
  memoryInput,
} from "../dist/src/challenges.js";
test("every color round contains exactly one different tile", () => {
  for (let round = 0; round < COLOR_DELTAS.length; round++) {
    const board = makeColorRound(round, () => 0.4);
    assert.equal(board.colors.length, board.columns ** 2);
    assert.equal(
      board.colors.filter((c) => c === board.colors[board.odd]).length,
      1,
    );
    assert.equal(new Set(board.colors).size, 2);
    if (round) assert.ok(board.delta < COLOR_DELTAS[round - 1]);
  }
});
test("invalid color round is rejected", () => {
  for (const round of [-1, 12, NaN, 1.5])
    assert.throws(() => makeColorRound(round), TypeError);
});
test("early and repeated waiting input cannot produce a time", () => {
  const failed = reactionInput({ phase: "waiting" }, 123);
  assert.equal(failed.phase, "false-start");
  assert.deepEqual(reactionInput(failed, 125), failed);
  assert.equal(failed.elapsed, undefined);
});
test("only a signal-ready trial records elapsed monotonic time", () => {
  const pending = reactionInput({ phase: "go", signalAt: 100 }, 337);
  assert.deepEqual(pending, {
    phase: "settling",
    elapsed: 237,
    acceptedAt: 337,
  });
  assert.equal(settleReaction(pending, 586).phase, "settling");
  assert.deepEqual(settleReaction(pending, 587), { phase: "result", elapsed: 237 });
  assert.equal(reactionInput({ phase: "go", signalAt: 100 }, 99).phase, "false-start");
  assert.equal(reactionInput({ phase: "cancelled" }, 500).elapsed, undefined);
});
test("seeded internals reproduce boards, delays and sequences; bad random samples fail closed", () => {
  const a = seededRandom(12345), b = seededRandom(12345);
  for (let i = 0; i < 12; i++) {
    assert.deepEqual(makeColorRound(i, a), makeColorRound(i, b));
    assert.equal(reactionDelay(a), reactionDelay(b));
    assert.deepEqual(makeMemoryRound(i % 8, a), makeMemoryRound(i % 8, b));
  }
  for (const value of [NaN, Infinity, -0.01, 1]) {
    assert.throws(() => makeColorRound(0, () => value));
    assert.throws(() => makeMemoryRound(0, () => value));
    assert.throws(() => reactionDelay(() => value));
  }
  for (const seed of [-1, 1.5, 2 ** 32, NaN]) assert.throws(() => seededRandom(seed));
  assert.notDeepEqual(makeColorRound(8, seededRandom(1)), makeColorRound(8, seededRandom(2)));
});
test("staircase responds to errors, stays bounded and reaches hard boards within twelve rounds", () => {
  let state = { level: 3, streak: 0 };
  const visited = [];
  for (let round = 0; round < COLOR_ROUNDS; round++) {
    visited.push(state.level);
    state = colorStep(state, true);
  }
  assert.ok(visited.includes(11));
  assert.deepEqual(colorStep({ level: 5, streak: 1 }, false), { level: 4, streak: 0 });
  assert.deepEqual(colorStep({ level: 0, streak: 0 }, false), { level: 0, streak: 0 });
  assert.deepEqual(colorStep({ level: 11, streak: 1 }, true), { level: 11, streak: 0 });
  assert.throws(() => colorStep({ level: NaN, streak: 0 }, true));
  assert.throws(() => colorStep({ level: 0, streak: 3 }, false));
  for (let level = 0; level < 12; level++) {
    for (const value of [0, 0.999999]) {
      const board = makeColorRound(level, () => value);
      assert.ok(board.odd >= 0 && board.odd < board.colors.length);
      for (const color of board.colors) {
        const lightness = Number(color.match(/ ([\d.]+)%\)$/)[1]);
        assert.ok(lightness >= 18 && lightness <= 81);
      }
    }
  }
  assert.equal(makeColorRound(11, () => 0.4).columns, 6);
  assert.equal(makeColorRound(11, () => 0.4).delta, 0.35);
});
test("held input, rapid anticipation, repeat and cross-method spam cannot settle a result", () => {
  assert.equal(reactionSignal({ phase: "waiting" }, 500, true).reason, "held");
  const go = reactionSignal({ phase: "waiting" }, 500);
  for (const t of [500, 501, 599.999]) assert.equal(reactionInput(go, t).reason, "anticipation");
  assert.equal(reactionInput(go, 700, { repeat: true }).reason, "held");
  const pending = reactionInput(go, 700);
  for (let i = 0; i < 100; i++) {
    const failed = reactionInput(pending, 700 + i);
    assert.equal(failed.reason, "spam");
    assert.equal(settleReaction(failed, 2000).phase, "invalid");
    assert.equal(reactionInput(failed, 2100).elapsed, undefined);
  }
  assert.equal(reactionInput(go, 3500).phase, "settling");
  assert.equal(reactionInput(go, 3500.001).reason, "timeout");
  assert.equal(reactionInput(go, 600).phase, "settling");
  for (const t of [NaN, Infinity, -1]) {
    assert.throws(() => reactionInput(go, t));
    assert.throws(() => reactionSignal({ phase: "waiting" }, t));
    assert.throws(() => settleReaction(pending, t));
  }
  assert.equal(reactionDelay(() => 0), 1600);
  assert.equal(reactionDelay(() => 0.999999), 4300);
});
test("reaction center and deviation resist one outlier without removing valid observations", () => {
  const values = [200, 205, 210, 215, 2900];
  assert.deepEqual(reactionSummary(values), { count: 5, median: 210, mad: 5, best: 200, worst: 2900 });
  assert.equal(values.length, REACTION_RULES.trials);
  assert.equal(reactionSummary([]).median, null);
  for (const values of [[99], [3001], [NaN], [200.1], Array(6).fill(200)])
    assert.throws(() => reactionSummary(values));
});
test("memory only scores the full ordered sequence, ignores inactive input and has finite bounds", () => {
  for (let round = 0; round < MEMORY_LENGTHS.length; round++) {
    const board = makeMemoryRound(round, seededRandom(round));
    assert.equal(board.sequence.length, MEMORY_LENGTHS[round]);
    assert.equal(new Set(board.sequence).size, board.sequence.length);
    assert.ok(board.sequence.every((p) => p >= 0 && p < 16));
    assert.equal(memoryInput(board, 0), board);
    let state = { ...board, phase: "recall" };
    for (const cell of board.sequence) state = memoryInput(state, cell);
    assert.equal(state.phase, "hit");
    assert.equal(memoryInput(state, 0), state);
    const failed = memoryInput({ ...board, phase: "recall" }, (board.sequence[0] + 1) % 16);
    assert.equal(failed.phase, "miss");
    assert.equal(memoryInput(failed, board.sequence[0]), failed);
  }
  for (const round of [-1, 8, NaN, 0.5]) assert.throws(() => makeMemoryRound(round));
  for (const cell of [-1, 16, NaN, 1.5]) assert.throws(() => memoryInput({ phase: "recall" }, cell));
});
test("median does not mutate trials and handles five rounds", () => {
  const times = [300, 210, 190, 400, 200];
  assert.equal(median(times), 210);
  assert.deepEqual(times, [300, 210, 190, 400, 200]);
  assert.equal(median([]), null);
  assert.equal(median([2, 4]), 3);
});
test("nine hearing frequencies cover the requested range", () => {
  assert.equal(HEARING_FREQUENCIES[0], 10000);
  assert.equal(HEARING_FREQUENCIES.at(-1), 18000);
  assert.equal(HEARING_FREQUENCIES.length, 9);
});
