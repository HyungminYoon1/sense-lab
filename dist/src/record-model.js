import { validDate, validateRun, summarizeRun } from "./history.js";
import { colorStep, COLOR_DELTAS, memoryProfile, HEARING_FREQUENCIES } from "./challenges.js";
import { pitchStep, PITCH_CENTS } from "./pitch-model.js";
import { temporalStep, TEMPORAL_FRAMES } from "./temporal-model.js";

export const RECORD_KEY = "sense-lab-records-v2";
export const MODES = Object.freeze(["color", "reaction", "hearing", "pitch", "memory", "temporal"]);
export const RECORD_LIMIT = 20;
export const RECORD_MAX_SIZE = 131072;
export const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export const emptyRecords = () => ({version:2,runs:Object.fromEntries(MODES.map(kind=>[kind,[]]))});
const fail = () => { throw new TypeError("Invalid optional record"); };
export function validateRecord(kind, run) {
  if (!MODES.includes(kind) || !exact(run,kind==="memory"?["id","completedAt","mode","rounds","pace"]:["id","completedAt","mode","rounds"]) ||
    typeof run.id!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(run.id) ||
    !validDate(run.completedAt) || !Array.isArray(run.rounds) ||
    !(kind==="memory"?["classic","spatial","reverse"]:["standard","challenge"]).includes(run.mode)) fail();
  if (kind==="reaction") {
    validateRun("reaction",{id:run.id,completedAt:run.completedAt,rounds:run.rounds}); return run;
  }
  if (kind==="memory") {
    const profile=memoryProfile(run.mode);
    if (!(run.mode==="classic"?[850,1500]:[profile.pace]).includes(run.pace) || run.rounds.length!==8) fail();
    for (const [i,round] of run.rounds.entries()) if (!exact(round,["correct","length"]) || typeof round.correct!=="boolean" || round.length!==profile.lengths[i]) fail();
  } else if (kind==="hearing") {
    const repetitions=run.mode==="challenge"?2:1;
    if(run.rounds.length!==9*repetitions) fail();
    for(const round of run.rounds) if(!exact(round,["frequency","correct","heard"]) || !HEARING_FREQUENCIES.includes(round.frequency) || typeof round.correct!=="boolean" || !["a","b","neither"].includes(round.heard) || (round.heard==="neither"&&round.correct)) fail();
    for(const frequency of HEARING_FREQUENCIES) if(run.rounds.filter(r=>r.frequency===frequency).length!==repetitions) fail();
  } else {
    if(run.rounds.length!==12) fail();
    let state={level:run.mode==="challenge"?(kind==="temporal"?5:7):(kind==="temporal"?2:3),streak:0};
    for(const round of run.rounds) {
      const keys=kind==="color"?["correct","level","delta"]:kind==="pitch"?["correct","cents"]:["correct","frames","ms"];
      if(!exact(round,keys) || typeof round.correct!=="boolean") fail();
      if(kind==="color") {
        if(round.level!==state.level || round.delta!==COLOR_DELTAS[state.level]) fail();
        state=colorStep(state,round.correct);
      } else if(kind==="pitch") {
        if(round.cents!==PITCH_CENTS[state.level]) fail();
        state=pitchStep(state,round.correct);
      } else {
        if(round.frames!==TEMPORAL_FRAMES[state.level] || !Number.isFinite(round.ms) || round.ms<=0 || round.ms>1000) fail();
        state=temporalStep(state,round.correct);
      }
    }
  }
  return run;
}
export function validateRecords(value) {
  if(!exact(value,["version","runs"]) || value.version!==2 || !exact(value.runs,MODES)) fail();
  const ids=new Set();
  for(const kind of MODES) {
    if(!Array.isArray(value.runs[kind]) || value.runs[kind].length>RECORD_LIMIT) fail();
    for(const run of value.runs[kind]) {validateRecord(kind,run); if(ids.has(run.id)) fail(); ids.add(run.id);}
  }
  return value;
}
export function isComplete(kind, run) {
  validateRecord(kind,run);
  return kind!=="reaction" || summarizeRun("reaction",{id:run.id,completedAt:run.completedAt,rounds:run.rounds}).complete;
}
