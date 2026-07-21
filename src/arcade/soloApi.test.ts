import { describe, expect, it } from "vitest";
import { parseSoloLeaderboard, parseSoloScoreResult } from "./soloApi";

const entry = {
  id: "attempt-1",
  name: "Freshie",
  score: 67,
  playedAt: "2026-07-21T10:00:00.000Z"
};

describe("solo API responses", () => {
  it("accepts a valid ranked leaderboard", () => {
    expect(parseSoloLeaderboard({ entries: [{ ...entry, rank: 1 }] })).toEqual([{ ...entry, rank: 1 }]);
  });

  it("rejects malformed leaderboard entries", () => {
    expect(() => parseSoloLeaderboard({ entries: [{ ...entry, score: 999, rank: 1 }] })).toThrow(/invalid response/);
    expect(() => parseSoloLeaderboard({ entries: "nope" })).toThrow(/invalid response/);
  });

  it("validates score submission results", () => {
    expect(parseSoloScoreResult({ entry, madeLeaderboard: true, rank: 100 })).toEqual({
      entry,
      madeLeaderboard: true,
      rank: 100
    });
    expect(parseSoloScoreResult({ entry, madeLeaderboard: false, rank: null })).toEqual({
      entry,
      madeLeaderboard: false,
      rank: null
    });
    expect(() => parseSoloScoreResult({ entry, madeLeaderboard: true, rank: 101 })).toThrow(/invalid response/);
  });
});
