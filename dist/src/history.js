import { COLOR_ROUNDS, COLOR_DELTAS, colorStep, MEMORY_LENGTHS, REACTION_RULES, reactionSummary } from "./challenges.js";

export const HISTORY_KEY = "sense-lab-history-v1";
export const HISTORY_LIMIT = 20;
export const HISTORY_MAX_SIZE = 65536;
export const TESTS = Object.freeze(["color", "reaction", "memory"]);
export const emptyHistory = () => ({ version: 1, runs: { color: [], reaction: [], memory: [] } });
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
export const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const fail = () => { throw new TypeError("Invalid sensory history"); };

// Pure validation and calculations: no DOM, clock, random source or storage.
export function validateRun(mode, run) {
  if (!TESTS.includes(mode) || !exact(run, mode === "memory" ? ["id", "completedAt", "rounds", "pace"] : ["id", "completedAt", "rounds"]) ||
      typeof run.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(run.id) ||
      !validDate(run.completedAt) || !Array.isArray(run.rounds)) fail();
  if (mode === "color") {
    if (run.rounds.length !== COLOR_ROUNDS) fail();
    let state = { level: 3, streak: 0 };
    for (const round of run.rounds) {
      if (!exact(round, ["correct", "level", "delta"]) || typeof round.correct !== "boolean" ||
          round.level !== state.level || round.delta !== COLOR_DELTAS[state.level]) fail();
      state = colorStep(state, round.correct);
    }
  } else if (mode === "memory") {
    if (![850, 1500].includes(run.pace) || run.rounds.length !== MEMORY_LENGTHS.length) fail();
    for (let i = 0; i < MEMORY_LENGTHS.length; i++) {
      const round = run.rounds[i];
      if (!exact(round, ["correct", "length"]) || typeof round.correct !== "boolean" || round.length !== MEMORY_LENGTHS[i]) fail();
    }
  } else {
    if (run.rounds.length < 5 || run.rounds.length > REACTION_RULES.attempts) fail();
    let valid = 0;
    for (const round of run.rounds) {
      if (valid === REACTION_RULES.trials || !["valid", "early", "excluded", "cancelled"].includes(round?.outcome) ||
          !exact(round, round.outcome === "valid" ? ["outcome", "elapsed"] : ["outcome"])) fail();
      if (round.outcome === "valid") { reactionSummary([round.elapsed]); valid++; }
    }
    if (valid !== REACTION_RULES.trials && run.rounds.length !== REACTION_RULES.attempts) fail();
  }
  return run;
}
export function validateHistory(value) {
  if (!exact(value, ["version", "runs"]) || value.version !== 1 || !exact(value.runs, TESTS)) fail();
  const ids = new Set();
  for (const mode of TESTS) {
    const runs = value.runs[mode];
    if (!Array.isArray(runs) || runs.length > HISTORY_LIMIT) fail();
    for (const run of runs) {
      validateRun(mode, run);
      if (ids.has(run.id)) fail();
      ids.add(run.id);
    }
  }
  return value;
}
export function summarizeRun(mode, run) {
  validateRun(mode, run);
  if (mode === "reaction") {
    const values = run.rounds.filter((r) => r.outcome === "valid").map((r) => r.elapsed);
    return { ...reactionSummary(values), complete: values.length === 5,
      early: run.rounds.filter((r) => r.outcome === "early").length,
      excluded: run.rounds.filter((r) => ["excluded", "cancelled"].includes(r.outcome)).length };
  }
  const hits = run.rounds.filter((r) => r.correct);
  return mode === "color" ? { hits: hits.length, smallest: hits.length ? Math.min(...hits.map((r) => r.delta)) : null } :
    { hits: hits.length, longest: hits.length ? Math.max(...hits.map((r) => r.length)) : 0, pace: run.pace };
}
export function personalTrend(mode, runs) {
  runs.forEach((run) => validateRun(mode, run));
  const eligible = mode === "reaction" ? runs.filter((run) => summarizeRun(mode, run).complete) : runs;
  const latest = eligible.at(-1);
  if (!latest) return null;
  const matching = eligible.filter((run) => mode !== "memory" || run.pace === latest.pace);
  const previous = matching.at(-2);
  const metric = (run) => {
    const summary = summarizeRun(mode, run);
    return mode === "reaction" ? summary.median : summary.hits;
  };
  return { count: matching.length, latest: metric(latest), previous: previous ? metric(previous) : null,
    change: previous ? metric(latest) - metric(previous) : null,
    recent: matching.slice(-5).map(metric), pace: mode === "memory" ? latest.pace : null };
}
export function achievementCount(history) {
  validateHistory(history);
  return TESTS.filter((mode) => history.runs[mode].some((run) => mode !== "reaction" || summarizeRun(mode, run).complete)).length;
}
