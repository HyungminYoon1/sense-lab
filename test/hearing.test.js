import test from "node:test";
import assert from "node:assert/strict";
import { playPair, stopPair } from "../dist/src/hearing.js";
test("invalid hearing settings fail before starting browser audio", async () => {
  for (const args of [
    [9000, "a", 3],
    [19000, "a", 3],
    [10000, "bad", 3],
    [10000, "a", 11],
  ])
    await assert.rejects(
      playPair(...args, () => {}),
      TypeError,
    );
});
test("test-double: high-frequency sine gain is bounded and stop cancels playback", async () => {
  const originalWindow = globalThis.window,
    originalDocument = globalThis.document,
    calls = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime(value) {
      calls.push(["value", value]);
    },
    linearRampToValueAtTime(value) {
      calls.push(["ramp", value]);
    },
    cancelScheduledValues() {},
    setTargetAtTime(value) {
      calls.push(["stop-gain", value]);
    },
  });
  class FakeAudioContext {
    currentTime = 0;
    sampleRate = 48000;
    destination = {};
    async resume() {}
    createGain() {
      return { gain: parameter(), connect() {}, disconnect() {} };
    }
    createOscillator() {
      const osc = {
        frequency: parameter(),
        type: "",
        connect() {},
        disconnect() {},
        start() {
          calls.push(["start", osc.frequency.value, osc.type]);
        },
        stop() {
          calls.push(["stop"]);
        },
      };
      return osc;
    }
  }
  globalThis.window = { AudioContext: FakeAudioContext };
  globalThis.document = { hidden: false };
  try {
    const playback = playPair(18000, "a", 10, (phase) =>
      calls.push(["phase", phase]),
    );
    const rejected = assert.rejects(playback, { name: "AbortError" });
    await new Promise((resolve) => setImmediate(resolve));
    stopPair();
    await rejected;
    assert.ok(
      calls.some((c) => c[0] === "start" && c[1] === 18000 && c[2] === "sine"),
    );
    assert.ok(
      calls
        .filter((c) => ["value", "ramp"].includes(c[0]))
        .every((c) => c[1] >= 0 && c[1] <= 0.02),
    );
    assert.ok(calls.some((c) => c[0] === "stop"));
    assert.ok(calls.some((c) => c[0] === "stop-gain" && c[1] === 0));
  } finally {
    stopPair();
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
