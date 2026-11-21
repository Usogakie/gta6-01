// Progress saved in the browser's local storage.
const SAVE_KEY = "palmera-bay-save-v1";

export function loadSave() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return {
      money: typeof data.money === "number" ? data.money : 150,
      missionIndex: typeof data.missionIndex === "number" ? data.missionIndex : 0,
      completed: Array.isArray(data.completed) ? data.completed : [],
      savedAt: data.savedAt || 0,
    };
  } catch (e) {
    return null;
  }
}

export function writeSave(money, missionIndex, completed) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        money,
        missionIndex,
        completed,
        savedAt: Date.now(),
      }),
    );
  } catch (e) {
    // Storage unavailable: play on without saving.
  }
}

export function clearSave() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // Nothing to clear.
  }
}
