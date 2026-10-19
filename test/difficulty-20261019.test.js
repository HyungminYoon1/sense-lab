import test from "node:test";
import assert from "node:assert/strict";
import * as challenge from "../dist/src/challenges.js";
import { seededRandom } from "../dist/src/challenges.js";

test("memory has larger boards, longer recall and an explicit reverse-order challenge", () => {
  assert.equal(typeof challenge.memoryProfile, "function");
  const normal = challenge.memoryProfile("spatial"), hard = challenge.memoryProfile("reverse");
  assert.equal(normal.columns, 5);
  assert.equal(hard.columns, 6);
  assert.ok(normal.lengths.at(-1) >= 10);
  assert.ok(hard.lengths.at(-1) >= 12);
  assert.equal(hard.reverse, true);
  for (const mode of ["classic", "spatial", "reverse"]) for (let seed = 0; seed < 50; seed++) {
    for (let round = 0; round < 8; round++) {
      const p = challenge.memoryProfile(mode), board = challenge.makeMemoryRound(round, seededRandom(seed), mode);
      assert.equal(board.sequence.length, p.lengths[round]);
      assert.equal(new Set(board.sequence).size, board.sequence.length);
      assert.ok(board.sequence.every(cell => cell >= 0 && cell < p.columns ** 2));
      let state = { ...board, phase: "recall" };
      const answers = p.reverse ? [...board.sequence].reverse() : board.sequence;
      for (const cell of answers) state = challenge.memoryInput(state, cell);
      assert.equal(state.phase, "hit");
      assert.equal(challenge.memoryInput(state, 0), state);
    }
  }
  assert.throws(() => challenge.memoryProfile("unknown"));
});

test("hearing sessions shuffle all frequencies and repeat each in challenge mode", () => {
  assert.equal(typeof challenge.hearingPlan, "function");
  for (const mode of ["standard", "challenge"]) {
    const plan = challenge.hearingPlan(mode, seededRandom(7));
    assert.deepEqual(plan, challenge.hearingPlan(mode, seededRandom(7)));
    assert.notDeepEqual(plan, challenge.hearingPlan(mode, seededRandom(8)));
    for (const freq of challenge.HEARING_FREQUENCIES) assert.equal(plan.filter(v => v === freq).length, mode === "challenge" ? 2 : 1);
    assert.notDeepEqual(plan.slice(0, 9), challenge.HEARING_FREQUENCIES);
  }
  assert.throws(() => challenge.hearingPlan("standard", () => NaN));
});

test("focus reaction varies delay and keeps distractors before the real signal", () => {
  assert.equal(typeof challenge.reactionPlan, "function");
  const cues=new Set();
  for(let seed=0;seed<100;seed++) {
    const plan=challenge.reactionPlan("challenge",seededRandom(seed));
    assert.ok(plan.delay>=1600 && plan.delay<=6500);
    if(plan.cueAt!==null) assert.ok(plan.cueAt>=400 && plan.cueAt<plan.delay-400);
    cues.add(plan.cueAt===null);
  }
  assert.equal(cues.size,2);
  assert.equal(challenge.reactionPlan("standard",()=>0).cueAt,null);
  assert.throws(()=>challenge.reactionPlan("challenge",()=>1));
});
