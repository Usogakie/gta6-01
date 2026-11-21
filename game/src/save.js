// Saving for Palmera Bay: progress lives in localStorage so a player can
// close the tab and come back as the same Vic, with the same money and
// mission. Nothing leaves the player's own browser.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      money: typeof data.money === 'number' ? data.money : 150,
      missionIndex: typeof data.missionIndex === 'number' ? data.missionIndex : 0,
      completedMissions: Array.isArray(data.completedMissions) ? data.completedMissions : [],
    };
  } catch {
    return null;
  }
}

export function writeSave(game) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: game.player.money,
      missionIndex: game.missions.index,
      completedMissions: game.completedMissions || [],
      savedAt: new Date().toISOString(),
    }));
  } catch {
    // Storage full or blocked: the game still plays, it just won't persist.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
