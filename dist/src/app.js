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
  reactionDelay,
  reactionSummary,
  REACTION_RULES,
  makeMemoryRound,
  memoryInput,
  MEMORY_LENGTHS,
  HEARING_FREQUENCIES,
} from "./challenges.js";
import { playPair, stopPair } from "./hearing.js";
const $ = (id) => document.getElementById(id);
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
  colorStaircase = { level: 3, streak: 0 },
  colorRandom = attemptRandom(),
  colorBoard,
  colorAnswered = false,
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
    ? `정답! ΔL ${colorBoard.delta}%. ${colorStaircase.streak ? "한 번 더 맞히면 두 단계 올라갑니다." : "다음은 더 작은 차이에 도전합니다."}`
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
  if (!colorAnswered) return;
  if (colorRound < 11) {
    colorRound++;
    renderColorRound();
    $("color-grid").firstElementChild.focus({ preventScroll: true });
    return;
  }
  const hits = colorResults.filter((r) => r.correct), count = hits.length,
    deltas = hits.map((r) => r.delta);
  $("color-result").hidden = false;
  $("color-result").textContent =
    `12개 중 ${count}개 정답. ${deltas.length ? `정답을 고른 가장 작은 설정 차이는 ΔL ${Math.min(...deltas)}%입니다.` : "다른 색으로 다시 도전해보세요."} 경로가 응답에 따라 달라져 정답 수만으로 다른 시도를 비교할 수 없습니다. 한 번의 정답은 색각 한계나 보정된 지각 문턱을 뜻하지 않습니다.`;
  $("color-feedback").textContent =
    "12라운드 완료! 새로운 색으로 다시 도전할 수 있습니다.";
  $("color-next").disabled = true;
  $("session-color").textContent = `${count}/12`;
  $("color-restart").focus({ preventScroll: true });
});
$("color-restart").addEventListener("click", () => {
  colorRound = 0;
  colorResults = [];
  colorStaircase = { level: 3, streak: 0 };
  colorRandom = attemptRandom();
  $("session-color").textContent = "—";
  $("color-score").textContent = "0";
  renderColorRound();
  $("color-grid").firstElementChild.focus({ preventScroll: true });
});
let reaction = { phase: "ready" },
  reactionTimer = 0,
  reactionFrame = 0,
  reactionTimes = [],
  early = 0,
  excluded = 0,
  attempts = 0,
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
  cancelAnimationFrame(reactionFrame);
  reactionTimer = 0;
  reactionFrame = 0;
}
function renderReaction() {
  const summary = reactionSummary(reactionTimes);
  const states = {
    ready: ["+", "시작하기", "초록색과 ‘지금!’ 신호가 나타나면 클릭하세요."],
    waiting: ["…", "기다리세요", "신호 전에 누르면 실패입니다."],
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
      summary.count ? `${summary.count}/5회 · 중앙값 ${Math.round(summary.median)} ms · 중앙값에서의 편차(MAD) ${Math.round(summary.mad)} ms · 범위 ${summary.best}–${summary.worst} ms. 조기 입력 ${early}회 · 기타 제외 ${excluded}회. ${summary.count < 5 ? "5회 미달로 참고 기록만 표시합니다." : "작은 편차는 이번 기록들이 비슷했다는 뜻입니다."}` : "정상 기록이 없습니다. 초기화 후 신호를 기다려주세요.";
    $("session-reaction").textContent =
      summary.count === 5 ? `${Math.round(summary.median)} ms` : "미완료";
  }
}
function finishReaction() {
  clearReactionClock();
  if (reaction.phase === "false-start") early++;
  if (["invalid", "cancelled"].includes(reaction.phase)) excluded++;
  if (reaction.phase === "result") reactionTimes.push(reaction.elapsed);
  if (reactionTimes.length === REACTION_RULES.trials) reaction = { phase: "complete" };
  else if (attempts >= REACTION_RULES.attempts) reaction = { phase: "exhausted" };
  renderReaction();
}
function startReaction() {
  if (attempts >= REACTION_RULES.attempts || active !== "reaction") return;
  clearReactionClock();
  attempts++;
  reaction = { phase: "waiting" };
  renderReaction();
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
    reactionDelay(reactionRandom),
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
  reactionRandom = attemptRandom();
  $("session-reaction").textContent = "—";
  $("reaction-result").textContent =
    "‘지금!’ 표시가 나타나면 반응하세요. 조기 클릭은 실패로 처리됩니다.";
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
  memory = { phase: "ready", sequence: [], cursor: 0 },
  memoryResults = [],
  memoryRandom = attemptRandom(),
  memoryTimers = [],
  memoryGeneration = 0;
function clearMemoryClock() {
  memoryGeneration++;
  memoryTimers.forEach(clearTimeout);
  memoryTimers = [];
}
function renderMemory() {
  $("memory-round").textContent = `ROUND ${memoryRound + 1} / ${MEMORY_LENGTHS.length} · ${MEMORY_LENGTHS[memoryRound]}칸`;
  $("memory-score").textContent = memoryResults.filter(Boolean).length;
  $("memory-progress").textContent = `${memoryResults.length} / 8 완료 · ${$("memory-pace").value === "1500" ? "천천히" : "보통"} 보기`;
  $("memory-grid").replaceChildren(...Array.from({ length: 16 }, (_, cell) => {
    const button = document.createElement("button");
    button.className = "memory-tile";
    button.textContent = cell + 1;
    button.setAttribute("aria-label", `${Math.floor(cell / 4) + 1}행 ${cell % 4 + 1}열, 칸 ${cell + 1}`);
    button.disabled = memory.phase !== "recall";
    button.addEventListener("click", () => answerMemory(cell));
    return button;
  }));
  $("memory-start").disabled = !["ready", "cancelled", "hit", "miss"].includes(memory.phase);
  $("memory-start").textContent = ["hit", "miss"].includes(memory.phase) ? "다음 순서 보기" : "순서 보기";
  $("memory-stop").disabled = !["showing", "recall"].includes(memory.phase);
  $("memory-pace").disabled = memory.phase !== "ready" || memoryResults.length > 0;
}
function startMemory() {
  if (active !== "memory" || !["ready", "cancelled", "hit", "miss"].includes(memory.phase)) return;
  if (["hit", "miss"].includes(memory.phase)) memoryRound++;
  clearMemoryClock();
  memory = makeMemoryRound(memoryRound, memoryRandom);
  renderMemory();
  $("memory-result").hidden = true;
  const token = memoryGeneration, duration = Number($("memory-pace").value), gap = 350;
  // A brief orientation gap comes before each sequence; no automatic next round.
  $("memory-status").textContent = "위치를 차례로 보여줍니다. 입력은 순서가 끝난 뒤 시작합니다.";
  memory.sequence.forEach((cell, i) => {
    memoryTimers.push(setTimeout(() => {
      if (token !== memoryGeneration) return;
      const tile = $("memory-grid").children[cell];
      tile.classList.add("lit");
      $("memory-status").textContent = `${i + 1}번째: ${cell + 1}번 칸`;
      memoryTimers.push(setTimeout(() => tile.classList.remove("lit"), duration));
    }, 500 + i * (duration + gap)));
  });
  memoryTimers.push(setTimeout(() => {
    if (token !== memoryGeneration || document.hidden || active !== "memory") return;
    memory = { ...memory, phase: "recall" };
    renderMemory();
    $("memory-status").textContent = `${memory.sequence.length}개 위치를 본 순서대로 누르세요. 응답 시간 제한은 없습니다.`;
    $("memory-grid").firstElementChild.focus({ preventScroll: true });
  }, 500 + memory.sequence.length * (duration + gap)));
}
function answerMemory(cell) {
  if (memory.phase !== "recall") return;
  const previous = memory.cursor;
  memory = memoryInput(memory, cell);
  $("memory-grid").children[cell].textContent = `${cell + 1} · ${previous + 1}`;
  if (memory.phase === "recall") {
    $("memory-status").textContent = `${memory.cursor}개 입력 · 다음 ${memory.cursor + 1}번째 위치를 누르세요.`;
    return;
  }
  memoryResults.push(memory.phase === "hit");
  clearMemoryClock();
  renderMemory();
  memory.sequence.forEach((position, i) => {
    const tile = $("memory-grid").children[position];
    tile.classList.add("revealed");
    tile.textContent = `${position + 1} · ${i + 1}번째`;
  });
  $("memory-status").textContent = `${memory.phase === "hit" ? "순서 일치!" : `${previous + 1}번째 위치가 달랐습니다.`} 정답 순서: ${memory.sequence.map((p) => p + 1).join(" → ")}`;
  if (memoryResults.length === MEMORY_LENGTHS.length) {
    memory = { ...memory, phase: "complete" };
    $("memory-start").disabled = true;
    $("memory-result").hidden = false;
    $("memory-result").textContent = `${memoryResults.filter(Boolean).length}/8개 순서 일치 · 최대 ${Math.max(0, ...MEMORY_LENGTHS.filter((_, i) => memoryResults[i]))}칸 순서 일치. 표시 속도와 전략에 영향을 받는 게임 기록이며 기억력 진단 점수가 아닙니다.`;
    $("session-memory").textContent = `${memoryResults.filter(Boolean).length}/8`;
    $("memory-restart").focus({ preventScroll: true });
  } else $("memory-start").focus({ preventScroll: true });
}
function cancelMemory() {
  clearMemoryClock();
  if (!["showing", "recall"].includes(memory.phase)) return;
  memory = { phase: "cancelled", sequence: [], cursor: 0 };
  renderMemory();
  $("memory-status").textContent = "이번 순서를 중단했습니다. 기록에 넣지 않고 새 순서로 다시 시작합니다.";
}
$("memory-start").addEventListener("click", startMemory);
$("memory-stop").addEventListener("click", cancelMemory);
$("memory-pace").addEventListener("change", renderMemory);
$("memory-restart").addEventListener("click", () => {
  clearMemoryClock();
  memoryRound = 0;
  memoryResults = [];
  memoryRandom = attemptRandom();
  memory = { phase: "ready", sequence: [], cursor: 0 };
  $("memory-result").hidden = true;
  $("session-memory").textContent = "—";
  $("memory-status").textContent = "순서 보기 버튼으로 시작하세요. 위치를 보여준 뒤 같은 순서로 누릅니다.";
  renderMemory();
  $("memory-start").focus({ preventScroll: true });
});
let hearingIndex = 0,
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
    `ROUND ${String(hearingIndex + 1).padStart(2, "0")} / 09`;
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
    hearingIndex === 8 ? "결과 보기" : "다음 주파수";
  $("hearing-feedback").textContent =
    "한 구간에는 소리가, 다른 구간에는 침묵이 있습니다.";
  $("hearing-result").hidden = true;
  for (const id of ["interval-a", "interval-b"])
    $(id).classList.remove("playing");
  $("hearing-history").replaceChildren(
    ...HEARING_FREQUENCIES.map((freq, i) => {
      const span = document.createElement("span");
      span.textContent = `${freq / 1000}k ${hearingResults[i] === undefined ? "·" : hearingResults[i] ? "✓" : "×"}`;
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
  hearingReady = false;
  $("hearing-play").disabled = true;
  $("hearing-stop").disabled = false;
  document.querySelectorAll("[data-heard]").forEach((b) => (b.disabled = true));
  try {
    await playPair(
      HEARING_FREQUENCIES[hearingIndex],
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
          : "소리를 시작할 수 없습니다. 지원되는 브라우저와 오디오 기기를 확인해주세요.";
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
    $("hearing-score").textContent = hearingResults.filter(Boolean).length;
    $("hearing-frequency").replaceChildren(
      document.createTextNode(HEARING_FREQUENCIES[hearingIndex] / 1000),
      Object.assign(document.createElement("small"), { textContent: "kHz" }),
    );
    $("hearing-state").textContent =
      `소리가 있던 구간: ${hearingTarget.toUpperCase()}`;
    $("hearing-feedback").textContent = correct
      ? "소리가 있던 구간과 선택이 일치합니다."
      : "선택이 일치하지 않습니다. 안 들리는 소리를 억지로 들으려 하지 마세요.";
    const cell = $("hearing-history").children[hearingIndex];
    cell.textContent = `${HEARING_FREQUENCIES[hearingIndex] / 1000}k ${correct ? "✓" : "×"}`;
    cell.className = correct ? "hit" : "miss";
    document
      .querySelectorAll("[data-heard]")
      .forEach((b) => (b.disabled = true));
    $("hearing-play").disabled = true;
    $("hearing-next").disabled = false;
  }),
);
$("hearing-next").addEventListener("click", () => {
  if (!hearingAnswered) return;
  if (hearingIndex < 8) {
    hearingIndex++;
    renderHearing();
    return;
  }
  const matches = hearingResults.filter(Boolean).length;
  $("hearing-result").hidden = false;
  $("hearing-result").textContent =
    `9개 주파수 중 ${matches}개 구간 선택이 일치했습니다. 표에서 주파수별 결과를 확인하세요. 기기를 바꿔 다시 비교해볼 수 있습니다.`;
  $("hearing-feedback").textContent =
    "청취 챌린지 완료. 결과는 이번 기기·음량의 A/B 응답 기록입니다.";
  $("hearing-next").disabled = true;
  $("session-hearing").textContent = `${matches}/9`;
});
$("hearing-restart").addEventListener("click", () => {
  abortHearing();
  hearingIndex = 0;
  hearingResults = [];
  $("hearing-score").textContent = "0";
  renderHearing();
});
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
  selectExperiment(name);
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
  }
});
window.addEventListener("blur", () => {
  cancelReaction();
  cancelMemory();
});
window.addEventListener("pagehide", () => {
  cancelReaction();
  cancelMemory();
  abortHearing();
});
renderIllusion();
renderColorRound();
renderReaction();
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
            "보너스 색 대비 실험을 표시하고 설정합니다. 테스트 답안이나 점수를 변경하지 않고 소리를 켜지 않습니다.",
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
