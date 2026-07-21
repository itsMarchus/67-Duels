import { describe, expect, it } from "vitest";
import {
  DEFAULT_REDIS_KEY_PREFIX,
  SAVE_SOLO_SCORE_SCRIPT,
  SOLO_LEADERBOARD_LIMIT,
  SOLO_ROUND_MAX_AGE_MS,
  SOLO_ROUND_MIN_AGE_MS,
  SoloRequestError,
  issueSoloRoundToken,
  parseRankedSoloScores,
  redisConfigured,
  redisKeyPrefix,
  soloCompositeScore,
  soloRateLimitKey,
  soloRedisKeys,
  validateSoloScoreRequest,
  verifySoloRoundToken
} from "./soloLeaderboard";

const secret = "test-secret-that-is-long-enough-for-hmac";
const issuedAt = 1_000_000;
const token = issueSoloRoundToken(secret, issuedAt, "round-test-123");

describe("Solo leaderboard security", () => {
  it("accepts signed tokens only after a completed round", () => {
    expect(verifySoloRoundToken(token, secret, issuedAt + SOLO_ROUND_MIN_AGE_MS - 1)).toBeUndefined();
    expect(verifySoloRoundToken(token, secret, issuedAt + SOLO_ROUND_MIN_AGE_MS)).toEqual({
      id: "round-test-123",
      issuedAt
    });
    expect(verifySoloRoundToken(token, "wrong-secret", issuedAt + SOLO_ROUND_MIN_AGE_MS)).toBeUndefined();
    expect(verifySoloRoundToken(token, secret, issuedAt + SOLO_ROUND_MAX_AGE_MS + 1)).toBeUndefined();
  });

  it("requires all server secrets and hashes rate-limit identifiers", () => {
    expect(redisConfigured({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      SOLO_SCORE_SECRET: "short"
    })).toBe(false);
    expect(redisConfigured({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      SOLO_SCORE_SECRET: "s".repeat(32)
    })).toBe(true);
    expect(soloRateLimitKey("203.0.113.10", secret)).toBe(soloRateLimitKey("203.0.113.10", secret));
    expect(soloRateLimitKey("203.0.113.10", secret)).not.toContain("203.0.113.10");
  });

  it("isolates projects with a validated Redis key prefix", () => {
    const defaultKeys = soloRedisKeys();
    const otherProjectKeys = soloRedisKeys("portfolio-app");

    expect(redisKeyPrefix({})).toBe(DEFAULT_REDIS_KEY_PREFIX);
    expect(redisKeyPrefix({ REDIS_KEY_PREFIX: " custom-game " })).toBe("custom-game");
    expect(redisKeyPrefix({ REDIS_KEY_PREFIX: "unsafe:prefix" })).toBe(DEFAULT_REDIS_KEY_PREFIX);
    expect(defaultKeys.leaderboard).toBe("67-duels:solo:leaderboard:v1");
    expect(otherProjectKeys.leaderboard).toBe("portfolio-app:solo:leaderboard:v1");
    expect(otherProjectKeys.leaderboard).not.toBe(defaultKeys.leaderboard);
    expect(defaultKeys.used("round-1")).toBe("67-duels:solo:used:round-1");
    expect(SOLO_LEADERBOARD_LIMIT).toBe(100);
    expect(SAVE_SOLO_SCORE_SCRIPT).toContain("ZREMRANGEBYRANK");
    expect(SAVE_SOLO_SCORE_SCRIPT).not.toMatch(/LPUSH|LTRIM/);
  });

  it("validates names and plausible scores", () => {
    expect(validateSoloScoreRequest(
      { token, name: "  Freshie  ", score: 67 },
      secret,
      issuedAt + SOLO_ROUND_MIN_AGE_MS
    )).toMatchObject({ name: "Freshie", score: 67 });

    expect(() => validateSoloScoreRequest(
      { token, name: "Freshie", score: 401 },
      secret,
      issuedAt + SOLO_ROUND_MIN_AGE_MS
    )).toThrow(SoloRequestError);
  });

  it("sorts equal scores by stored order and displays shared ranks", () => {
    const entries = parseRankedSoloScores([
      JSON.stringify({ id: "new", name: "New", score: 67, playedAt: "2026-07-21T10:00:02.000Z" }),
      JSON.stringify({ id: "old", name: "Old", score: 67, playedAt: "2026-07-21T10:00:01.000Z" }),
      JSON.stringify({ id: "third", name: "Third", score: 60, playedAt: "2026-07-21T10:00:03.000Z" })
    ]);

    expect(entries.map((entry) => [entry.id, entry.rank])).toEqual([
      ["new", 1],
      ["old", 1],
      ["third", 3]
    ]);
    expect(soloCompositeScore(67, 2)).toBeGreaterThan(soloCompositeScore(66, Date.now()));
  });
});
