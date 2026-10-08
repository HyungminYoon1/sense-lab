import test from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_DELTAS,
  HEARING_FREQUENCIES,
  makeColorRound,
  reactionInput,
  median,
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
  assert.deepEqual(reactionInput({ phase: "go", signalAt: 100 }, 337), {
    phase: "result",
    elapsed: 237,
  });
  assert.throws(() => reactionInput({ phase: "go", signalAt: 100 }, 99));
  assert.equal(reactionInput({ phase: "cancelled" }, 500).elapsed, undefined);
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
