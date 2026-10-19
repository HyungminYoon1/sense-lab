import { MODES, exact, isComplete } from "./record-model.js";
import { validDate, summarizeRun } from "./history.js";
import { writeProgress } from "./progress.js";

export const COMPLETION_KEY="sense-lab-completion-v1";
const empty=()=>({version:1,tests:{}});
export function parseCompletion(raw) {
  if(raw===null) return empty();
  if(typeof raw!=="string" || raw.length>1024) throw new TypeError("Invalid completion size");
  const v=JSON.parse(raw);
  if(!exact(v,["version","tests"]) || v.version!==1 || !v.tests || typeof v.tests!=="object" || Array.isArray(v.tests) ||
    Object.entries(v.tests).some(([kind,date])=>!MODES.includes(kind)||!validDate(date))) throw new TypeError("Invalid completion");
  return v;
}
export function createCompletionStore(provider) {
  function read() {
    try {const raw=provider().getItem(COMPLETION_KEY); return {ok:true,exists:raw!==null,value:parseCompletion(raw)};}
    catch {return {ok:false,value:empty()};}
  }
  function sync(value) {
    const dates=Object.values(value.tests).sort();
    return writeProgress(provider,dates.length?{completed:dates.length,total:6,updatedAt:dates.at(-1)}:null);
  }
  function write(value) {
    try {
      const raw=JSON.stringify(value); parseCompletion(raw);
      const storage=provider(); storage.setItem(COMPLETION_KEY,raw);
      if(storage.getItem(COMPLETION_KEY)!==raw) return {ok:false};
      return {ok:true,synced:sync(value),value};
    } catch {return {ok:false};}
  }
  return {
    read,
    mark(kind,date) {
      if(!MODES.includes(kind)||!validDate(date)) return {ok:false};
      const current=read(); if(!current.ok) return current;
      current.value.tests[kind]=date; return write(current.value);
    },
    bootstrap(records) {
      const current=read(); if(!current.ok) return current;
      if(current.exists) return {...current,synced:sync(current.value)};
      const value=empty();
      for(const kind of MODES) {
        const dates=[];
        if(records.legacyOk) for(const run of records.legacy.runs[kind]||[]) if(kind!=="reaction"||summarizeRun(kind,run).complete) dates.push(run.completedAt);
        if(records.ok) for(const run of records.records.runs[kind]) if(isComplete(kind,run)) dates.push(run.completedAt);
        if(dates.length) value.tests[kind]=dates.sort().at(-1);
      }
      return Object.keys(value.tests).length?write(value):{ok:true,synced:true,value};
    },
    // Keep an empty marker so preserved history does not re-create cleared badges.
    clear:()=>write(empty()),
  };
}
