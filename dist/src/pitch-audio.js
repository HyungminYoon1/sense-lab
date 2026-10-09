let context,generation=0,timer=0,rejectWait;
const voices=new Set();
const cancelled=()=>new DOMException('Playback cancelled','AbortError');
export function stopPitchPair(){
  generation++;clearTimeout(timer);const reject=rejectWait;rejectWait=undefined;reject?.(cancelled());
  for(const {oscillator,gain} of voices){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(0,context.currentTime,.008);try{oscillator.stop(context.currentTime+.04);}catch{}}
  voices.clear();
}
function wait(ms,token){return new Promise((resolve,reject)=>{if(token!==generation){reject(cancelled());return;}rejectWait=reject;timer=setTimeout(()=>{rejectWait=undefined;resolve();},ms);});}
function tone(frequency,volume){const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime,entry={oscillator,gain};oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume/500,now+.035);gain.gain.setValueAtTime(volume/500,now+.42);gain.gain.linearRampToValueAtTime(0,now+.5);oscillator.connect(gain);gain.connect(context.destination);voices.add(entry);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(entry);};oscillator.start(now);oscillator.stop(now+.54);}
export async function playPitchPair(a,b,volume,onPhase){
  if(![a,b].every(f=>Number.isFinite(f)&&f>=180&&f<=1100)||!Number.isFinite(volume)||volume<0||volume>10||typeof onPhase!=='function')throw new TypeError('Invalid pitch configuration');
  stopPitchPair();const token=generation,Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');context??=new Audio();await context.resume();if(token!==generation||document.hidden)throw cancelled();
  for(const [phase,frequency] of [['a',a],['b',b]]){if(token!==generation||document.hidden)throw cancelled();onPhase(phase);tone(frequency,volume);await wait(650,token);if(phase==='a'){onPhase('gap');await wait(400,token);}}
  onPhase('done');
}
