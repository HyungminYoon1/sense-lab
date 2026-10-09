import { HISTORY_KEY, HISTORY_MAX_SIZE, HISTORY_LIMIT, TESTS, emptyHistory, validateHistory, validateRun } from "./history.js";

// Browser persistence boundary; pure validation and summaries live in history.js.
export function createHistoryStore(provider) {
  function read() {
    try {
      const raw = provider().getItem(HISTORY_KEY);
      if (raw === null) return { ok: true, history: emptyHistory() };
      if (typeof raw !== "string" || raw.length > HISTORY_MAX_SIZE) return { ok: false, reason: "corrupt", history: emptyHistory() };
      try { return { ok: true, history: validateHistory(JSON.parse(raw)) }; }
      catch { return { ok: false, reason: "corrupt", history: emptyHistory() }; }
    } catch { return { ok: false, reason: "unavailable", history: emptyHistory() }; }
  }
  function write(history) {
    try {
      validateHistory(history);
      const raw = JSON.stringify(history);
      if (raw.length > HISTORY_MAX_SIZE) return { ok: false, reason: "corrupt" };
      const storage = provider();
      storage.setItem(HISTORY_KEY, raw);
      if (storage.getItem(HISTORY_KEY) !== raw) return { ok: false, reason: "unavailable" };
      return { ok: true, history };
    } catch { return { ok: false, reason: "unavailable" }; }
  }
  return {
    read,
    add(mode, run) {
      try { validateRun(mode, run); } catch { return { ok: false, reason: "invalid" }; }
      const current = read();
      if (!current.ok) return current;
      if (TESTS.some((key) => current.history.runs[key].some((saved) => saved.id === run.id)))
        return { ok: false, reason: "duplicate" };
      current.history.runs[mode] = [...current.history.runs[mode], run].slice(-HISTORY_LIMIT);
      return write(current.history);
    },
    remove(mode, id) {
      if (!TESTS.includes(mode)) return { ok: false, reason: "invalid" };
      const current = read();
      if (!current.ok) return current;
      current.history.runs[mode] = current.history.runs[mode].filter((run) => run.id !== id);
      return write(current.history);
    },
    clear() {
      try {
        const storage = provider();
        storage.removeItem(HISTORY_KEY);
        if (storage.getItem(HISTORY_KEY) !== null) return { ok: false, reason: "unavailable" };
        return { ok: true, history: emptyHistory() };
      } catch { return { ok: false, reason: "unavailable" }; }
    },
  };
}
