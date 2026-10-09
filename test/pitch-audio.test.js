import test from 'node:test';
import assert from 'node:assert/strict';
import { playPitchPair,stopPitchPair } from '../dist/src/pitch-audio.js';
test('test-double: finite pitch voices ramp gain <=0.02 and user stop aborts pending pair',async()=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document,peaks=[],stops=[];
 const param={setValueAtTime(v){peaks.push(v);},linearRampToValueAtTime(v){peaks.push(v);},setTargetAtTime(v){peaks.push(v);},cancelScheduledValues(){}};
 class Audio {currentTime=0;destination={};async resume(){}createOscillator(){return {frequency:{value:0},connect(){},disconnect(){},start(){},stop(at){stops.push(at);}};}createGain(){return {gain:param,connect(){},disconnect(){}};}}
 try{globalThis.window={AudioContext:Audio};globalThis.document={hidden:false};const playback=playPitchPair(440,443,10,()=>{});await Promise.resolve();stopPitchPair();await assert.rejects(playback,{name:'AbortError'});assert(peaks.length>=4&&peaks.every(v=>v>=0&&v<=.02));assert(stops.includes(.54)&&stops.includes(.04));}finally{globalThis.window=previousWindow;globalThis.document=previousDocument;stopPitchPair();}
});
