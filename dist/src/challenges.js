export const COLOR_DELTAS = Object.freeze([
  14, 10, 7, 5, 3.5, 2.5, 1.8, 1.2, 0.85, 0.6, 0.45, 0.35,
]);
export const COLOR_ROUNDS = 12;
export const HEARING_FREQUENCIES = Object.freeze(
  Array.from({ length: 9 }, (_, i) => 10000 + i * 1000),
);
export const REACTION_RULES = Object.freeze({
  minimum: 100, maximum: 3000, settle: 250, trials: 5, attempts: 15,
});
export const MEMORY_LENGTHS = Object.freeze([3, 3, 4, 4, 5, 5, 6, 7]);
function sample(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new TypeError("Random sample must be in [0, 1)");
  return value;
}
export function seededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new TypeError("Invalid seed");
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeColorRound(level, random = Math.random) {
  if (!Number.isInteger(level) || level < 0 || level >= COLOR_DELTAS.length)
    throw new TypeError("Invalid color level");
  const columns = level < 4 ? 4 : level < 8 ? 5 : 6;
  const hue = Math.floor(sample(random) * 360),
    saturation = 45 + Math.floor(sample(random) * 30),
    lightness = 32 + Math.floor(sample(random) * 36),
    odd = Math.floor(sample(random) * columns ** 2),
    direction = sample(random) < 0.5 ? -1 : 1,
    delta = COLOR_DELTAS[level];
  return {
    level, columns, odd, delta, direction,
    colors: Array.from({ length: columns ** 2 }, (_, i) =>
      `hsl(${hue} ${saturation}% ${lightness + (i === odd ? direction * delta : 0)}%)`),
  };
}
// Two correct answers advance two levels; a miss drops one. This is a game rule,
// not an estimator of a clinical or perceptual threshold.
export function colorStep(state, correct) {
  if (!Number.isInteger(state.level) || state.level < 0 || state.level >= COLOR_DELTAS.length ||
      ![0, 1].includes(state.streak) || typeof correct !== "boolean")
    throw new TypeError("Invalid staircase state");
  if (!correct) return { level: Math.max(0, state.level - 1), streak: 0 };
  if (!state.streak) return { level: state.level, streak: 1 };
  return { level: Math.min(COLOR_DELTAS.length - 1, state.level + 2), streak: 0 };
}
export function reactionDelay(random = Math.random) {
  return 1600 + Math.floor(sample(random) * 2701);
}
function time(now) {
  if (!Number.isFinite(now) || now < 0) throw new TypeError("Invalid time");
}
export function reactionSignal(state, now, held = false) {
  time(now);
  if (state.phase !== "waiting") return state;
  return held ? { phase: "invalid", reason: "held" } : { phase: "go", signalAt: now };
}
export function reactionInput(state, now, { repeat = false } = {}) {
  time(now);
  if (state.phase === "waiting") return { phase: "false-start", reason: "early" };
  if (state.phase === "settling") return { phase: "invalid", reason: "spam" };
  if (state.phase !== "go") return state;
  time(state.signalAt);
  const elapsed = now - state.signalAt;
  if (elapsed < 0) return { phase: "false-start", reason: "early" };
  if (repeat) return { phase: "invalid", reason: "held" };
  if (elapsed < REACTION_RULES.minimum) return { phase: "invalid", reason: "anticipation" };
  if (elapsed > REACTION_RULES.maximum) return { phase: "invalid", reason: "timeout" };
  return { phase: "settling", elapsed: Math.round(elapsed), acceptedAt: now };
}
export function settleReaction(state, now) {
  time(now);
  if (state.phase !== "settling" || now - state.acceptedAt < REACTION_RULES.settle) return state;
  return { phase: "result", elapsed: state.elapsed };
}
export function median(values) {
  if (!values.length) return null;
  if (!values.every((v) => Number.isFinite(v) && v >= 0))
    throw new TypeError("Invalid observations");
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function reactionSummary(values) {
  if (values.length > REACTION_RULES.trials ||
      values.some((v) => !Number.isInteger(v) || v < REACTION_RULES.minimum || v > REACTION_RULES.maximum))
    throw new TypeError("Invalid reaction observations");
  const center = median(values);
  return {
    count: values.length, median: center,
    mad: center === null ? null : median(values.map((v) => Math.abs(v - center))),
    best: values.length ? Math.min(...values) : null,
    worst: values.length ? Math.max(...values) : null,
  };
}
export function makeMemoryRound(round, random = Math.random) {
  if (!Number.isInteger(round) || round < 0 || round >= MEMORY_LENGTHS.length)
    throw new TypeError("Invalid memory round");
  const cells = Array.from({ length: 16 }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(sample(random) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { phase: "showing", sequence: cells.slice(0, MEMORY_LENGTHS[round]), cursor: 0 };
}
export function memoryInput(state, cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell > 15) throw new TypeError("Invalid cell");
  if (state.phase !== "recall") return state;
  const correct = cell === state.sequence[state.cursor], cursor = state.cursor + 1;
  return { ...state, cursor, phase: !correct ? "miss" : cursor === state.sequence.length ? "hit" : "recall" };
}
