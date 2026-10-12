import test from 'node:test';
import assert from 'node:assert/strict';
import { temporalRound, temporalStep, frameEstimate, temporalTiming, TEMPORAL_FRAMES, TEMPORAL_COOLDOWN } from '../dist/src/temporal-model.js';
import { seededRandom } from '../dist/src/challenges.js';
test('temporal trials randomize order, retain a positive frame difference and reproduce only injected seeds', () => {
  let left = 0; const waits = new Set();
  for (let seed = 0; seed < 1000; seed++) for (let level = 0; level < TEMPORAL_FRAMES.length; level++) {
    const trial = temporalRound(level, seededRandom(seed)); assert.deepEqual(trial, temporalRound(level, seededRandom(seed)));
    assert(trial.frames >= 1 && trial.frames <= 12); left += trial.first === 'left'; waits.add(trial.wait);
  }
  assert(left > 3200 && left < 4800); assert(waits.size > 20); assert.equal(TEMPORAL_COOLDOWN, 2000);
  assert.throws(() => temporalRound(-1)); assert.throws(() => temporalRound(2, () => 1));
});
test('temporal difficulty changes after two hits or one miss and stays bounded', () => {
  assert.deepEqual(temporalStep({level:2,streak:0},true),{level:2,streak:1}); assert.deepEqual(temporalStep({level:2,streak:1},true),{level:3,streak:0});
  assert.deepEqual(temporalStep({level:7,streak:1},true),{level:7,streak:0}); assert.deepEqual(temporalStep({level:0,streak:0},false),{level:0,streak:0});
  assert.throws(() => temporalStep({level:99,streak:0},true));
});
test('frame estimation and onset timing reject interruption and unstable clocks', () => {
  assert.equal(frameEstimate(Array(30).fill(1000/60)).rate,60); assert.equal(frameEstimate([500, ...Array(29).fill(1000/60)]),null);
  assert.equal(frameEstimate(Array(30).fill(100)),null); assert.equal(temporalTiming(100,150,1000/60,3,Array(15).fill(1000/60)),50);
  assert.equal(temporalTiming(100,100,1000/60,1,[1000/60]),null); assert.equal(temporalTiming(100,500,1000/60,3,[400]),null);
});
