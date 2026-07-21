import { describe, expect, it, vi } from "vitest";
import { parseSoloLeaderboard, parseSoloScoreResult, requestSoloRound } from "./soloApi";

const entry = {
  id: "attempt-1",
  name: "Player",
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

  it("explains when the frontend-only server receives a Solo request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {
      status: 404,
      headers: { "Content-Type": "text/plain" }
    })));

    try {
      await expect(requestSoloRound()).rejects.toThrow(/npm run dev/);
    } finally {
      vi.unstubAllGlobals();
    }
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
