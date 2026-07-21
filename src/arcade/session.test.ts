import { describe, expect, it } from "vitest";
import { ACTIVE_PLAYERS_STORAGE_KEY, type StorageLike } from "./players";
import {
  ACTIVE_GAME_STORAGE_KEY,
  clearActiveGameSession,
  loadActiveGameSession,
  normalizeActiveGameSession,
  saveActiveGameSession
} from "./session";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe("active game session", () => {
  it("normalizes solo and duel sessions", () => {
    expect(normalizeActiveGameSession({ mode: "solo", player: "  Alex  " })).toEqual({
      mode: "solo",
      player: "Alex"
    });
    expect(normalizeActiveGameSession({ mode: "duel", players: { left: "P1", right: "P2" } })).toEqual({
      mode: "duel",
      players: { left: "P1", right: "P2" }
    });
    expect(normalizeActiveGameSession({ mode: "solo", player: "" })).toBeUndefined();
  });

  it("round-trips a solo session and clears legacy data", () => {
    const storage = memoryStorage();
    storage.setItem(ACTIVE_PLAYERS_STORAGE_KEY, JSON.stringify({ left: "Old", right: "Names" }));

    saveActiveGameSession({ mode: "solo", player: " Freshie " }, storage);

    expect(loadActiveGameSession(storage)).toEqual({ mode: "solo", player: "Freshie" });
    expect(storage.getItem(ACTIVE_PLAYERS_STORAGE_KEY)).toBeNull();
    clearActiveGameSession(storage);
    expect(storage.getItem(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it("restores legacy duel sessions", () => {
    const storage = memoryStorage();
    storage.setItem(ACTIVE_PLAYERS_STORAGE_KEY, JSON.stringify({ left: "One", right: "Two" }));

    expect(loadActiveGameSession(storage)).toEqual({
      mode: "duel",
      players: { left: "One", right: "Two" }
    });
  });
});
