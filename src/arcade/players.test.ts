import { describe, expect, it } from "vitest";
import {
  ACTIVE_PLAYERS_STORAGE_KEY,
  loadActivePlayers,
  normalizePlayerName,
  saveActivePlayers,
  type StorageLike
} from "./players";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe("active players", () => {
  it("trims valid names and rejects empty or oversized names", () => {
    expect(normalizePlayerName("  Player  ")).toBe("Player");
    expect(normalizePlayerName("   ")).toBeUndefined();
    expect(normalizePlayerName("a".repeat(19))).toBeUndefined();
  });

  it("round-trips valid players through session storage", () => {
    const storage = memoryStorage();
    saveActivePlayers({ left: "  Alex ", right: "Sam" }, storage);

    expect(loadActivePlayers(storage)).toEqual({ left: "Alex", right: "Sam" });
  });

  it("ignores malformed session data", () => {
    const storage = memoryStorage();
    storage.setItem(ACTIVE_PLAYERS_STORAGE_KEY, "not-json");

    expect(loadActivePlayers(storage)).toBeUndefined();
  });
});
