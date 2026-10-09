export const PITCH_CENTS=Object.freeze([200,150,100,75,50,35,25,15,10,7,5,3]);
export const PITCH_ROUNDS=12;
export function makePitchRound(level,random=Math.random){
  if(!Number.isInteger(level)||level<0||level>=PITCH_CENTS.length)throw new TypeError('Invalid pitch level');
  const sample=()=>{const v=random();if(!Number.isFinite(v)||v<0||v>=1)throw new TypeError('Invalid random sample');return v;};
  const bases=[220,261.6256,329.6276,440,523.2511,659.2551,880];
  const a=bases[Math.floor(sample()*bases.length)]*2**((sample()*80-40)/1200),higher=sample()<.5,cents=PITCH_CENTS[level];
  return {level,cents,a,b:a*2**((higher?cents:-cents)/1200),higher};
}
export function pitchStep(state,correct){
  if(!Number.isInteger(state.level)||state.level<0||state.level>=PITCH_CENTS.length||![0,1].includes(state.streak)||typeof correct!=='boolean')throw new TypeError('Invalid pitch staircase');
  return !correct?{level:Math.max(0,state.level-1),streak:0}:state.streak?{level:Math.min(PITCH_CENTS.length-1,state.level+2),streak:0}:{level:state.level,streak:1};
}
