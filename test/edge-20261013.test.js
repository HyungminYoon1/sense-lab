import test from "node:test";
import assert from "node:assert/strict";
import {frameEstimate,temporalTiming,temporalRound} from "../dist/src/temporal-model.js";
import {reactionSignal,reactionInput,settleReaction,seededRandom,makeMemoryRound,memoryInput} from "../dist/src/challenges.js";
import {writeProgress,PROGRESS_KEY} from "../dist/src/progress.js";

test("EDGE sparse calibration samples are invalid, never a NaN rate",()=>{
  for(const size of [16,30,120]) {
    const samples=Array(size).fill(16);delete samples[0];
    assert.equal(frameEstimate(samples),null);
  }
});
test("EDGE sparse onset gaps cannot certify timing",()=>{
  assert.equal(temporalTiming(100,116,16,1,Array(1)),null);
});
test("EDGE exact frame sample limits and invalid numeric kinds",()=>{
  for(const length of [16,120])assert.deepEqual(frameEstimate(Array(length).fill(10)),{interval:10,rate:100});
  for(const length of [0,15,121])assert.equal(frameEstimate(Array(length).fill(10)),null);
  for(const value of [NaN,Infinity,0,-1,"16",null,undefined])assert.equal(frameEstimate([value,...Array(29).fill(16)]),null);
  for(const value of [NaN,Infinity,-1,1,"0",null])assert.throws(()=>temporalRound(0,()=>value));
});
test("EDGE reaction acceptance and quarantine endpoints do not mutate or double settle",()=>{
  for(const elapsed of [100,3000]){
    const go=reactionSignal({phase:"waiting"},1000),copy=structuredClone(go);
    const pending=reactionInput(go,1000+elapsed);
    assert.equal(pending.phase,"settling");assert.deepEqual(go,copy);
    assert.equal(settleReaction(pending,1000+elapsed+249.99),pending);
    const done=settleReaction(pending,1000+elapsed+250);
    assert.deepEqual(done,{phase:"result",elapsed});
    assert.equal(reactionInput(done,5000),done);
    assert.equal(settleReaction(done,5000),done);
  }
  assert.equal(reactionInput({phase:"go",signalAt:1000},1099.99).reason,"anticipation");
  assert.equal(reactionInput({phase:"go",signalAt:1000},4000.01).reason,"timeout");
});
test("EDGE all seeded memory rounds remain unique and terminal input is inert",()=>{
  for(const seed of [0,4294967295])for(let round=0;round<8;round++){
    const a=makeMemoryRound(round,seededRandom(seed));
    assert.deepEqual(a,makeMemoryRound(round,seededRandom(seed)));
    assert.equal(new Set(a.sequence).size,a.sequence.length);
    let state={...a,phase:"recall"};
    for(const cell of a.sequence)state=memoryInput(state,cell);
    assert.equal(state.phase,"hit");assert.equal(memoryInput(state,15),state);
  }
});
test("EDGE shared readback failure and repeat clear preserve peer",()=>{
  const data=new Map(),s={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const peer={completed:1,total:3,updatedAt:"2026-10-13T00:00:00.000Z"};
  s.setItem(PROGRESS_KEY,JSON.stringify({version:1,apps:{"traffic-lab":peer}}));
  assert.equal(writeProgress(()=>s,{...peer,total:6}),true);
  s.setItem=()=>{};
  assert.equal(writeProgress(()=>s,{...peer,total:6,completed:2}),false);
  assert.equal(writeProgress(()=>s,null),false);
  assert.deepEqual(JSON.parse(s.getItem(PROGRESS_KEY)).apps["traffic-lab"],peer);
});

test("EDGE TEST_DOUBLE canceled audio resume cannot create a late voice or phase",async()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document;
  try{
    for(const kind of ["pitch","hearing"]){
      let resume,voices=0;const phases=[];
      class Audio{
        sampleRate=48000;
        resume(){return new Promise(resolve=>{resume=resolve;});}
        createOscillator(){voices++;throw Error("late voice must not be created");}
      }
      globalThis.window={AudioContext:Audio};globalThis.document={hidden:false};
      const module=await import(kind==="pitch"?"../dist/src/pitch-audio.js?edge-resume":"../dist/src/hearing.js?edge-resume");
      const pending=kind==="pitch"?module.playPitchPair(440,445,0,p=>phases.push(p)):module.playPair(10000,"a",0,p=>phases.push(p));
      const rejected=assert.rejects(pending,{name:"AbortError"});
      (module.stopPitchPair||module.stopPair)();resume();await rejected;
      assert.equal(voices,0);assert.deepEqual(phases,[]);
    }
  }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});

test("EDGE TEST_DOUBLE hidden page after audio resume never begins a pair",async()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document;let voices=0;
  try{
    globalThis.window={AudioContext:class{sampleRate=48000;async resume(){}createOscillator(){voices++;}}};
    globalThis.document={hidden:true};
    const {playPitchPair}=await import("../dist/src/pitch-audio.js?edge-hidden");
    await assert.rejects(playPitchPair(180,1100,0,()=>{}),{name:"AbortError"});assert.equal(voices,0);
  }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
