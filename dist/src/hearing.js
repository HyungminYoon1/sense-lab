let context,
  generation = 0,
  delayTimer = 0,
  rejectDelay;
const nodes = new Set();
const cancelled = () => new DOMException("Playback cancelled", "AbortError");
export function stopPair() {
  generation++;
  clearTimeout(delayTimer);
  const reject = rejectDelay;
  rejectDelay = undefined;
  reject?.(cancelled());
  for (const { oscillator, gain } of nodes) {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0, context.currentTime, 0.008);
    try {
      oscillator.stop(context.currentTime + 0.04);
    } catch {}
  }
  nodes.clear();
}
function wait(duration, token) {
  return new Promise((resolve, reject) => {
    if (token !== generation) {
      reject(cancelled());
      return;
    }
    rejectDelay = reject;
    delayTimer = setTimeout(() => {
      rejectDelay = undefined;
      resolve();
    }, duration);
  });
}
function tone(frequency, level) {
  const oscillator = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  const entry = { oscillator, gain };
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level / 500, now + 0.035);
  gain.gain.setValueAtTime(level / 500, now + 0.8);
  gain.gain.linearRampToValueAtTime(0, now + 0.9);
  oscillator.connect(gain);
  gain.connect(context.destination);
  nodes.add(entry);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
    nodes.delete(entry);
  };
  oscillator.start(now);
  oscillator.stop(now + 0.95);
}
export async function playPair(frequency, target, level, onPhase) {
  if (
    !Number.isFinite(frequency) ||
    frequency < 10000 ||
    frequency > 18000 ||
    !["a", "b"].includes(target) ||
    !Number.isFinite(level) ||
    level < 0 ||
    level > 10
  )
    throw new TypeError("Invalid hearing configuration");
  stopPair();
  const token = generation;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error("Audio unavailable");
  context ??= new Audio();
  await context.resume();
  if (token !== generation || document.hidden) throw cancelled();
  if (frequency >= context.sampleRate / 2)
    throw new Error("Sample rate too low");
  for (const interval of ["a", "b"]) {
    if (token !== generation) throw cancelled();
    onPhase(interval);
    if (interval === target) tone(frequency, level);
    await wait(1100, token);
    if (interval === "a") {
      onPhase("gap");
      await wait(600, token);
    }
  }
}
