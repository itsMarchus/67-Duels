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
    expect(parseSoloScoreResult({ entry, madeTop50: true, rank: 1 })).toEqual({
      entry,
      madeTop50: true,
      rank: 1
    });
    expect(() => parseSoloScoreResult({ entry, madeTop50: true, rank: 99 })).toThrow(/invalid response/);
  });
});
