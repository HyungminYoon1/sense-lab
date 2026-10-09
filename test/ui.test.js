import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// This small DOM/clock double exercises the real app event wiring. It is not
// browser, rendering, screen-reader or physical input evidence.
class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = [];
    this.dataset = {};
    this.attributes = {};
    this.value = "";
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((n) => this.classes.add(n)),
      remove: (...names) => names.forEach((n) => this.classes.delete(n)),
      toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name),
    };
    this.style = { setProperty: (name, value) => { this.style[name] = value; } };
  }
  addEventListener(name, callback, capture = false) { this.listeners.push({ name, callback, capture }); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { children.forEach((c) => { c.parent = this; this.children.push(c); }); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  get firstElementChild() { return this.children[0]; }
  contains(node) { return node === this || this.children.some((c) => c.contains(node)); }
  focus() { globalThis.document.activeElement = this; }
  getBoundingClientRect() { return { width: 640, height: 320 }; }
  getContext() { return new Proxy({}, { get: () => () => {}, set: () => true }); }
}
const source = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
test("static accessibility wiring: unique IDs, associated labels and semantic challenge controls", () => {
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of source.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(id));
  for (const [, list] of source.matchAll(/\baria-(?:labelledby|describedby)="([^"]+)"/g))
    for (const id of list.split(" ")) assert.ok(ids.includes(id));
  for (const id of ["reaction-zone", "reaction-next", "memory-start", "memory-stop", "memory-restart"])
    assert.match(source, new RegExp(`<button\\s+[^>]*id="${id}"`));
  assert.match(source, /id="memory-status" role="status" aria-atomic="true"/);
});

test("test-double: real UI rejects held/mixed/repeated input, aggregates once, cancels and caps attempts", async () => {
  const originals = new Map();
  const install = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  const ids = new Map(), tabs = [], panels = [], answers = [];
  for (const [, tag, attributes] of source.matchAll(/<(\w+)\s+([^>]+)>/g)) {
    const id = attributes.match(/\bid="([^"]+)"/)?.[1];
    const el = new Element(tag);
    if (id) ids.set(id, el);
    el.value = attributes.match(/\bvalue="([^"]+)"/)?.[1] || "";
    for (const [attribute, collection] of [["tab", tabs], ["panel", panels], ["heard", answers]]) {
      const value = attributes.match(new RegExp(`data-${attribute}="([^"]+)"`))?.[1];
      if (value) { el.dataset[attribute] = value; collection.push(el); }
    }
  }
  ids.get("wave-type").value = "sine";
  ids.get("force-mode").value = "attract";
  ids.get("memory-pace").value = "850";
  for (const id of ["reaction-symbol", "reaction-message", "reaction-instruction"])
    ids.get("reaction-zone").append(ids.get(id));
  const document = new Element(), window = new Element();
  document.getElementById = (id) => { assert.ok(ids.has(id), `Missing UI ID ${id}`); return ids.get(id); };
  document.createElement = (tag) => new Element(tag);
  document.createTextNode = (text) => Object.assign(new Element(), { textContent: text });
  document.querySelector = () => new Element("main");
  document.querySelectorAll = (selector) => ({
    "[data-tab]": tabs, "[data-panel]": panels, "[data-heard]": answers, ".sample": [new Element(), new Element()],
  })[selector] || [];
  document.hidden = false;
  let clock = 100, serial = 0;
  const timers = new Map(), frames = new Map();
  const tick = (amount) => {
    const end = clock + amount;
    while (true) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      clock = due[1].at; timers.delete(due[0]); due[1].callback();
    }
    clock = end;
  };
  const frame = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((f) => f(clock)); };
  const emit = (target, name, args = {}) => {
    const event = { target, timeStamp: clock, isPrimary: true, button: 0, pointerId: 1, detail: 0, preventDefault() {}, ...args };
    for (const listener of document.listeners.filter((l) => l.name === name && l.capture)) listener.callback(event);
    for (const listener of target.listeners.filter((l) => l.name === name)) listener.callback(event);
  };
  const click = (id) => emit(ids.get(id), "click");
  const zone = ids.get("reaction-zone"), phase = () => zone.dataset.phase;
  const pointer = (release = true, args = {}) => {
    emit(zone, "pointerdown", args);
    if (release) emit(zone, "pointerup", args);
  };
  const go = () => { tick(4301); frame(); assert.equal(phase(), "go"); };
  try {
    install("document", document); install("window", window);
    install("performance", { now: () => clock });
    install("matchMedia", () => ({ matches: true, addEventListener() {} }));
    install("ResizeObserver", class { observe() {} });
    install("devicePixelRatio", 1);
    install("setTimeout", (callback, delay) => { const id = ++serial; timers.set(id, { at: clock + delay, callback }); return id; });
    install("clearTimeout", (id) => timers.delete(id));
    install("requestAnimationFrame", (callback) => { const id = ++serial; frames.set(id, callback); return id; });
    install("cancelAnimationFrame", (id) => frames.delete(id));
    await import("../dist/src/app.js");
    const oddColor = () => ids.get("color-grid").children.findIndex((tile, _, tiles) =>
      tiles.filter((other) => other.style["--tile"] === tile.style["--tile"]).length === 1);
    for (let i = 0; i < 12; i++) {
      const tiles = ids.get("color-grid").children;
      emit(tiles[oddColor()], "click");
      assert.equal(document.activeElement, ids.get("color-next"));
      click("color-next");
    }
    assert.equal(ids.get("color-grid").children.length, 36);
    assert.equal(ids.get("session-color").textContent, "12/12");
    click("color-restart");
    emit(ids.get("color-grid").children[(oddColor() + 1) % 16], "click");
    click("color-next");
    assert.match(ids.get("color-difference").textContent, /단계 3/);
    emit(tabs.find((t) => t.dataset.tab === "reaction"), "click");
    pointer(false); tick(4301); frame();
    assert.equal(phase(), "invalid");
    emit(zone, "pointerup"); click("reaction-next");
    pointer(); pointer(); assert.equal(phase(), "false-start");
    pointer(); assert.equal(phase(), "false-start");
    click("reaction-next"); pointer(); go(); tick(50); pointer();
    assert.equal(phase(), "invalid");
    click("reaction-next"); pointer(); go(); tick(200);
    emit(zone, "keydown", { key: " ", repeat: true });
    emit(zone, "keyup", { key: " " }); assert.equal(phase(), "invalid");
    click("reaction-next"); pointer(); go(); tick(200); pointer();
    assert.equal(phase(), "settling");
    emit(zone, "keydown", { key: "Enter" }); emit(zone, "keyup", { key: "Enter" });
    tick(300); assert.equal(phase(), "invalid");
    assert.equal(ids.get("reaction-history").children.length, 0);
    click("reaction-next"); pointer(); go(); tick(200);
    emit(ids.get("reaction-caption"), "click"); assert.equal(phase(), "invalid");
    click("reaction-next"); pointer(); go(); tick(3001); assert.equal(phase(), "invalid");
    click("reaction-next"); pointer(); go(); tick(200);
    emit(zone, "pointerdown", { timeStamp: clock - 201 }); emit(zone, "pointerup");
    assert.equal(phase(), "false-start");
    click("reaction-next"); pointer(); go(); tick(200);
    emit(zone, "pointerdown", { isPrimary: false, pointerId: 2 });
    emit(zone, "pointerup", { pointerId: 2 }); assert.equal(phase(), "invalid");
    click("reaction-restart");
    for (const elapsed of [200, 205, 210, 215, 2900]) {
      // Alternate pointer, keyboard and assistive activation paths.
      click("reaction-zone"); go(); tick(elapsed);
      if (elapsed === 200) { pointer(); emit(zone, "click", { detail: 1 }); }
      else if (elapsed === 205) {
        emit(zone, "keydown", { key: "Enter" }); emit(zone, "keyup", { key: "Enter" });
      } else click("reaction-zone");
      tick(251);
      if (phase() !== "complete") click("reaction-next");
    }
    assert.equal(phase(), "complete");
    assert.equal(ids.get("reaction-score").textContent, 210);
    assert.match(ids.get("reaction-result").textContent, /MAD\) 5 ms/);
    pointer(); assert.equal(ids.get("reaction-history").children.length, 5);
    click("reaction-restart"); pointer(); go(); tick(200); pointer();
    window.listeners.find((l) => l.name === "blur").callback(); tick(500);
    assert.equal(phase(), "cancelled");
    assert.equal(ids.get("reaction-history").children.length, 0);
    click("reaction-restart");
    for (let i = 0; i < 15; i++) { pointer(); pointer(); if (i < 14) click("reaction-next"); }
    assert.equal(phase(), "exhausted");
    assert.equal(ids.get("reaction-next").hidden, true);

    emit(tabs.find((t) => t.dataset.tab === "memory"), "click");
    click("memory-start"); tick(500);
    assert.ok(ids.get("memory-grid").children.some((c) => c.classes.has("lit")));
    document.hidden = true;
    document.listeners.filter((l) => l.name === "visibilitychange").forEach((l) => l.callback());
    tick(20000);
    assert.ok(ids.get("memory-grid").children.every((c) => c.disabled));
    assert.equal(ids.get("memory-progress").textContent.startsWith("0 / 8"), true);
    document.hidden = false;
    click("memory-start");
    const sequence = [];
    for (let i = 0; i < 3; i++) {
      tick(i === 0 ? 500 : 1200);
      sequence.push(ids.get("memory-grid").children.findIndex((c) => c.classes.has("lit")));
    }
    tick(1200);
    assert.equal(document.activeElement, ids.get("memory-grid").firstElementChild);
    for (const cell of sequence) emit(ids.get("memory-grid").children[cell], "click");
    assert.equal(ids.get("memory-score").textContent, 1);
    // Terminal round state ignores additional clicks instead of adding a score.
    emit(ids.get("memory-grid").children[sequence[0]], "click");
    assert.equal(ids.get("memory-score").textContent, 1);
    for (const [round, length] of [3, 3, 4, 4, 5, 5, 6, 7].entries()) {
      if (!round) continue;
      click("memory-start");
      const sequence = [];
      for (let i = 0; i < length; i++) {
        tick(i === 0 ? 500 : 1200);
        sequence.push(ids.get("memory-grid").children.findIndex((c) => c.classes.has("lit")));
      }
      tick(1200);
      if (round === 1) emit(ids.get("memory-grid").children[(sequence[0] + 1) % 16], "click");
      else for (const cell of sequence) emit(ids.get("memory-grid").children[cell], "click");
    }
    assert.equal(ids.get("memory-score").textContent, 7);
    assert.equal(ids.get("session-memory").textContent, "7/8");
    assert.equal(ids.get("memory-start").disabled, true);
    assert.match(ids.get("memory-result").textContent, /최대 7칸/);
    click("memory-start"); // Even scripted activation cannot run a ninth round.
    assert.equal(ids.get("session-memory").textContent, "7/8");
  } finally {
    for (const [name, descriptor] of originals)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
});
