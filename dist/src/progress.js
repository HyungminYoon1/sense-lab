export const PROGRESS_KEY = "web-lab-progress-v1";
export const REPO_IDS = Object.freeze([
  "data-mirage", "echo-vault", "light-route", "logic-foundry", "neon-tactics",
  "orbit-courier", "packet-journey", "parcel-panic", "pixel-kitchen", "pocket-city",
  "route-race", "sense-lab", "swarm-garden", "think-forge", "traffic-lab",
]);
const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
function validSummary(value) {
  return exact(value, ["completed", "total", "updatedAt"]) && Number.isInteger(value.completed) &&
    Number.isInteger(value.total) && value.completed >= 0 && value.completed <= value.total && value.total <= 1000 &&
    typeof value.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.updatedAt) &&
    Number.isFinite(Date.parse(value.updatedAt)) && new Date(value.updatedAt).toISOString() === value.updatedAt;
}
export function parseProgress(raw) {
  if (raw === null) return { version: 1, apps: {} };
  if (typeof raw !== "string" || raw.length > 8192) throw new TypeError("Invalid progress size");
  const value = JSON.parse(raw);
  if (!exact(value, ["version", "apps"]) || value.version !== 1 || !value.apps || typeof value.apps !== "object" ||
      Array.isArray(value.apps) || Object.keys(value.apps).length > REPO_IDS.length ||
      Object.entries(value.apps).some(([id, summary]) => !REPO_IDS.includes(id) || !validSummary(summary)))
    throw new TypeError("Invalid progress summary");
  return value;
}
// This service can mutate only its own entry. Other allowlisted summaries survive.
export function writeProgress(provider, summary) {
  try {
    if (summary !== null && (!validSummary(summary) || summary.total !== 3)) return false;
    const storage = provider(), progress = parseProgress(storage.getItem(PROGRESS_KEY));
    if (summary === null) delete progress.apps["sense-lab"];
    else progress.apps["sense-lab"] = { ...summary };
    const raw = JSON.stringify(progress);
    if (raw.length > 8192) return false;
    if (!Object.keys(progress.apps).length) {
      storage.removeItem(PROGRESS_KEY);
      return storage.getItem(PROGRESS_KEY) === null;
    }
    storage.setItem(PROGRESS_KEY, raw);
    return storage.getItem(PROGRESS_KEY) === raw;
  } catch { return false; }
}
