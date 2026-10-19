import test from "node:test";
import assert from "node:assert/strict";
import { createRecordStore } from "../dist/src/record-store.js";
import { RECORD_KEY, MODES, validateRecord, emptyRecords } from "../dist/src/record-model.js";
import { createCompletionStore, COMPLETION_KEY } from "../dist/src/completion.js";
import { HISTORY_KEY } from "../dist/src/history.js";
import { PROGRESS_KEY } from "../dist/src/progress.js";
import { colorStep, COLOR_DELTAS, memoryProfile, hearingPlan, seededRandom } from "../dist/src/challenges.js";
import { pitchStep, PITCH_CENTS } from "../dist/src/pitch-model.js";
import { temporalStep, TEMPORAL_FRAMES } from "../dist/src/temporal-model.js";

const date = "2026-10-19T10:00:00.000Z";
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function disk() {
  const data = new Map();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
}
export function fixture(kind, n = 1, mode = "standard") {
  const run = { id: id(n), completedAt: date, mode, rounds: [] };
  if (kind === "color") {
    let s = { level: mode === "challenge" ? 7 : 3, streak: 0 };
    for (let i=0;i<12;i++) { run.rounds.push({correct:true,level:s.level,delta:COLOR_DELTAS[s.level]}); s=colorStep(s,true); }
  } else if (kind === "reaction") run.rounds = Array.from({length:5},()=>({outcome:"valid",elapsed:250}));
  else if (kind === "memory") {
    run.mode = mode === "standard" ? "spatial" : mode;
    const p = memoryProfile(run.mode); run.pace=p.pace;
    run.rounds = p.lengths.map(length=>({correct:true,length}));
  } else if (kind === "hearing") run.rounds=hearingPlan(mode,seededRandom(1)).map(frequency=>({frequency,correct:false,heard:"neither"}));
  else {
    const pitch=kind==="pitch";
    let s={level: mode==="challenge"?(pitch?7:5):(pitch?3:2),streak:0};
    for(let i=0;i<12;i++) {
      run.rounds.push(pitch?{correct:true,cents:PITCH_CENTS[s.level]}:{correct:true,frames:TEMPORAL_FRAMES[s.level],ms:TEMPORAL_FRAMES[s.level]*16});
      s=(pitch?pitchStep:temporalStep)(s,true);
    }
  }
  return run;
}

test("six completed kinds write minimal completion only; no detailed history until explicit save", () => {
  const s=disk(), records=createRecordStore(()=>s), completion=createCompletionStore(()=>s);
  assert.equal(records.read().ok,true); assert.equal(s.data.size,0);
  for (const [i,kind] of MODES.entries()) assert.equal(completion.mark(kind,date).ok,true);
  assert.equal(s.getItem(RECORD_KEY),null); assert.equal(s.getItem(HISTORY_KEY),null);
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)).apps["sense-lab"],{completed:6,total:6,updatedAt:date});
  assert.equal(records.add("color",fixture("color")).ok,true);
  assert.equal(records.add("color",fixture("color")).reason,"duplicate");
  assert.equal(records.read().records.runs.color.length,1);
  const before=s.getItem(COMPLETION_KEY);
  records.clear(); assert.equal(s.getItem(COMPLETION_KEY),before);
});

test("legacy data is read without rewriting, seeds only actual completed kinds, reset stays reset", () => {
  const s=disk(), c=fixture("color"); delete c.mode;
  const old=JSON.stringify({version:1,runs:{color:[c],memory:[],reaction:[]}});
  s.setItem(HISTORY_KEY,old);
  const records=createRecordStore(()=>s), completion=createCompletionStore(()=>s);
  const data=records.read(); assert.equal(data.legacy.runs.color[0].id,c.id);
  completion.bootstrap(data);
  assert.equal(s.getItem(HISTORY_KEY),old); assert.equal(s.getItem(RECORD_KEY),null);
  assert.equal(JSON.parse(s.getItem(PROGRESS_KEY)).apps["sense-lab"].completed,1);
  assert.equal(completion.clear().ok,true);
  completion.bootstrap(records.read());
  assert.equal(Object.keys(completion.read().value.tests).length,0);
  assert.equal(s.getItem(HISTORY_KEY),old);
  assert.equal(s.getItem(PROGRESS_KEY),null);
});

test("new records validate all six modes and reject impossible or expanded content", () => {
  for(const [i,kind] of MODES.entries()) for(const mode of kind==="memory"?["classic","spatial","reverse"]:["standard","challenge"]) {
    const r=fixture(kind,i+1,mode); assert.equal(validateRecord(kind,r),r);
    const bad=structuredClone(r); bad.rounds.pop(); assert.throws(()=>validateRecord(kind,bad));
    const extra=structuredClone(r); extra.rounds[0].target=5; assert.throws(()=>validateRecord(kind,extra));
  }
  const bad=fixture("hearing"); bad.rounds[0].frequency=9999; assert.throws(()=>validateRecord("hearing",bad));
  const absent=fixture("temporal"); delete absent.rounds[0]; assert.throws(()=>validateRecord("temporal",absent));
  const impossible=fixture("pitch"); impossible.rounds[1].cents=3; assert.throws(()=>validateRecord("pitch",impossible));
  const s=disk(), records=createRecordStore(()=>s);
  for(let n=1;n<=23;n++) assert.equal(records.add("memory",fixture("memory",n,"reverse")).ok,true);
  assert.equal(records.read().records.runs.memory.length,20);
  assert.equal(records.read().records.runs.memory[0].id,id(4));
});

test("corruption, unknown versions, denied storage and quota failures preserve original data", () => {
  const s=disk(), r=createRecordStore(()=>s), c=createCompletionStore(()=>s);
  for(const raw of ["{",JSON.stringify({...emptyRecords(),version:99}),"x".repeat(131073)]) {
    s.setItem(RECORD_KEY,raw); assert.equal(r.add("color",fixture("color")).ok,false); assert.equal(s.getItem(RECORD_KEY),raw);
  }
  for(const raw of ["{",'{"version":1,"tests":{"unknown":true}}','{"version":1,"tests":[],"extra":1}']) {
    s.setItem(COMPLETION_KEY,raw); assert.equal(c.mark("color",date).ok,false); assert.equal(s.getItem(COMPLETION_KEY),raw);
  }
  s.removeItem(COMPLETION_KEY); s.removeItem(RECORD_KEY);
  s.setItem=()=>{throw Error("quota");};
  assert.equal(c.mark("color",date).ok,false); assert.equal(s.getItem(PROGRESS_KEY),null);
  assert.equal(r.add("color",fixture("color")).ok,false);
  assert.equal(createCompletionStore(()=>{throw Error("denied");}).read().ok,false);
  assert.equal(createRecordStore(()=>{throw Error("denied");}).read().ok,false);
});

test("shared summary failures remain separate and peer records are untouched", () => {
  const s=disk(), c=createCompletionStore(()=>s);
  s.setItem(PROGRESS_KEY,"{invalid");
  const result=c.mark("color",date); assert.equal(result.ok,true); assert.equal(result.synced,false);
  assert.equal(s.getItem(PROGRESS_KEY),"{invalid");
  const peer={completed:2,total:3,updatedAt:date};
  s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"traffic-lab":peer}}));
  c.mark("pitch",date); c.clear();
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)).apps,{"traffic-lab":peer});
});

test("silent write/delete failures never report durability and individual deletion preserves other kinds", () => {
  const s=disk(), r=createRecordStore(()=>s), c=createCompletionStore(()=>s);
  s.setItem=()=>{};
  assert.equal(r.add("color",fixture("color")).ok,false);
  assert.equal(c.mark("color",date).ok,false);
  s.setItem=(k,v)=>s.data.set(k,v);
  r.add("color",fixture("color",1));r.add("pitch",fixture("pitch",2));
  r.remove("color",id(1));assert.equal(r.read().records.runs.pitch.length,1);
  assert.equal(r.read().records.runs.color.length,0);
  s.removeItem=()=>{};assert.equal(r.clear().ok,false);
  assert.equal(r.read().records.runs.pitch.length,1);
  assert.equal(c.mark("unknown",date).ok,false);
  assert.equal(c.mark("color","2026-02-30T10:00:00.000Z").ok,false);
});

test("exhausted reaction records are optional results, never completed-kind imports", () => {
  const s=disk(), r=createRecordStore(()=>s), c=createCompletionStore(()=>s);
  const run=fixture("reaction");run.rounds=Array.from({length:15},()=>({outcome:"early"}));
  assert.equal(r.add("reaction",run).ok,true);
  c.bootstrap(r.read());assert.equal(s.getItem(PROGRESS_KEY),null);
  assert.equal(s.getItem(COMPLETION_KEY),null);
});
