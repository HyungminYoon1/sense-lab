import test from "node:test";
import assert from "node:assert/strict";
import {
  surroundLightness,
  waveSample,
  makeParticles,
  moveParticle,
} from "../dist/src/model.js";
test("equal surroundings at zero contrast", () =>
  assert.deepEqual(surroundLightness(0), [50, 50]));
test("reveal makes backgrounds equal", () =>
  assert.deepEqual(surroundLightness(100, true), [92, 92]));
test("lightness stays bounded", () => {
  for (const level of [-10, 0, 70, 100, 120])
    for (const value of surroundLightness(level))
      assert.ok(value >= 2 && value <= 98);
});
test("wave models are periodic and bounded", () => {
  for (const kind of ["sine", "triangle", "square"])
    for (let phase = -10; phase < 10; phase += 0.12) {
      assert.ok(Math.abs(waveSample(kind, phase)) <= 1);
      assert.ok(
        Math.abs(
          waveSample(kind, phase) - waveSample(kind, phase + Math.PI * 2),
        ) < 1e-9,
      );
    }
});
test("particle count is limited and positions finite", () => {
  const points = makeParticles(900, 640, 320, () => 0.4);
  assert.equal(points.length, 700);
  assert.ok(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
});
test("particle update has no singularity at the target", () => {
  const p = { x: 50, y: 50, vx: 0, vy: 0 };
  moveParticle(p, { x: 50, y: 50 }, "attract", 100, 100);
  assert.ok(Object.values(p).every(Number.isFinite));
});
