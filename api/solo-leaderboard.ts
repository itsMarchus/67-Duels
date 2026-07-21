import type { VercelRequest, VercelResponse } from "../server/vercelTypes";
import { Redis } from "@upstash/redis";
import {
  SOLO_LEADERBOARD_LIMIT,
  parseRankedSoloScores,
  redisConfigured,
  soloRedisKeys
} from "../server/soloLeaderboard";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!redisConfigured()) {
    response.setHeader("Cache-Control", "no-store");
    return response.status(503).json({ error: "The Solo leaderboard is not configured yet." });
  }

  try {
    const redis = createRedis();
    const values = await redis.zrange<string[]>(
      soloRedisKeys().leaderboard,
      0,
      SOLO_LEADERBOARD_LIMIT - 1,
      { rev: true }
    );

    response.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=45");
    return response.status(200).json({ entries: parseRankedSoloScores(values) });
  } catch (error) {
    console.error("Could not load Solo leaderboard", error);
    response.setHeader("Cache-Control", "no-store");
    return response.status(503).json({ error: "The global leaderboard is unavailable right now." });
  }
}

function createRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    automaticDeserialization: false
  });
}
