import { waveSample, makeParticles, moveParticle, clamp } from "./model.js";
const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let active = "color",
  context,
  oscillator,
  gain,
  starting = false,
  audioGeneration = 0;
let width = 0,
  height = 0,
  particles = [],
  target = { x: 0, y: 0 },
  paused = reducedMotion.matches,
  lastTime = 0,
  frame = 0,
  phase = 0;
const soundCanvas = $("sound-canvas"),
  motionCanvas = $("motion-canvas");
const soundDraw = soundCanvas.getContext("2d"),
  motionDraw = motionCanvas.getContext("2d");
function resizeCanvas(canvas) {
  const bounds = canvas.getBoundingClientRect(),
    ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * ratio));
  canvas.height = Math.max(1, Math.round(bounds.height * ratio));
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width: bounds.width, height: bounds.height };
}
function drawSound() {
  const { width: w, height: h } = soundCanvas.getBoundingClientRect();
  if (!w || !h) return;
  soundDraw.clearRect(0, 0, w, h);
  soundDraw.strokeStyle = "#ffffff22";
  soundDraw.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    soundDraw.beginPath();
    soundDraw.moveTo(0, (h * i) / 6);
    soundDraw.lineTo(w, (h * i) / 6);
    soundDraw.stroke();
  }
  for (let i = 1; i < 12; i++) {
    soundDraw.beginPath();
    soundDraw.moveTo((w * i) / 12, 0);
    soundDraw.lineTo((w * i) / 12, h);
    soundDraw.stroke();
  }
  const cycles = Number($("frequency").value) / 90,
    amplitude = (h * 0.34 * Number($("volume").value)) / 20;
  soundDraw.beginPath();
  soundDraw.lineWidth = 3;
  soundDraw.strokeStyle = "#d4ff55";
  for (let x = 0; x <= w; x++) {
    const y =
      h / 2 -
      waveSample($("wave-type").value, (x / w) * cycles * Math.PI * 2 + phase) *
        amplitude;
    if (x === 0) soundDraw.moveTo(x, y);
    else soundDraw.lineTo(x, y);
  }
  soundDraw.stroke();
  soundDraw.fillStyle = "#ffffffbb";
  soundDraw.font = "12px system-ui";
  soundDraw.fillText("합성 파형 · 가로축은 상대적인 시간", 12, h - 14);
}
function updateSound() {
  const frequency = clamp($("frequency").value, 80, 880),
    volume = clamp($("volume").value, 0, 20);
  $("frequency-output").value = frequency + " Hz";
  $("volume-output").value = volume + "%";
  $("wave-caption").textContent =
    $("wave-type").value.toUpperCase() + " WAVE · " + frequency + " Hz";
  if (oscillator) {
    oscillator.type = $("wave-type").value;
    oscillator.frequency.setTargetAtTime(frequency, context.currentTime, 0.025);
    gain.gain.setTargetAtTime(volume / 400, context.currentTime, 0.025);
  }
  if (active === "sound") drawSound();
}
export function stopSound() {
  audioGeneration++;
  if (oscillator) {
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0, context.currentTime, 0.015);
    const oldOscillator = oscillator,
      oldGain = gain;
    oldOscillator.onended = () => {
      oldOscillator.disconnect();
      oldGain.disconnect();
    };
    oldOscillator.stop(context.currentTime + 0.08);
    oscillator = null;
    gain = null;
  }
  $("sound-toggle").textContent = "소리 켜기";
  $("sound-toggle").setAttribute("aria-pressed", "false");
  $("sound-badge").textContent = "소리 꺼짐";
  drawSound();
}
async function toggleSound() {
  if (starting) return;
  if (oscillator) {
    stopSound();
    return;
  }
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) {
    $("audio-message").textContent =
      "이 브라우저는 소리 합성을 지원하지 않습니다. 파형 비교는 가능합니다.";
    return;
  }
  starting = true;
  const generation = ++audioGeneration;
  $("sound-toggle").disabled = true;
  try {
    context ??= new Audio();
    await context.resume();
    if (generation !== audioGeneration || active !== "sound" || document.hidden)
      return;
    oscillator = context.createOscillator();
    gain = context.createGain();
    oscillator.type = $("wave-type").value;
    oscillator.frequency.value = clamp($("frequency").value, 80, 880);
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(
      clamp($("volume").value, 0, 20) / 400,
      context.currentTime,
      0.03,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    $("sound-toggle").textContent = "소리 끄기";
    $("sound-toggle").setAttribute("aria-pressed", "true");
    $("sound-badge").textContent = "소리 켜짐";
    $("audio-message").textContent =
      "기기의 실제 음량을 낮게 유지해주세요. 실험을 벗어나면 소리가 꺼집니다.";
  } catch {
    stopSound();
    $("audio-message").textContent =
      "소리를 시작하지 못했습니다. 기기 설정을 확인한 뒤 다시 시도해주세요.";
  } finally {
    starting = false;
    $("sound-toggle").disabled = false;
  }
}
function resetParticles() {
  ({ width, height } = resizeCanvas(motionCanvas));
  target = { x: width / 2, y: height / 2 };
  particles = makeParticles(Number($("density").value), width, height);
  motionDraw.fillStyle = "#151f35";
  motionDraw.fillRect(0, 0, width, height);
  drawParticles(0);
}
function drawParticles(delta) {
  const trail = Number($("trail").value);
  motionDraw.fillStyle =
    "rgba(21,31,53," + Math.max(0.025, 1 - trail / 100) + ")";
  motionDraw.fillRect(0, 0, width, height);
  for (const particle of particles) {
    if (delta)
      moveParticle(
        particle,
        target,
        $("force-mode").value,
        width,
        height,
        delta,
      );
    motionDraw.beginPath();
    motionDraw.fillStyle = "hsl(" + particle.hue + " 92% 73%)";
    motionDraw.arc(particle.x, particle.y, 1.25, 0, Math.PI * 2);
    motionDraw.fill();
  }
  motionDraw.strokeStyle = "#ffffff50";
  motionDraw.lineWidth = 1;
  motionDraw.beginPath();
  motionDraw.arc(target.x, target.y, 8, 0, Math.PI * 2);
  motionDraw.stroke();
}
function updateMotion() {
  $("density-output").value = $("density").value;
  $("trail-output").value = $("trail").value + "%";
  $("motion-caption").textContent =
    $("force-mode").value.toUpperCase() +
    " · " +
    $("density").value +
    " PARTICLES";
  $("motion-pause").textContent = paused ? "다시 재생" : "일시정지";
  $("motion-pause").setAttribute("aria-pressed", String(paused));
}
function animate(time) {
  frame = 0;
  if (document.hidden || active === "color") return;
  const delta = Math.min((time - (lastTime || time)) / 16.67, 2);
  lastTime = time;
  if (active === "sound") {
    if (!reducedMotion.matches) phase += 0.025 * delta;
    drawSound();
  }
  if (active === "motion" && !paused) drawParticles(delta);
  if (
    (active === "sound" && !reducedMotion.matches) ||
    (active === "motion" && !paused)
  )
    frame = requestAnimationFrame(animate);
}
function startFrame() {
  cancelAnimationFrame(frame);
  lastTime = 0;
  frame = requestAnimationFrame(animate);
}
export function selectExperiment(name) {
  if (active !== name) stopSound();
  active = name;
  if (name === "sound") {
    resizeCanvas(soundCanvas);
    updateSound();
  }
  if (name === "motion") {
    resetParticles();
    updateMotion();
  }
  startFrame();
}
$("sound-toggle").addEventListener("click", toggleSound);
["frequency", "volume", "wave-type"].forEach((id) =>
  $(id).addEventListener("input", updateSound),
);
$("density").addEventListener("input", () => {
  resetParticles();
  updateMotion();
});
["force-mode", "trail"].forEach((id) =>
  $(id).addEventListener("input", () => {
    updateMotion();
    if (paused) drawParticles(0);
  }),
);
$("motion-reset").addEventListener("click", resetParticles);
$("motion-pause").addEventListener("click", () => {
  paused = !paused;
  updateMotion();
  startFrame();
});
function pointer(event) {
  const box = motionCanvas.getBoundingClientRect();
  target = {
    x: clamp(event.clientX - box.left, 0, width),
    y: clamp(event.clientY - box.top, 0, height),
  };
  if (paused) drawParticles(0);
}
motionCanvas.addEventListener("pointermove", pointer);
motionCanvas.addEventListener("pointerdown", (event) => {
  motionCanvas.setPointerCapture(event.pointerId);
  motionCanvas.focus({ preventScroll: true });
  pointer(event);
});
motionCanvas.addEventListener("keydown", (event) => {
  const movement = {
    ArrowLeft: [-20, 0],
    ArrowRight: [20, 0],
    ArrowUp: [0, -20],
    ArrowDown: [0, 20],
  }[event.key];
  if (!movement) return;
  event.preventDefault();
  target = {
    x: clamp(target.x + movement[0], 0, width),
    y: clamp(target.y + movement[1], 0, height),
  };
  if (paused) drawParticles(0);
});
$("motion-save").addEventListener("click", () => {
  motionCanvas.toBlob((blob) => {
    if (!blob) {
      $("export-message").textContent =
        "이미지를 저장하지 못했습니다. 다시 시도해주세요.";
      return;
    }
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "sense-lab-pattern.png";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    $("export-message").textContent =
      "PNG 다운로드를 요청했습니다. 브라우저의 다운로드 목록을 확인해주세요.";
  }, "image/png");
});
new ResizeObserver(() => {
  if (active === "sound") {
    resizeCanvas(soundCanvas);
    drawSound();
  }
  if (active === "motion") resetParticles();
}).observe(document.querySelector("main"));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSound();
    cancelAnimationFrame(frame);
  } else startFrame();
});
window.addEventListener("pagehide", () => {
  stopSound();
  cancelAnimationFrame(frame);
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) paused = true;
  updateMotion();
  startFrame();
});
updateMotion();
updateSound();
