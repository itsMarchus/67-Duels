import { describe, expect, it } from "vitest";
import {
  ARCADE_RECORDS_STORAGE_KEY,
  MAX_MATCHES,
  appendMatch,
  createMatchRecord,
  getLeaderboard,
  getMatchHistory,
  loadArcadeRecords,
  parseArcadeRecordsJson,
  type ArcadeRecords
} from "./records";
import type { StorageLike } from "./players";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe("arcade records", () => {
  it("saves a match idempotently", () => {
    const storage = memoryStorage();
    const match = createMatchRecord("round-1", { left: "Alex", right: "Alex" }, { left: 12, right: 9 }, "left");

    appendMatch(match, storage);
    appendMatch(match, storage);

    expect(loadArcadeRecords(storage).matches).toEqual([match]);
  });

  it("keeps only the newest 500 matches", () => {
    const storage = memoryStorage();
    for (let index = 0; index < MAX_MATCHES + 3; index += 1) {
      appendMatch(
        createMatchRecord(
          `round-${index}`,
          { left: "L", right: "R" },
          { left: index, right: 0 },
          "left",
          new Date(Date.UTC(2026, 0, 1, 0, 0, index))
        ),
        storage
      );
    }

    const records = loadArcadeRecords(storage);
    expect(records.matches).toHaveLength(MAX_MATCHES);
    expect(records.matches[0].id).toBe("round-3");
  });

  it("recovers from malformed storage and rejects invalid imports", () => {
    const storage = memoryStorage();
    storage.setItem(ARCADE_RECORDS_STORAGE_KEY, "broken");

    expect(loadArcadeRecords(storage)).toEqual({ version: 1, matches: [] });
    expect(() => parseArcadeRecordsJson('{"version":2,"matches":[]}')).toThrow(/valid 67 Duels/);
  });

  it("ranks every appearance independently and shares ranks for tied scores", () => {
    const records: ArcadeRecords = {
      version: 1,
      matches: [
        createMatchRecord("older", { left: "Kai", right: "Mia" }, { left: 14, right: 8 }, "left", new Date("2026-07-09T10:00:00Z")),
        createMatchRecord("newer", { left: "Kai", right: "Bea" }, { left: 14, right: 5 }, "left", new Date("2026-07-09T11:00:00Z"))
      ]
    };

    const leaderboard = getLeaderboard(records);
    expect(leaderboard.slice(0, 2).map((entry) => [entry.name, entry.rank, entry.matchId])).toEqual([
      ["Kai", 1, "newer"],
      ["Kai", 1, "older"]
    ]);
    expect(leaderboard[2].rank).toBe(3);
  });

  it("orders match history newest first", () => {
    const older = createMatchRecord("older", { left: "A", right: "B" }, { left: 1, right: 0 }, "left", new Date("2026-07-09T10:00:00Z"));
    const newer = createMatchRecord("newer", { left: "C", right: "D" }, { left: 2, right: 3 }, "right", new Date("2026-07-09T11:00:00Z"));

    expect(getMatchHistory({ version: 1, matches: [older, newer] }).map((match) => match.id)).toEqual(["newer", "older"]);
  });
});
