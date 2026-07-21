import type { VercelRequest, VercelResponse } from "../server/vercelTypes";
import { Redis } from "@upstash/redis";
import {
  SAVE_SOLO_SCORE_SCRIPT,
  SOLO_HISTORY_KEY,
  SOLO_HISTORY_LIMIT,
  SOLO_LEADERBOARD_KEY,
  SOLO_LEADERBOARD_LIMIT,
  SOLO_RATE_LIMIT_PER_MINUTE,
  SOLO_TOKEN_TTL_SECONDS,
  SoloRequestError,
  createStoredSoloScore,
  redisConfigured,
  soloCompositeScore,
  soloRateLimitKey,
  validateSoloScoreRequest
} from "../server/soloLeaderboard";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!redisConfigured()) {
    return response.status(503).json({ error: "The Solo leaderboard is not configured yet." });
  }

  try {
    const now = Date.now();
    const submission = validateSoloScoreRequest(request.body, process.env.SOLO_SCORE_SECRET!, now);
    const entry = createStoredSoloScore(submission.claims.id, submission.name, submission.score, now);
    const member = JSON.stringify(entry);
    const redis = createRedis();
    const result = await redis.eval<string[], [number, number]>(
      SAVE_SOLO_SCORE_SCRIPT,
      [
        SOLO_LEADERBOARD_KEY,
        SOLO_HISTORY_KEY,
        "67-duels:solo:used:" + submission.claims.id,
        soloRateLimitKey(clientIp(request), process.env.SOLO_SCORE_SECRET!)
      ],
      [
        String(soloCompositeScore(entry.score, now)),
        member,
        String(entry.score),
        String(SOLO_TOKEN_TTL_SECONDS),
        String(SOLO_LEADERBOARD_LIMIT),
        String(SOLO_HISTORY_LIMIT),
        String(SOLO_RATE_LIMIT_PER_MINUTE)
      ]
    );

    if (!Array.isArray(result) || Number(result[0]) === 0) {
      return response.status(409).json({ error: "This Solo round was already submitted." });
    }

    if (Number(result[0]) === 2) {
      return response.status(429).json({ error: "Too many Solo scores from this connection. Try again in a minute." });
    }

    const rank = Number(result[1]);
    const madeTop50 = Number.isInteger(rank) && rank >= 1 && rank <= SOLO_LEADERBOARD_LIMIT;
    return response.status(200).json({
      entry,
      madeTop50,
      rank: madeTop50 ? rank : null
    });
  } catch (error) {
    if (error instanceof SoloRequestError) {
      return response.status(error.statusCode).json({ error: error.message });
    }

    console.error("Could not save Solo score", error);
    return response.status(503).json({ error: "The score could not reach the global leaderboard." });
  }
}

function clientIp(request: VercelRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || request.socket.remoteAddress || "unknown";
}

function createRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    automaticDeserialization: false
  });
}
