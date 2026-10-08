export const COLOR_DELTAS = Object.freeze([
  14, 11, 8, 6, 4.5, 3.4, 2.6, 2, 1.5, 1.1, 0.8, 0.6,
]);
export const HEARING_FREQUENCIES = Object.freeze(
  Array.from({ length: 9 }, (_, i) => 10000 + i * 1000),
);
export function makeColorRound(round, random = Math.random) {
  if (!Number.isInteger(round) || round < 0 || round >= COLOR_DELTAS.length)
    throw new TypeError("Invalid color round");
  const columns = round < 6 ? 4 : 5,
    count = columns * columns;
  const hue = Math.floor(random() * 360),
    saturation = 55 + Math.floor(random() * 20),
    lightness = 35 + Math.floor(random() * 20);
  const odd = Math.min(count - 1, Math.floor(random() * count)),
    delta = COLOR_DELTAS[round];
  return {
    columns,
    odd,
    delta,
    colors: Array.from(
      { length: count },
      (_, i) =>
        `hsl(${hue} ${saturation}% ${lightness + (i === odd ? delta : 0)}%)`,
    ),
  };
}
export function reactionInput(state, now) {
  if (!Number.isFinite(now)) throw new TypeError("Invalid input time");
  if (state.phase === "waiting") return { phase: "false-start" };
  if (state.phase === "go") {
    if (!Number.isFinite(state.signalAt) || now < state.signalAt)
      throw new TypeError("Invalid signal time");
    return { phase: "result", elapsed: Math.round(now - state.signalAt) };
  }
  return state;
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
