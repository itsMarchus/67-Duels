import type { VercelRequest, VercelResponse } from "../server/vercelTypes.js";
import { issueSoloRoundToken, redisConfigured } from "../server/soloLeaderboard.js";

export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!redisConfigured()) {
    return response.status(503).json({ error: "The Solo leaderboard is not configured yet." });
  }

  return response.status(200).json({
    token: issueSoloRoundToken(process.env.SOLO_SCORE_SECRET!)
  });
}
