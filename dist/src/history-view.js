import { TESTS, summarizeRun, personalTrend, achievementCount } from "./history.js";
import { createHistoryStore } from "./history-store.js";
import { writeProgress } from "./progress.js";

export function setupHistory(provider = () => window.localStorage) {
  const store = createHistoryStore(provider), $ = (id) => document.getElementById(id);
  const labels = { color: "색감", reaction: "반응", memory: "순서 기억" };
  const notice = (message) => { $("history-status").textContent = message; };
  const problem = (reason) => reason === "corrupt" ?
    "저장 기록의 형식을 읽을 수 없습니다. 전체 기록 삭제 후 다시 저장할 수 있습니다." :
    "기록을 저장하거나 삭제하지 못했습니다. 브라우저의 저장 공간 설정을 확인하세요.";
  function sync(history) {
    const completed = achievementCount(history);
    const dates = TESTS.flatMap((mode) => history.runs[mode].filter((run) => mode !== "reaction" || summarizeRun(mode, run).complete).map((run) => run.completedAt));
    return writeProgress(provider, completed ? { completed, total: 3, updatedAt: dates.sort().at(-1) } : null);
  }
  function summaryText(mode, run) {
    const s = summarizeRun(mode, run);
    if (mode === "color") return `${s.hits}/12 정답 · 최소 정답 ΔL ${s.smallest === null ? "—" : `${s.smallest}%`}`;
    if (mode === "memory") return `${s.hits}/8 일치 · 최대 ${s.longest}칸 · ${s.pace === 850 ? "보통" : "천천히"}`;
    return `${s.complete ? "완료" : "5회 미달"} · ${s.count}/5회 · 중앙값 ${s.median ?? "—"} ms · MAD ${s.mad ?? "—"} ms · 범위 ${s.best ?? "—"}–${s.worst ?? "—"} ms · 조기 ${s.early} · 기타 제외 ${s.excluded}`;
  }
  function roundText(mode, round, index) {
    const prefix = `${index + 1}회 · `;
    if (mode === "color") return `${prefix}${round.correct ? "정답" : "오답"} · 단계 ${round.level + 1} · ΔL ${round.delta}%`;
    if (mode === "memory") return `${prefix}${round.length}칸 · ${round.correct ? "순서 일치" : "불일치"}`;
    return prefix + ({ valid: `${round.elapsed} ms`, early: "신호 전 입력", excluded: "입력 제외", cancelled: "중단" })[round.outcome];
  }
  function render(history) {
    for (const mode of TESTS) {
      const runs = history.runs[mode], trend = personalTrend(mode, runs);
      $(mode + "-trend").textContent = !trend ? "저장된 완료 기록이 없습니다." :
        `최근 ${trend.recent.length}회 ${mode === "reaction" ? "중앙값(ms)" : "정답 수"}: ${trend.recent.join(" → ")}${trend.change === null ? " · 비교할 이전 기록이 없습니다." : ` · 이전 대비 ${trend.change > 0 ? "+" : ""}${trend.change}${mode === "reaction" ? " ms" : "개"}`}${mode === "memory" ? ` · ${trend.pace === 850 ? "보통" : "천천히"} 보기끼리 비교` : ""}`;
      $(mode + "-saved").replaceChildren(...[...runs].reverse().map((run) => {
        const card = document.createElement("div");
        card.className = "saved-run";
        const details = document.createElement("details"), title = document.createElement("summary");
        const date = new Date(run.completedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
        title.textContent = `${date} · ${summaryText(mode, run)}`;
        const rounds = document.createElement("ol");
        rounds.className = "saved-rounds";
        rounds.append(...run.rounds.map((round, index) => Object.assign(document.createElement("li"), { textContent: roundText(mode, round, index) })));
        details.append(title, rounds);
        const remove = document.createElement("button");
        remove.className = "small-button outline";
        remove.textContent = "이 기록 삭제";
        remove.setAttribute("aria-label", `${labels[mode]} ${date} 기록 삭제`);
        remove.addEventListener("click", () => {
          const result = store.remove(mode, run.id);
          if (!result.ok) { notice(problem(result.reason)); return; }
          const synced = sync(result.history);
          render(result.history);
          notice(synced ? "기록을 삭제했습니다." : "기록을 삭제했지만 완료 요약을 갱신하지 못했습니다. 전체 기록 삭제로 다시 시도하세요.");
          $(mode + "-records-title").focus({ preventScroll: true });
        });
        card.append(details, remove);
        return card;
      }));
    }
  }
  const initial = store.read();
  render(initial.history);
  if (!initial.ok) notice(problem(initial.reason));
  $("history-clear-all").addEventListener("click", () => {
    const result = store.clear();
    // Independently try removing our aggregate even if private deletion failed.
    const synced = writeProgress(provider, null);
    if (result.ok) render(result.history);
    notice(!result.ok ? problem(result.reason) : synced ? "저장 기록과 완료 요약을 삭제했습니다." :
      "저장 기록은 삭제했습니다. 완료 요약을 삭제하지 못했습니다. 다시 삭제를 눌러주세요.");
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== "sense-lab-history-v1" && event.key !== null) return;
    const result = store.read();
    render(result.history);
    notice(result.ok ? "다른 탭의 기록 변경을 반영했습니다." : problem(result.reason));
  });
  return {
    record(mode, rounds, pace) {
      let result;
      try {
        const run = { id: crypto.randomUUID(), completedAt: new Date().toISOString(), rounds: rounds.map((round) => ({ ...round })) };
        if (mode === "memory") run.pace = pace;
        result = store.add(mode, run);
      } catch { result = { ok: false, reason: "unavailable" }; }
      if (!result.ok) { notice(problem(result.reason)); return; }
      const synced = sync(result.history);
      render(result.history);
      notice(synced ? "이번 기록을 저장했습니다." : "이번 기록은 저장했습니다. 완료 요약을 갱신하지 못했습니다.");
    },
  };
}
