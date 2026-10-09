import test from 'node:test';
import assert from 'node:assert/strict';
import { makePitchRound,pitchStep,PITCH_CENTS } from '../dist/src/pitch-model.js';
import { seededRandom } from '../dist/src/challenges.js';
import { playPitchPair } from '../dist/src/pitch-audio.js';
test('pitch uses new bases and balanced directions with exact cents and bounded frequencies',()=>{let higher=0;const bases=new Set();for(let seed=0;seed<500;seed++)for(let level=0;level<PITCH_CENTS.length;level++){const q=makePitchRound(level,seededRandom(seed));assert(q.a>=180&&q.a<=1100&&q.b>=180&&q.b<=1100);assert.equal(q.higher,q.b>q.a);assert(Math.abs(Math.abs(1200*Math.log2(q.b/q.a))-q.cents)<1e-8);higher+=q.higher;assert.deepEqual(q,makePitchRound(level,seededRandom(seed)));bases.add(q.a.toFixed(2));}assert(higher>2000&&higher<4000);assert(bases.size>400);});
test('pitch staircase adapts but stays bounded and rejects malformed input',()=>{assert.deepEqual(pitchStep({level:3,streak:0},true),{level:3,streak:1});assert.deepEqual(pitchStep({level:3,streak:1},true),{level:5,streak:0});assert.deepEqual(pitchStep({level:0,streak:1},false),{level:0,streak:0});assert.deepEqual(pitchStep({level:11,streak:1},true),{level:11,streak:0});assert.throws(()=>makePitchRound(12));assert.throws(()=>makePitchRound(2,()=>2));});
test('pitch audio rejects invalid frequency and gain before opening audio',async()=>{for(const args of [[0,440,3],[440,18000,3],[440,445,11],[NaN,440,3]])await assert.rejects(()=>playPitchPair(...args,()=>{}),TypeError);});
