import { surroundLightness } from "./model.js";
import { selectExperiment, stopSound } from "./experiments.js";
import {
  makeColorRound,
  COLOR_ROUNDS,
  colorStep,
  seededRandom,
  reactionInput,
  reactionSignal,
  settleReaction,
  reactionSummary,
  REACTION_RULES,
  makeMemoryRound,
  memoryInput,
  MEMORY_LENGTHS,
  HEARING_FREQUENCIES,
  hearingPlan,
  memoryProfile,
  reactionPlan,
} from "./challenges.js";
import { playPair, stopPair } from "./hearing.js";
import { setupPitch } from "./pitch-ui.js";
import { setupTemporal } from "./temporal-ui.js";
import { setupHistory } from "./history-view.js";
const $ = (id) => document.getElementById(id);
const savedHistory = setupHistory();
const pitch = setupPitch(() => { stopSound(); abortHearing(); }, savedHistory);
const temporal = setupTemporal(savedHistory);
const attemptRandom = () => seededRandom(crypto.getRandomValues(new Uint32Array(1))[0]);
let active = "color",
  reveal = false;
function renderIllusion() {
  const difference = Number($("surround-range").value),
    color = $("sample-color").value;
  document
    .querySelectorAll(".sample")
    .forEach((el) => (el.style.backgroundColor = color));
  const [a, b] = surroundLightness(difference, reveal);
  $("surround-a").style.backgroundColor = `hsl(221 18% ${a}%)`;
  $("surround-b").style.backgroundColor = `hsl(221 18% ${b}%)`;
  $("surround-output").value = difference + "%";
  $("sample-output").value = color.toUpperCase();
  $("color-answer").textContent = reveal
    ? `A = B · ${color.toUpperCase()} · 같은 색입니다.`
    : "두 중앙색은 같은 색입니다. 배경이 인상을 바꿉니다.";
  $("reveal-color").textContent = reveal
    ? "배경 다시 보여주기"
    : "배경을 지워 비교하기";
  $("reveal-color").setAttribute("aria-pressed", String(reveal));
}
for (const id of ["surround-range", "sample-color"])
  $(id).addEventListener("input", renderIllusion);
$("reveal-color").addEventListener("click", () => {
  reveal = !reveal;
  renderIllusion();
});
$("reset-color").addEventListener("click", () => {
  reveal = false;
  $("surround-range").value = "70";
  $("sample-color").value = "#8a90ff";
  renderIllusion();
});
let colorRound = 0,
  colorMode = "standard",
  colorStaircase = { level: 3, streak: 0 },
  colorRandom = attemptRandom(),
  colorBoard,
  colorAnswered = false,
  colorFinalized = false,
  colorResults = [];
function renderColorRound() {
  colorBoard = makeColorRound(colorStaircase.level, colorRandom);
  colorAnswered = false;
  $("color-grid").style.setProperty("--columns", colorBoard.columns);
  $("color-grid").replaceChildren(
    ...colorBoard.colors.map((color, index) => {
      const button = document.createElement("button");
      button.className = "color-tile";
      button.style.setProperty("--tile", color);
      button.setAttribute("aria-label", `${Math.floor(index / colorBoard.columns) + 1}행 ${index % colorBoard.columns + 1}열, 칸 ${index + 1}`);
      button.addEventListener("click", () => answerColor(index));
      return button;
    }),
  );
  $("color-round").textContent =
    `ROUND ${String(colorRound + 1).padStart(2, "0")} / 12`;
  $("color-difference").textContent = `단계 ${colorBoard.level + 1} · ${colorBoard.columns}×${colorBoard.columns} · ΔL ${colorBoard.delta}%`;
  $("color-feedback").textContent = "색이 다른 한 칸을 선택하세요.";
  $("color-next").disabled = true;
  $("color-next").textContent = colorRound === 11 ? "결과 보기" : "다음 색";
  $("color-result").hidden = true;
  $("color-history").replaceChildren(
    ...Array.from({ length: COLOR_ROUNDS }, (_, i) => {
      const li = document.createElement("li");
      li.textContent = String(i + 1).padStart(2, "0");
      li.className =
        colorResults[i] === undefined ? "" : colorResults[i].correct ? "hit" : "miss";
      li.setAttribute(
        "aria-label",
        `${i + 1}번: ${colorResults[i] === undefined ? "미진행" : colorResults[i].correct ? "정답" : "오답"}`,
      );
      return li;
    }),
  );
}
function answerColor(index) {
  if (colorAnswered) return;
  colorAnswered = true;
  $("color-mode").disabled = true;
  const correct = index === colorBoard.odd;
  colorResults.push({ correct, delta: colorBoard.delta, level: colorBoard.level });
  colorStaircase = colorStep(colorStaircase, correct);
  [...$("color-grid").children].forEach((button, i) => {
    button.disabled = true;
    if (i === colorBoard.odd) {
      button.classList.add("correct");
      const mark = document.createElement("span");
      mark.textContent = "✓";
      button.append(mark);
    }
    if (i === index && !correct) {
      button.classList.add("chosen-wrong");
      const mark = document.createElement("span");
      mark.textContent = "×";
      button.append(mark);
    }
  });
  $("color-feedback").textContent = correct
    ? `정답 · ΔL ${colorBoard.delta}%. 다음 단계 ${colorStaircase.level + 1}.`
    : `정답은 ${colorBoard.odd + 1}번 칸 · ΔL ${colorBoard.delta}%. 다음은 한 단계 쉽게 갑니다.`;
  $("color-score").textContent = colorResults.filter((r) => r.correct).length;
  const li = $("color-history").children[colorRound];
  li.className = correct ? "hit" : "miss";
  li.setAttribute(
    "aria-label",
    `${colorRound + 1}번: ${correct ? "정답" : "오답"}`,
  );
  $("color-next").disabled = false;
  $("color-next").focus({ preventScroll: true });
}
$("color-next").addEventListener("click", () => {
  if (!colorAnswered || colorFinalized) return;
  if (colorRound < 11) {
    colorRound++;
    renderColorRound();
    $("color-grid").firstElementChild.focus({ preventScroll: true });
    return;
  }
  const hits = colorResults.filter((r) => r.correct), count = hits.length,
    deltas = hits.map((r) => r.delta);
  colorFinalized = true;
  savedHistory.offer("color", colorResults, { mode: colorMode });
  $("color-result").hidden = false;
  $("color-result").textContent =
    `${count}/12 정답 · 최소 정답 ΔL ${deltas.length ? `${Math.min(...deltas)}%` : "—"}`;
  $("color-feedback").textContent =
    "12라운드 완료";
  $("color-next").disabled = true;
  $("session-color").textContent = `${count}/12`;
  $("color-restart").focus({ preventScroll: true });
});
function resetColor() {
  colorRound = 0;
  colorResults = [];
  colorFinalized = false;
  colorMode = $("color-mode").value === "challenge" ? "challenge" : "standard";
  colorStaircase = { level: colorMode === "challenge" ? 7 : 3, streak: 0 };
  $("color-mode").disabled = false;
  savedHistory.reset("color");
  colorRandom = attemptRandom();
  $("session-color").textContent = "—";
  $("color-score").textContent = "0";
  renderColorRound();
  $("color-grid").firstElementChild.focus({ preventScroll: true });
}
$("color-restart").addEventListener("click", resetColor);
$("color-mode").addEventListener("change", resetColor);
let reaction = { phase: "ready" },
  reactionMode = "standard",
  distractionTimer = 0,
  reactionTimer = 0,
  reactionFrame = 0,
  reactionTimes = [],
  early = 0,
  excluded = 0,
  attempts = 0,
  reactionAttempts = [],
  reactionSaved = false,
  reactionRandom = attemptRandom();
const heldPointers = new Set(), heldKeys = new Set();
const liveReaction = () => ["waiting", "go", "settling"].includes(reaction.phase);
const invalidReasons = {
  held: "키나 포인터를 놓은 뒤 한 번만 반응하세요.",
  spam: "응답 뒤 250 ms 안에 추가 입력이 있어 연타로 제외했습니다.",
  anticipation: "100 ms 미만 응답은 이 게임에서 예측 입력으로 제외합니다.",
  timeout: "신호 뒤 3초가 지나 이번 시도를 제외했습니다.",
  outside: "테스트 영역 밖의 입력 또는 추가 포인터 입력이 있어 제외했습니다.",
};
function clearReactionClock() {
  clearTimeout(reactionTimer);
  clearTimeout(distractionTimer);
  cancelAnimationFrame(reactionFrame);
  reactionTimer = 0;
  reactionFrame = 0;
}
function renderReaction() {
  const summary = reactionSummary(reactionTimes);
  const states = {
    ready: ["+", "시작하기", "초록색과 ‘지금!’ 신호가 나타나면 클릭하세요."],
    waiting: reaction.distractor ? ["◇", "아직!", "방해 신호입니다. 초록색 ‘지금!’까지 기다리세요."] : ["…", "기다리세요", "신호 전에 누르면 실패입니다."],
    go: ["!", "지금!", "클릭 · 터치 · SPACE · ENTER"],
    "false-start": [
      "×",
      "너무 빨랐어요",
      "신호 전 입력입니다. 다음 시도에서 다시 기다려보세요.",
    ],
    result: ["✓", `${reaction.elapsed} ms`, "다음 시도 버튼으로 계속하세요."],
    settling: ["…", "입력 확인 중", "250 ms 동안 추가 입력 없이 기다려주세요."],
    invalid: ["×", "기록 제외", invalidReasons[reaction.reason]],
    complete: [
      "✓",
      `${Math.round(summary.median)} ms`,
      "5회 기록의 중앙값입니다.",
    ],
    exhausted: ["Ⅱ", "이번 세션 종료", "15회 안에 정상 기록 5회를 모으지 못했습니다. 초기화 후 다시 도전하세요."],
    cancelled: [
      "Ⅱ",
      "시도 중단",
      "화면을 벗어나 진행 중인 시도를 취소했습니다.",
    ],
  };
  const [symbol, message, instruction] = states[reaction.phase];
  $("reaction-zone").dataset.phase = reaction.phase;
  $("reaction-symbol").textContent = symbol;
  $("reaction-message").textContent = message;
  $("reaction-instruction").textContent = instruction;
  $("reaction-next").hidden = !["false-start", "invalid", "result", "cancelled"].includes(
    reaction.phase,
  );
  $("reaction-next").textContent =
    reaction.phase === "result" ? "다음 시도" : "다시 시도";
  $("reaction-score").textContent = reactionTimes.length
    ? Math.round(summary.median)
    : "—";
  $("reaction-caption").textContent =
    `기록 ${reactionTimes.length} / 5 · 시도 ${attempts} / 15 · 조기 입력 ${early}회 · 기타 제외 ${excluded}회`;
  $("reaction-status").textContent = message + " · " + instruction;
  $("reaction-history").replaceChildren(
    ...reactionTimes.map((value) =>
      Object.assign(document.createElement("li"), {
        textContent: `${value} ms`,
      }),
    ),
  );
  if (["complete", "exhausted"].includes(reaction.phase)) {
    $("reaction-result").textContent =
      summary.count ? `${summary.count}/5회 · 중앙값 ${Math.round(summary.median)} ms · 중앙값에서의 편차(MAD) ${Math.round(summary.mad)} ms · 범위 ${summary.best}–${summary.worst} ms · 조기 입력 ${early}회 · 기타 제외 ${excluded}회${summary.count < 5 ? " · 5회 미달" : ""}` : "정상 기록 0/5회";
    $("session-reaction").textContent =
      summary.count === 5 ? `${Math.round(summary.median)} ms` : "미완료";
  }
}
function finishReaction() {
  clearReactionClock();
  if (reaction.phase === "result") reactionAttempts.push({ outcome: "valid", elapsed: reaction.elapsed });
  else if (reaction.phase === "false-start") reactionAttempts.push({ outcome: "early" });
  else if (reaction.phase === "invalid") reactionAttempts.push({ outcome: "excluded" });
  else if (reaction.phase === "cancelled") reactionAttempts.push({ outcome: "cancelled" });
  if (reaction.phase === "false-start") early++;
  if (["invalid", "cancelled"].includes(reaction.phase)) excluded++;
  if (reaction.phase === "result") reactionTimes.push(reaction.elapsed);
  if (reactionTimes.length === REACTION_RULES.trials) reaction = { phase: "complete" };
  else if (attempts >= REACTION_RULES.attempts) reaction = { phase: "exhausted" };
  if (["complete", "exhausted"].includes(reaction.phase) && !reactionSaved) {
    reactionSaved = true;
    savedHistory.offer("reaction", reactionAttempts, { mode: reactionMode });
  }
  renderReaction();
}
function startReaction() {
  if (attempts >= REACTION_RULES.attempts || active !== "reaction") return;
  clearReactionClock();
  attempts++;
  reactionMode = $("reaction-mode").value === "challenge" ? "challenge" : "standard";
  $("reaction-mode").disabled = true;
  reaction = { phase: "waiting" };
  renderReaction();
  const plan = reactionPlan(reactionMode, reactionRandom);
  if (plan.cueAt !== null) distractionTimer = setTimeout(() => {
    if (reaction.phase !== "waiting" || active !== "reaction" || document.hidden) return;
    reaction = { phase: "waiting", distractor: true }; renderReaction();
  }, plan.cueAt);
  reactionTimer = setTimeout(
    () => {
      if (
        reaction.phase !== "waiting" ||
        document.hidden ||
        active !== "reaction"
      )
        return;
      reactionFrame = requestAnimationFrame(() => {
        if (
          reaction.phase !== "waiting" ||
          document.hidden ||
          active !== "reaction"
        )
          return;
        reaction = reactionSignal(reaction, performance.now(), heldPointers.size > 0 || heldKeys.size > 0);
        if (reaction.phase === "invalid") {
          finishReaction();
          return;
        }
        renderReaction();
        reactionTimer = setTimeout(() => {
          if (reaction.phase !== "go") return;
          reaction = { phase: "invalid", reason: "timeout" };
          finishReaction();
        }, REACTION_RULES.maximum + 1);
      });
    },
    plan.delay,
  );
}
function reactionPress(event) {
  if (active !== "reaction") return;
  if (reaction.phase === "ready") {
    if (event?.repeat) return;
    startReaction();
    return;
  }
  if (!liveReaction()) return;
  const now = performance.now();
  // Modern event timestamps share performance.timeOrigin. Fall back for epoch timestamps.
  const inputAt = Number.isFinite(event?.timeStamp) && event.timeStamp > 0 && event.timeStamp <= now
    ? event.timeStamp : now;
  reaction = reactionInput(reaction, inputAt, { repeat: Boolean(event?.repeat) });
  clearReactionClock();
  if (reaction.phase === "settling") {
    renderReaction();
    // Measure quarantine from handler time too: a queued old event cannot skip it.
    reactionTimer = setTimeout(() => {
      if (reaction.phase !== "settling") return;
      reaction = settleReaction(reaction, performance.now());
      finishReaction();
    }, REACTION_RULES.settle + 1);
  } else {
    finishReaction();
  }
}
$("reaction-zone").addEventListener("pointerdown", (e) => {
  if (e.isPrimary && e.button === 0) {
    e.preventDefault();
    $("reaction-zone").focus({ preventScroll: true });
    reactionPress(e);
  }
});
$("reaction-zone").addEventListener("keydown", (e) => {
  if ([" ", "Enter"].includes(e.key)) {
    e.preventDefault();
    reactionPress(e);
  }
});
$("reaction-zone").addEventListener("click", (e) => {
  if (e.detail === 0) reactionPress(e);
});
function outsideReactionPress(event) {
  if (reaction.phase === "waiting") reactionPress(event);
  else if (liveReaction()) {
    reaction = { phase: "invalid", reason: reaction.phase === "settling" ? "spam" : "outside" };
    finishReaction();
  }
}
document.addEventListener(
  "pointerdown",
  (e) => {
    heldPointers.add(e.pointerId);
    if (
      liveReaction() &&
      (!$("reaction-zone").contains(e.target) || !e.isPrimary || e.button !== 0)
    )
      outsideReactionPress(e);
  },
  true,
);
for (const name of ["pointerup", "pointercancel"])
  document.addEventListener(name, (e) => heldPointers.delete(e.pointerId), true);
document.addEventListener("keydown", (e) => {
  if (![" ", "Enter"].includes(e.key)) return;
  heldKeys.add(e.key);
  if (liveReaction() && !$("reaction-zone").contains(e.target)) outsideReactionPress(e);
}, true);
document.addEventListener("keyup", (e) => heldKeys.delete(e.key), true);
document.addEventListener("click", (e) => {
  if (e.detail === 0 && liveReaction() && !$("reaction-zone").contains(e.target)) outsideReactionPress(e);
}, true);
$("reaction-next").addEventListener("click", () => {
  if (["false-start", "invalid", "result", "cancelled"].includes(reaction.phase)) {
    reaction = { phase: "ready" };
    renderReaction();
    $("reaction-zone").focus({ preventScroll: true });
  }
});
$("reaction-restart").addEventListener("click", () => {
  clearReactionClock();
  reaction = { phase: "ready" };
  reactionTimes = [];
  early = 0;
  excluded = 0;
  attempts = 0;
  reactionAttempts = [];
  reactionSaved = false;
  reactionRandom = attemptRandom();
  $("reaction-mode").disabled = false;
  savedHistory.reset("reaction");
  $("session-reaction").textContent = "—";
  $("reaction-result").textContent =
    "신호 전 입력·유지·연타·100 ms 미만·3초 초과 응답은 제외합니다. 정상 기록 5회, 최대 15시도.";
  renderReaction();
});
function cancelReaction() {
  clearReactionClock();
  heldPointers.clear();
  heldKeys.clear();
  if (liveReaction()) {
    reaction = { phase: "cancelled" };
    finishReaction();
  }
}
let memoryRound = 0,
  memoryMode = $("memory-mode").value || "spatial",
  memory = { phase: "ready", sequence: [], cursor: 0 },
  memoryResults = [],
  memoryRecords = [],
  memoryRandom = attemptRandom(),
  memoryTimers = [],
  memoryGeneration = 0;
function clearMemoryClock() {
  memoryGeneration++;
  memoryTimers.forEach(clearTimeout);
  memoryTimers = [];
}
function renderMemory() {
  const profile = memoryProfile(memoryMode), columns = profile.columns;
  $("memory-round").textContent = `ROUND ${memoryRound + 1} / 8 · ${profile.lengths[memoryRound]}칸`;
  $("memory-condition").textContent = `${columns}×${columns} · ${profile.reverse ? "거꾸로 입력" : "본 순서대로"}`;
  $("memory-score").textContent = memoryResults.filter(Boolean).length;
  $("memory-progress").textContent = `${memoryResults.length} / 8 완료 · ${profile.label} · ${$("memory-pace").value} ms/칸`;
  $("memory-grid").style.setProperty("--memory-columns", columns);
  $("memory-grid").setAttribute("aria-label", `${columns}행 ${columns}열 위치 순서 게임`);
  $("memory-grid").replaceChildren(...Array.from({ length: columns ** 2 }, (_, cell) => {
    const button = document.createElement("button");
    button.className = "memory-tile";
    button.textContent = "";
    button.setAttribute("aria-label", `${Math.floor(cell / columns) + 1}행 ${cell % columns + 1}열`);
    button.disabled = memory.phase !== "recall";
    button.addEventListener("click", () => answerMemory(cell));
    return button;
  }));
  $("memory-start").disabled = !["ready", "cancelled", "hit", "miss"].includes(memory.phase);
  $("memory-start").textContent = ["hit", "miss"].includes(memory.phase) ? "다음 순서 보기" : "순서 보기";
  $("memory-stop").disabled = !["showing", "recall"].includes(memory.phase);
  $("memory-pace").disabled = memoryMode !== "classic" || memory.phase !== "ready" || memoryResults.length > 0;
  $("memory-mode").disabled = memory.phase !== "ready" || memoryResults.length > 0;
}
function startMemory() {
  if (active !== "memory" || !["ready", "cancelled", "hit", "miss"].includes(memory.phase)) return;
  if (["hit", "miss"].includes(memory.phase)) memoryRound++;
  clearMemoryClock();
  memory = makeMemoryRound(memoryRound, memoryRandom, memoryMode);
  renderMemory();
  $("memory-grid").scrollIntoView?.({ block: "center", behavior: "auto" });
  $("memory-result").hidden = true;
  const token = memoryGeneration, duration = Number($("memory-pace").value), gap = 350;
  // A brief orientation gap comes before each sequence; no automatic next round.
  $("memory-status").textContent = "위치를 차례로 보여줍니다. 입력은 순서가 끝난 뒤 시작합니다.";
  memory.sequence.forEach((cell, i) => {
    memoryTimers.push(setTimeout(() => {
      if (token !== memoryGeneration) return;
      const tile = $("memory-grid").children[cell];
      tile.classList.add("lit");
      $("memory-status").textContent = `${i + 1} / ${memory.sequence.length}번째 위치를 기억하세요.`;
      memoryTimers.push(setTimeout(() => tile.classList.remove("lit"), duration));
    }, 500 + i * (duration + gap)));
  });
  memoryTimers.push(setTimeout(() => {
    if (token !== memoryGeneration || document.hidden || active !== "memory") return;
    memory = { ...memory, phase: "recall" };
    renderMemory();
    $("memory-status").textContent = `${memory.sequence.length}개 위치를 ${memory.reverse ? "마지막부터 거꾸로" : "본 순서대로"} 누르세요. 응답 시간 제한은 없습니다.`;
    $("memory-grid").firstElementChild.focus({ preventScroll: true });
  }, 500 + memory.sequence.length * (duration + gap)));
}
function answerMemory(cell) {
  if (memory.phase !== "recall") return;
  const previous = memory.cursor;
  memory = memoryInput(memory, cell);
  $("memory-grid").children[cell].textContent = `${previous + 1}`;
  if (memory.phase === "recall") {
    $("memory-status").textContent = `${memory.cursor}개 입력 · 다음 ${memory.cursor + 1}번째 위치를 누르세요.`;
    return;
  }
  memoryResults.push(memory.phase === "hit");
  memoryRecords.push({ correct: memory.phase === "hit", length: memory.sequence.length });
  clearMemoryClock();
  renderMemory();
  const answerSequence = memory.reverse ? [...memory.sequence].reverse() : memory.sequence;
  answerSequence.forEach((position, i) => {
    const tile = $("memory-grid").children[position];
    tile.classList.add("revealed");
    tile.textContent = `${i + 1}`;
  });
  $("memory-status").textContent = `${memory.phase === "hit" ? "순서 일치!" : `${previous + 1}번째 위치가 달랐습니다.`} 격자의 번호가 정답 입력 순서입니다.`;
  if (memoryResults.length === MEMORY_LENGTHS.length) {
    memory = { ...memory, phase: "complete" };
    $("memory-start").disabled = true;
    $("memory-result").hidden = false;
    $("memory-result").textContent = `${memoryResults.filter(Boolean).length}/8 순서 일치 · 최대 ${Math.max(0, ...memoryProfile(memoryMode).lengths.filter((_, i) => memoryResults[i]))}칸 · ${memoryProfile(memoryMode).label}`;
    savedHistory.offer("memory", memoryRecords, { mode: memoryMode, pace: Number($("memory-pace").value) });
    $("session-memory").textContent = `${memoryResults.filter(Boolean).length}/8`;
    $("memory-restart").focus({ preventScroll: true });
  } else $("memory-start").focus({ preventScroll: true });
}
function cancelMemory() {
  clearMemoryClock();
  if (!["showing", "recall"].includes(memory.phase)) return;
  memory = { phase: "cancelled", sequence: [], cursor: 0 };
  renderMemory();
  $("memory-status").textContent = "순서 중단 · 새 순서로 다시 시작할 수 있습니다.";
}
$("memory-start").addEventListener("click", startMemory);
$("memory-stop").addEventListener("click", cancelMemory);
$("memory-pace").addEventListener("change", () => {
  if (memoryMode === "classic" && !["850", "1500"].includes($("memory-pace").value)) $("memory-pace").value = "850";
  renderMemory();
});
function resetMemory() {
  clearMemoryClock();
  memoryRound = 0;
  memoryResults = [];
  memoryRecords = [];
  memoryRandom = attemptRandom();
  memory = { phase: "ready", sequence: [], cursor: 0 };
  memoryMode = $("memory-mode").value || "spatial";
  $("memory-pace").value = String(memoryProfile(memoryMode).pace);
  savedHistory.reset("memory");
  $("memory-result").hidden = true;
  $("session-memory").textContent = "—";
  $("memory-status").textContent = memoryProfile(memoryMode).reverse ? "순서 보기를 누른 뒤 마지막 위치부터 거꾸로 선택하세요." : "순서 보기를 누른 뒤 위치를 같은 순서로 선택하세요.";
  renderMemory();
  $("memory-start").focus({ preventScroll: true });
}
$("memory-restart").addEventListener("click", resetMemory);
$("memory-mode").addEventListener("change", resetMemory);
let hearingIndex = 0,
  hearingMode = "standard",
  hearingFrequencies = hearingPlan("standard", attemptRandom()),
  hearingRecords = [],
  hearingFinalized = false,
  hearingResults = [],
  hearingTarget = "a",
  hearingReady = false,
  hearingAnswered = false,
  hearingBusy = false,
  hearingGeneration = 0;
function renderHearing() {
  hearingTarget = Math.random() < 0.5 ? "a" : "b";
  hearingReady = false;
  hearingAnswered = false;
  hearingBusy = false;
  $("hearing-round").textContent =
    `ROUND ${String(hearingIndex + 1).padStart(2, "0")} / ${hearingFrequencies.length}`;
  $("hearing-total").textContent = `/ ${hearingFrequencies.length}`;
  $("hearing-frequency").replaceChildren(
    document.createTextNode("??"),
    Object.assign(document.createElement("small"), { textContent: "kHz" }),
  );
  $("hearing-state").textContent = "A 또는 B, 어느 쪽에 소리가 있을까요?";
  $("hearing-play").disabled = false;
  $("hearing-play").textContent = "두 소리 듣기";
  $("hearing-stop").disabled = true;
  document.querySelectorAll("[data-heard]").forEach((b) => (b.disabled = true));
  $("hearing-next").disabled = true;
  $("hearing-next").textContent =
    hearingIndex === hearingFrequencies.length - 1 ? "결과 보기" : "다음 주파수";
  $("hearing-feedback").textContent =
    "한 구간에는 소리가, 다른 구간에는 침묵이 있습니다.";
  $("hearing-result").hidden = true;
  for (const id of ["interval-a", "interval-b"])
    $(id).classList.remove("playing");
  $("hearing-history").replaceChildren(
    ...hearingFrequencies.map((freq, i) => {
      const span = document.createElement("span");
      span.textContent = hearingResults[i] === undefined ? `${i + 1} ·` : `${freq / 1000}k ${hearingResults[i] ? "✓" : "×"}`;
      span.className =
        hearingResults[i] === undefined
          ? ""
          : hearingResults[i]
            ? "hit"
            : "miss";
      return span;
    }),
  );
}
function abortHearing() {
  const wasPlaying = hearingBusy || hearingReady;
  hearingGeneration++;
  stopPair();
  hearingBusy = false;
  $("hearing-stop").disabled = true;
  $("hearing-play").disabled = hearingAnswered;
  for (const id of ["interval-a", "interval-b"])
    $(id).classList.remove("playing");
  if (!hearingAnswered) {
    hearingReady = false;
    document
      .querySelectorAll("[data-heard]")
      .forEach((b) => (b.disabled = true));
    if (wasPlaying)
      $("hearing-state").textContent = "재생 중단 · 다시 들을 수 있습니다.";
  }
}
$("hearing-play").addEventListener("click", async () => {
  if (hearingBusy || hearingAnswered) return;
  stopSound();
  const generation = ++hearingGeneration;
  hearingBusy = true;
  $("hearing-mode").disabled = true;
  hearingReady = false;
  $("hearing-play").disabled = true;
  $("hearing-stop").disabled = false;
  document.querySelectorAll("[data-heard]").forEach((b) => (b.disabled = true));
  try {
    await playPair(
      hearingFrequencies[hearingIndex],
      hearingTarget,
      Number($("hearing-volume").value),
      (phase) => {
        if (generation !== hearingGeneration) return;
        for (const which of ["a", "b"])
          $("interval-" + which).classList.toggle("playing", phase === which);
        $("hearing-state").textContent =
          phase === "gap"
            ? "잠시 뒤 B가 재생됩니다."
            : `구간 ${phase.toUpperCase()} · 듣는 중`;
      },
    );
    if (
      generation !== hearingGeneration ||
      active !== "sound" ||
      document.hidden
    )
      return;
    hearingReady = true;
    $("hearing-state").textContent = "어느 구간에서 들렸나요?";
    $("hearing-play").textContent = "한 번 더 듣기";
    document
      .querySelectorAll("[data-heard]")
      .forEach((b) => (b.disabled = false));
  } catch (error) {
    if (generation === hearingGeneration)
      $("hearing-feedback").textContent =
        error.name === "AbortError"
          ? "재생을 중단했습니다."
          : "소리를 시작할 수 없습니다. 브라우저와 오디오 기기를 확인하세요.";
  } finally {
    if (generation === hearingGeneration) {
      hearingBusy = false;
      $("hearing-play").disabled = false;
      $("hearing-stop").disabled = true;
      for (const id of ["interval-a", "interval-b"])
        $(id).classList.remove("playing");
    }
  }
});
$("hearing-stop").addEventListener("click", abortHearing);
$("hearing-volume").addEventListener("input", () => {
  abortHearing();
  $("hearing-volume-output").value = $("hearing-volume").value;
});
document.querySelectorAll("[data-heard]").forEach((button) =>
  button.addEventListener("click", () => {
    if (!hearingReady || hearingAnswered) return;
    hearingAnswered = true;
    const correct = button.dataset.heard === hearingTarget;
    hearingResults.push(correct);
    hearingRecords.push({ frequency: hearingFrequencies[hearingIndex], correct, heard: button.dataset.heard });
    $("hearing-score").textContent = hearingResults.filter(Boolean).length;
    $("hearing-frequency").replaceChildren(
      document.createTextNode(hearingFrequencies[hearingIndex] / 1000),
      Object.assign(document.createElement("small"), { textContent: "kHz" }),
    );
    $("hearing-state").textContent =
      `소리가 있던 구간: ${hearingTarget.toUpperCase()}`;
    $("hearing-feedback").textContent = correct
      ? "구간 선택 일치"
      : "구간 선택 불일치";
    const cell = $("hearing-history").children[hearingIndex];
    cell.textContent = `${hearingFrequencies[hearingIndex] / 1000}k ${correct ? "✓" : "×"}`;
    cell.className = correct ? "hit" : "miss";
    document
      .querySelectorAll("[data-heard]")
      .forEach((b) => (b.disabled = true));
    $("hearing-play").disabled = true;
    $("hearing-next").disabled = false;
  }),
);
$("hearing-next").addEventListener("click", () => {
  if (!hearingAnswered || hearingFinalized) return;
  if (hearingIndex < hearingFrequencies.length - 1) {
    hearingIndex++;
    renderHearing();
    return;
  }
  const matches = hearingResults.filter(Boolean).length;
  hearingFinalized = true;
  savedHistory.offer("hearing", hearingRecords, { mode: hearingMode });
  $("hearing-result").hidden = false;
  $("hearing-result").textContent =
    `${matches}/${hearingFrequencies.length} 구간 선택 일치` + (hearingMode === "challenge" ? ` · 두 번 모두 일치한 주파수 ${HEARING_FREQUENCIES.filter(f => hearingRecords.filter(r => r.frequency === f && r.correct).length === 2).length}/9종` : "");
  $("hearing-feedback").textContent =
    `${hearingFrequencies.length}라운드 완료 · 이번 기기·음량의 A/B 응답`;
  $("hearing-next").disabled = true;
  $("session-hearing").textContent = `${matches}/${hearingFrequencies.length}`;
});
function resetHearing() {
  abortHearing();
  hearingIndex = 0;
  hearingResults = [];
  hearingRecords = [];
  hearingFinalized = false;
  hearingMode = $("hearing-mode").value === "challenge" ? "challenge" : "standard";
  hearingFrequencies = hearingPlan(hearingMode, attemptRandom());
  $("hearing-mode").disabled = false;
  savedHistory.reset("hearing");
  $("hearing-score").textContent = "0";
  $("session-hearing").textContent = "—";
  renderHearing();
}
$("hearing-restart").addEventListener("click", resetHearing);
$("hearing-mode").addEventListener("change", resetHearing);
function switchTab(name) {
  if (active !== name) {
    cancelReaction();
    cancelMemory();
    abortHearing();
  }
  active = name;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const selected = b.dataset.tab === name;
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  document
    .querySelectorAll("[data-panel]")
    .forEach((p) => (p.hidden = p.dataset.panel !== name));
  document.querySelectorAll("[data-history]").forEach(p => { p.hidden = p.dataset.history !== name; });
  selectExperiment(name);
  pitch.select(name);
  temporal.select(name);
}
document
  .querySelectorAll("[data-tab]")
  .forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
$("sound-toggle").addEventListener("click", abortHearing);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelReaction();
    cancelMemory();
    abortHearing();
    pitch.cancel();
    temporal.cancel();
  }
});
window.addEventListener("blur", () => {
  cancelReaction();
  cancelMemory();
  temporal.cancel();
});
window.addEventListener("pagehide", () => {
  cancelReaction();
  cancelMemory();
  abortHearing();
  pitch.cancel();
  temporal.cancel();
});
renderIllusion();
renderColorRound();
renderReaction();
$("memory-pace").value = String(memoryProfile(memoryMode).pace);
renderMemory();
renderHearing();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "configure_color_experiment",
          title: "색 대비 실험 설정",
          description:
            "보너스 색 대비 실험의 중앙색·배경 밝기·배경 표시를 설정합니다.",
          inputSchema: {
            type: "object",
            properties: {
              color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
              difference: { type: "number", minimum: 0, maximum: 100 },
              reveal: { type: "boolean" },
            },
            required: ["color", "difference", "reveal"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            if (
              !input ||
              Object.keys(input).some(
                (k) => !["color", "difference", "reveal"].includes(k),
              ) ||
              !/^#[0-9a-fA-F]{6}$/.test(input.color) ||
              !Number.isFinite(input.difference) ||
              input.difference < 0 ||
              input.difference > 100 ||
              typeof input.reveal !== "boolean"
            )
              throw new TypeError("Invalid color configuration");
            switchTab("color");
            $("illusion-tools").open = true;
            $("sample-color").value = input.color;
            $("surround-range").value = input.difference;
            reveal = input.reveal;
            renderIllusion();
            return {
              experiment: "color-contrast",
              color: input.color,
              difference: input.difference,
              revealed: reveal,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
