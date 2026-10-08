import { surroundLightness } from "./model.js";
import { selectExperiment } from "./experiments.js";
const $ = (id) => document.getElementById(id);
let reveal = false;
function renderColor() {
  const difference = Number($("surround-range").value);
  const color = $("sample-color").value;
  document.querySelectorAll(".sample").forEach((element) => {
    element.style.backgroundColor = color;
  });
  const [left, right] = surroundLightness(difference, reveal);
  $("surround-a").style.backgroundColor = "hsl(221 18% " + left + "%)";
  $("surround-b").style.backgroundColor = "hsl(221 18% " + right + "%)";
  $("surround-output").value = difference + "%";
  $("sample-output").value = color.toUpperCase();
  $("color-answer").textContent = reveal
    ? "A = B · " + color.toUpperCase() + " · 같은 색입니다."
    : "두 정사각형의 색은 같을까요?";
  $("reveal-color").textContent = reveal
    ? "배경 다시 보여주기"
    : "배경을 지워 비교하기";
  $("reveal-color").setAttribute("aria-pressed", String(reveal));
}
$("surround-range").addEventListener("input", renderColor);
$("sample-color").addEventListener("input", renderColor);
$("reveal-color").addEventListener("click", () => {
  reveal = !reveal;
  renderColor();
});
$("reset-color").addEventListener("click", () => {
  reveal = false;
  $("surround-range").value = "70";
  $("sample-color").value = "#8a90ff";
  renderColor();
});
document.querySelectorAll("[data-tab]").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      const active = button === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab.dataset.tab;
    });
    selectExperiment(tab.dataset.tab);
  }),
);
renderColor();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const tool = {
    name: "configure_color_experiment",
    title: "색 비교 실험 설정",
    description:
      "중앙색과 배경 밝기 차이를 설정하고 색 실험을 표시합니다. 소리를 켜거나 파일을 저장하지 않습니다.",
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
          (key) => !["color", "difference", "reveal"].includes(key),
        ) ||
        !/^#[0-9a-fA-F]{6}$/.test(input.color) ||
        !Number.isFinite(input.difference) ||
        input.difference < 0 ||
        input.difference > 100 ||
        typeof input.reveal !== "boolean"
      )
        throw new TypeError("Invalid color configuration");
      document.querySelector('[data-tab="color"]').click();
      $("sample-color").value = input.color;
      $("surround-range").value = String(input.difference);
      reveal = input.reveal;
      renderColor();
      return {
        experiment: "color",
        color: $("sample-color").value,
        difference: Number($("surround-range").value),
        revealed: reveal,
      };
    },
  };
  try {
    Promise.resolve(
      document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
    ).catch(() => console.info("Optional browser tool unavailable"));
  } catch {
    console.info("Optional browser tool unavailable");
  }
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
