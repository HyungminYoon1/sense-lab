import { surroundLightness } from "./model.js";
import { selectExperiment, stopSound } from "./experiments.js";
import {
  makeColorRound,
  COLOR_DELTAS,
  reactionInput,
  median,
  HEARING_FREQUENCIES,
} from "./challenges.js";
import { playPair, stopPair } from "./hearing.js";
const $ = (id) => document.getElementById(id);
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
  colorBoard,
  colorAnswered = false,
  colorResults = [];
function renderColorRound() {
  colorBoard = makeColorRound(colorRound);
  colorAnswered = false;
  $("color-grid").style.setProperty("--columns", colorBoard.columns);
  $("color-grid").replaceChildren(
    ...colorBoard.colors.map((color, index) => {
      const button = document.createElement("button");
      button.className = "color-tile";
      button.style.setProperty("--tile", color);
      button.setAttribute("aria-label", `칸 ${index + 1}`);
      button.addEventListener("click", () => answerColor(index));
      return button;
    }),
  );
  $("color-round").textContent =
    `ROUND ${String(colorRound + 1).padStart(2, "0")} / 12`;
  $("color-difference").textContent = `ΔL ${colorBoard.delta}%`;
  $("color-feedback").textContent = "색이 다른 한 칸을 선택하세요.";
  $("color-next").disabled = true;
  $("color-next").textContent = colorRound === 11 ? "결과 보기" : "다음 색";
  $("color-result").hidden = true;
  $("color-history").replaceChildren(
    ...COLOR_DELTAS.map((_, i) => {
      const li = document.createElement("li");
      li.textContent = String(i + 1).padStart(2, "0");
      li.className =
        colorResults[i] === undefined ? "" : colorResults[i] ? "hit" : "miss";
      li.setAttribute(
        "aria-label",
        `${i + 1}번: ${colorResults[i] === undefined ? "미진행" : colorResults[i] ? "정답" : "오답"}`,
      );
      return li;
    }),
  );
}
function answerColor(index) {
  if (colorAnswered) return;
  colorAnswered = true;
  const correct = index === colorBoard.odd;
  colorResults.push(correct);
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
    ? `정답! 밝기 차이 ${colorBoard.delta}%를 구분했습니다.`
    : `정답은 ${colorBoard.odd + 1}번 칸입니다. 밝기 차이 ${colorBoard.delta}%.`;
  $("color-score").textContent = colorResults.filter(Boolean).length;
  const li = $("color-history").children[colorRound];
  li.className = correct ? "hit" : "miss";
  li.setAttribute(
    "aria-label",
    `${colorRound + 1}번: ${correct ? "정답" : "오답"}`,
  );
  $("color-next").disabled = false;
}
$("color-next").addEventListener("click", () => {
  if (!colorAnswered) return;
  if (colorRound < 11) {
    colorRound++;
    renderColorRound();
    return;
  }
  const count = colorResults.filter(Boolean).length,
    deltas = COLOR_DELTAS.filter((_, i) => colorResults[i]);
  $("color-result").hidden = false;
  $("color-result").textContent =
    `12개 중 ${count}개 정답. ${deltas.length ? `이번에 구분한 가장 작은 밝기 차이는 ${Math.min(...deltas)}%입니다.` : "다른 색으로 다시 도전해보세요."}`;
  $("color-feedback").textContent =
    "12라운드 완료! 새로운 색으로 다시 도전할 수 있습니다.";
  $("color-next").disabled = true;
  $("session-color").textContent = `${count}/12`;
});
$("color-restart").addEventListener("click", () => {
  colorRound = 0;
  colorResults = [];
  $("color-score").textContent = "0";
  renderColorRound();
});
let reaction = { phase: "ready" },
  reactionTimer = 0,
  reactionFrame = 0,
  reactionTimes = [],
  early = 0;
function clearReactionClock() {
  clearTimeout(reactionTimer);
  cancelAnimationFrame(reactionFrame);
  reactionTimer = 0;
  reactionFrame = 0;
}
function renderReaction() {
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
    complete: [
      "✓",
      `${Math.round(median(reactionTimes) || 0)} ms`,
      "5회 기록의 중앙값입니다.",
    ],
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
  $("reaction-next").hidden = !["false-start", "result", "cancelled"].includes(
    reaction.phase,
  );
  $("reaction-next").textContent =
    reaction.phase === "result" ? "다음 시도" : "다시 시도";
  $("reaction-score").textContent = reactionTimes.length
    ? Math.round(median(reactionTimes))
    : "—";
  $("reaction-caption").textContent =
    `기록 ${reactionTimes.length} / 5 · 조기 클릭 ${early}회`;
  $("reaction-status").textContent = message + " · " + instruction;
  $("reaction-history").replaceChildren(
    ...reactionTimes.map((value) =>
      Object.assign(document.createElement("li"), {
        textContent: `${value} ms`,
      }),
    ),
  );
  if (reaction.phase === "complete") {
    $("reaction-result").textContent =
      `최고 기록 ${Math.min(...reactionTimes)} ms · 중앙값 ${Math.round(median(reactionTimes))} ms · 조기 클릭 ${early}회. 실패한 시도는 기록에서 제외했습니다.`;
    $("session-reaction").textContent =
      `${Math.round(median(reactionTimes))} ms`;
  }
}
function startReaction() {
  clearReactionClock();
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
        reaction = { phase: "go", signalAt: performance.now() };
        renderReaction();
      });
    },
    1600 + Math.random() * 2700,
  );
}
function reactionPress() {
  if (reaction.phase === "ready") {
    startReaction();
    return;
  }
  if (!["waiting", "go"].includes(reaction.phase)) return;
  reaction = reactionInput(reaction, performance.now());
  clearReactionClock();
  if (reaction.phase === "false-start") early++;
  else if (reaction.phase === "result") {
    reactionTimes.push(reaction.elapsed);
    if (reactionTimes.length === 5) reaction = { phase: "complete" };
  }
  renderReaction();
}
$("reaction-zone").addEventListener("pointerdown", (e) => {
  if (e.isPrimary && e.button === 0) {
    e.preventDefault();
    $("reaction-zone").focus({ preventScroll: true });
    reactionPress();
  }
});
$("reaction-zone").addEventListener("keydown", (e) => {
  if ([" ", "Enter"].includes(e.key)) {
    e.preventDefault();
    if (e.repeat) {
      if (reaction.phase === "waiting") reactionPress();
      return;
    }
    reactionPress();
  }
});
$("reaction-zone").addEventListener("click", (e) => {
  if (e.detail === 0) reactionPress();
});
document.addEventListener(
  "pointerdown",
  (e) => {
    if (
      reaction.phase === "waiting" &&
      e.target.closest('[data-panel="reaction"]') &&
      e.target !== $("reaction-zone") &&
      !$("reaction-zone").contains(e.target)
    )
      reactionPress();
  },
  true,
);
$("reaction-next").addEventListener("click", () => {
  if (["false-start", "result", "cancelled"].includes(reaction.phase)) {
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
  $("reaction-result").textContent =
    "‘지금!’ 표시가 나타나면 반응하세요. 조기 클릭은 실패로 처리됩니다.";
  renderReaction();
});
function cancelReaction() {
  clearReactionClock();
  if (["waiting", "go"].includes(reaction.phase)) {
    reaction = { phase: "cancelled" };
    renderReaction();
  }
}
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
    abortHearing();
  }
});
window.addEventListener("blur", cancelReaction);
window.addEventListener("pagehide", () => {
  cancelReaction();
  abortHearing();
});
renderIllusion();
renderColorRound();
renderReaction();
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
