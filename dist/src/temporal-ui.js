import { temporalRound, temporalStep, frameEstimate, temporalTiming, TEMPORAL_ROUNDS, TEMPORAL_COOLDOWN } from './temporal-model.js';
import { seededRandom } from './challenges.js';
export function setupTemporal(history) {
  const $ = id => document.getElementById(id);
  let active = false, phase = 'idle', frame = 0, timer = 0, generation = 0, lastStart = -Infinity;
  let index = 0, results = [], staircase = { level: 2, streak: 0 }, random, current, actualMs = null;
  let mode = 'standard';
  const dots = [$('temporal-left-dot'), $('temporal-right-dot')];
  function clearDots() { for (const dot of dots) dot.classList.remove('shown'); }
  function availability() {
    clearTimeout(timer);
    const remaining = Math.max(0, TEMPORAL_COOLDOWN - (performance.now() - lastStart));
    $('temporal-play').disabled = !active || !$('temporal-consent').checked || phase !== 'idle' || remaining > 0;
    $('temporal-stop').disabled = !['calibrating', 'showing'].includes(phase);
    for (const id of ['temporal-left', 'temporal-right']) $(id).disabled = !active || phase !== 'answer';
    if (active && phase === 'idle' && remaining > 0) timer = setTimeout(availability, remaining + 20);
  }
  function render() {
    phase = 'idle'; current = null; actualMs = null; clearDots();
    $('temporal-round').textContent = `ROUND ${String(index + 1).padStart(2, '0')} / ${TEMPORAL_ROUNDS}`;
    $('temporal-next').disabled = true; $('temporal-next').textContent = index === TEMPORAL_ROUNDS - 1 ? '결과 보기' : '다음 순서';
    $('temporal-feedback').textContent = '두 점을 보고 먼저 나타난 쪽을 고르세요.';
    $('temporal-stage-label').textContent = '가운데 +를 보고 기다리세요'; $('temporal-result').hidden = true;
    $('temporal-history').replaceChildren(...Array.from({ length: TEMPORAL_ROUNDS }, (_, i) => {
      const li = document.createElement('li'); li.textContent = String(i + 1).padStart(2, '0');
      li.className = results[i] ? results[i].correct ? 'hit' : 'miss' : ''; return li;
    })); availability();
  }
  function cancel() {
    const interrupted = ['calibrating', 'showing', 'answer'].includes(phase);
    generation++; cancelAnimationFrame(frame); clearTimeout(timer); clearDots();
    if (interrupted) { phase = 'idle'; current = null; actualMs = null; $('temporal-stage-label').textContent = '중단'; $('temporal-feedback').textContent = '이번 순서는 채점하지 않았습니다. 새 순서로 다시 시작하세요.'; }
    availability();
  }
  function reset() {
    cancel(); random = seededRandom(crypto.getRandomValues(new Uint32Array(1))[0]); index = 0; results = [];
    mode = $('temporal-mode').value === 'challenge' ? 'challenge' : 'standard';
    staircase = { level: mode === 'challenge' ? 5 : 2, streak: 0 }; $('temporal-mode').disabled = false; history.reset('temporal');
    $('temporal-score').textContent = '0'; $('session-temporal').textContent = '—'; render();
  }
  function play() {
    if (!active || phase !== 'idle' || !$('temporal-consent').checked || performance.now() - lastStart < TEMPORAL_COOLDOWN) return;
    lastStart = performance.now(); current = temporalRound(staircase.level, random);
    $('temporal-mode').disabled = true;
    const token = ++generation, intervals = [], pulseGaps = [];
    let previous = null, tick = 0, calibrated = null, firstAt = null, secondAt = null;
    phase = 'calibrating'; availability(); $('temporal-feedback').textContent = '화면 갱신 간격을 확인한 뒤 두 점을 보여줍니다.'; $('temporal-stage-label').textContent = '가운데 +를 보세요';
    function advance(at) {
      if (token !== generation || !active || document.hidden) return;
      const gap = previous === null ? null : at - previous; previous = at;
      if (phase === 'calibrating') {
        if (gap !== null) intervals.push(gap);
        if (intervals.length < 30) { frame = requestAnimationFrame(advance); return; }
        calibrated = frameEstimate(intervals);
        if (!calibrated) { cancel(); $('temporal-feedback').textContent = '화면 갱신이 불안정합니다. 다른 작업을 줄이고 다시 시도하세요.'; return; }
        $('temporal-frame').textContent = `약 ${calibrated.rate}회/초 · ${calibrated.interval.toFixed(1)} ms/프레임`; phase = 'showing'; tick = 0;
      } else {
        tick++; if (tick >= current.wait && gap !== null) pulseGaps.push(gap);
        const firstIndex = current.first === 'left' ? 0 : 1;
        if (tick === current.wait) { firstAt = at; dots[firstIndex].classList.add('shown'); }
        if (tick === current.wait + current.frames) { secondAt = at; dots[1 - firstIndex].classList.add('shown'); }
        if (tick === current.wait + current.frames + 10) {
          clearDots(); actualMs = temporalTiming(firstAt, secondAt, calibrated.interval, current.frames, pulseGaps);
          if (actualMs === null) { cancel(); $('temporal-feedback').textContent = '화면 지연이 생겨 이번 순서를 제외했습니다. 다시 시도하세요.'; return; }
          phase = 'answer'; $('temporal-stage-label').textContent = '어느 쪽이 먼저였나요?'; $('temporal-feedback').textContent = '왼쪽 또는 오른쪽을 선택하세요.'; availability(); $('temporal-left').focus({ preventScroll: true }); return;
        }
      }
      frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
  }
  function answer(side) {
    if (!active || phase !== 'answer' || !current || actualMs === null) return;
    phase = 'answered'; const correct = side === current.first; results.push({ correct, ms: actualMs, frames: current.frames }); staircase = temporalStep(staircase, correct);
    $('temporal-score').textContent = results.filter(r => r.correct).length;
    $('temporal-feedback').textContent = `${correct ? '정답' : '오답'} · ${current.first === 'left' ? '왼쪽' : '오른쪽'}이 먼저 · 표시 시점 차이 ${actualMs.toFixed(1)} ms (${current.frames}프레임)`;
    $('temporal-history').children[index].className = correct ? 'hit' : 'miss'; $('temporal-next').disabled = false; availability(); $('temporal-next').focus({ preventScroll: true });
  }
  $('temporal-play').addEventListener('click', play); $('temporal-stop').addEventListener('click', cancel);
  $('temporal-consent').addEventListener('change', () => { if (!$('temporal-consent').checked) cancel(); availability(); });
  $('temporal-left').addEventListener('click', () => answer('left')); $('temporal-right').addEventListener('click', () => answer('right'));
  $('temporal-next').addEventListener('click', () => {
    if (phase !== 'answered') return;
    if (index < TEMPORAL_ROUNDS - 1) { index++; render(); $('temporal-play').focus({ preventScroll: true }); return; }
    phase = 'complete'; $('temporal-next').disabled = true;
    const hits = results.filter(r => r.correct), minimum = Math.min(...hits.map(r => r.ms));
    const levels = [...new Set(results.map(r => r.frames))].sort((a,b) => b-a).map(frames => {
      const trials = results.filter(r => r.frames === frames);
      return `${frames}프레임 ${trials.filter(r => r.correct).length}/${trials.length}`;
    }).join(' · ');
    $('temporal-result').hidden = false; $('temporal-result').textContent = `${hits.length}/12 정답 · 최소 정답 간격 ${hits.length ? minimum.toFixed(1) + ' ms' : '—'}. 간격별 정답: ${levels}. 이 값은 클릭 속도가 아니라 두 점 사이의 표시 간격입니다.`;
    history.offer('temporal', results, { mode });
    $('session-temporal').textContent = `${hits.length}/12`; availability();
  });
  $('temporal-restart').addEventListener('click', reset);
  $('temporal-mode').addEventListener('change', reset);
  document.addEventListener('keydown', event => { if (active && event.key === 'Escape') cancel(); });
  reset(); return { select(name) { if (name !== 'temporal') { active = false; cancel(); } else { active = true; availability(); } }, cancel };
}
