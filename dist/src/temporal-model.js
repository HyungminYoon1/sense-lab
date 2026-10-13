export const TEMPORAL_ROUNDS = 12;
export const TEMPORAL_FRAMES = Object.freeze([12, 9, 7, 5, 4, 3, 2, 1]);
export const TEMPORAL_COOLDOWN = 2000;
export function temporalRound(level, random = Math.random) {
  if (!Number.isInteger(level) || level < 0 || level >= TEMPORAL_FRAMES.length) throw new RangeError('Invalid temporal level');
  const side = random(), pause = random();
  if (![side, pause].every(n => Number.isFinite(n) && n >= 0 && n < 1)) throw new TypeError('Invalid entropy');
  return { level, first: side < 0.5 ? 'left' : 'right', frames: TEMPORAL_FRAMES[level], wait: 20 + Math.floor(pause * 25) };
}
export function temporalStep(state, correct) {
  if (!Number.isInteger(state?.level) || state.level < 0 || state.level >= TEMPORAL_FRAMES.length || ![0, 1].includes(state.streak) || typeof correct !== 'boolean') throw new TypeError('Invalid staircase');
  if (!correct) return { level: Math.max(0, state.level - 1), streak: 0 };
  return state.streak ? { level: Math.min(TEMPORAL_FRAMES.length - 1, state.level + 1), streak: 0 } : { level: state.level, streak: 1 };
}
export function frameEstimate(samples) {
  if (!Array.isArray(samples) || samples.length < 16 || samples.length > 120 || !Array.from(samples).every(n => Number.isFinite(n) && n > 0)) return null;
  const sorted = [...samples].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)];
  if (median < 3 || median > 50 || samples.some(n => n > Math.max(50, median * 2.5))) return null;
  const deviations = samples.map(n => Math.abs(n - median)).sort((a, b) => a - b);
  if (deviations[Math.floor(deviations.length / 2)] > median * 0.2) return null;
  return { interval: median, rate: Math.round(1000 / median) };
}
export function temporalTiming(firstAt, secondAt, interval, frames, gaps) {
  if (![firstAt, secondAt, interval].every(Number.isFinite) || interval <= 0 || !Number.isInteger(frames) || frames < 1 || !Array.isArray(gaps) || !gaps.length) return null;
  const elapsed = secondAt - firstAt;
  if (elapsed <= 0 || Math.abs(elapsed - interval * frames) > Math.max(interval * 1.5, interval * frames * 0.3) || Array.from(gaps).some(n => !Number.isFinite(n) || n <= 0 || n > Math.max(50, interval * 2.5))) return null;
  return Math.round(elapsed * 10) / 10;
}
