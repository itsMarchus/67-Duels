import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const DEFAULT_REDIS_KEY_PREFIX = "67-duels";
export const SOLO_LEADERBOARD_LIMIT = 100;
export const SOLO_MAX_SCORE = 400;
export const SOLO_ROUND_MIN_AGE_MS = 30_000;
export const SOLO_ROUND_MAX_AGE_MS = 5 * 60_000;
export const SOLO_TOKEN_TTL_SECONDS = 10 * 60;
export const SOLO_RATE_LIMIT_PER_MINUTE = 60;
export const SOLO_COMPOSITE_MULTIPLIER = 10_000_000_000_000;

export type SoloRoundClaims = {
  id: string;
  issuedAt: number;
};

export type StoredSoloScore = {
  id: string;
  name: string;
  score: number;
  playedAt: string;
};

export type RankedSoloScore = StoredSoloScore & {
  rank: number;
};

export class SoloRequestError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

export function issueSoloRoundToken(secret: string, issuedAt = Date.now(), id: string = randomUUID()): string {
  const payload = Buffer.from(JSON.stringify({ id, issuedAt }), "utf8").toString("base64url");
  return payload + "." + signPayload(payload, secret);
}

export function verifySoloRoundToken(
  token: string,
  secret: string,
  now = Date.now()
): SoloRoundClaims | undefined {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || token.length > 1_024) {
    return undefined;
  }

  const expected = new TextEncoder().encode(signPayload(payload, secret));
  const actual = new TextEncoder().encode(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return undefined;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SoloRoundClaims>;
    const age = now - Number(value.issuedAt);
    if (typeof value.id !== "string"
      || !/^[a-zA-Z0-9-]{8,80}$/.test(value.id)
      || !Number.isFinite(value.issuedAt)
      || age < SOLO_ROUND_MIN_AGE_MS
      || age > SOLO_ROUND_MAX_AGE_MS) {
      return undefined;
    }

    return { id: value.id, issuedAt: Number(value.issuedAt) };
  } catch {
    return undefined;
  }
}

export function validateSoloScoreRequest(value: unknown, secret: string, now = Date.now()) {
  if (!value || typeof value !== "object") {
    throw new SoloRequestError(400, "Invalid score submission.");
  }

  const candidate = value as { token?: unknown; name?: unknown; score?: unknown };
  if (typeof candidate.token !== "string") {
    throw new SoloRequestError(400, "This Solo round is missing its verification token.");
  }

  const claims = verifySoloRoundToken(candidate.token, secret, now);
  if (!claims) {
    throw new SoloRequestError(400, "This Solo round expired or did not run for 30 seconds.");
  }

  const name = normalizeSoloName(candidate.name);
  if (!name) {
    throw new SoloRequestError(400, "Player names must be between 1 and 18 characters.");
  }

  if (!Number.isInteger(candidate.score)
    || Number(candidate.score) < 0
    || Number(candidate.score) > SOLO_MAX_SCORE) {
    throw new SoloRequestError(400, "That score is outside the accepted Solo range.");
  }

  return {
    claims,
    name,
    score: Number(candidate.score)
  };
}

export function createStoredSoloScore(id: string, name: string, score: number, now = Date.now()): StoredSoloScore {
  return {
    id,
    name,
    score,
    playedAt: new Date(now).toISOString()
  };
}

export function soloCompositeScore(score: number, playedAt: number): number {
  return score * SOLO_COMPOSITE_MULTIPLIER + playedAt;
}

export function parseRankedSoloScores(values: unknown[]): RankedSoloScore[] {
  const scores = values
    .map(parseStoredSoloScore)
    .filter((entry): entry is StoredSoloScore => Boolean(entry));

  let rank = 0;
  let previousScore: number | undefined;
  return scores.map((entry, index) => {
    if (entry.score !== previousScore) {
      rank = index + 1;
      previousScore = entry.score;
    }

    return { ...entry, rank };
  });
}

export function redisConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    environment.UPSTASH_REDIS_REST_URL
    && environment.UPSTASH_REDIS_REST_TOKEN
    && environment.SOLO_SCORE_SECRET
    && environment.SOLO_SCORE_SECRET.length >= 32
  );
}

export function redisKeyPrefix(environment: NodeJS.ProcessEnv = process.env): string {
  return normalizeRedisKeyPrefix(environment.REDIS_KEY_PREFIX) ?? DEFAULT_REDIS_KEY_PREFIX;
}

export function soloRedisKeys(prefix = redisKeyPrefix()) {
  const namespace = normalizeRedisKeyPrefix(prefix) ?? DEFAULT_REDIS_KEY_PREFIX;

  return {
    leaderboard: namespace + ":solo:leaderboard:v1",
    used: (roundId: string) => namespace + ":solo:used:" + roundId,
    rate: (digest: string) => namespace + ":solo:rate:" + digest
  };
}

export function soloRateLimitKey(
  identifier: string,
  secret: string,
  prefix = redisKeyPrefix()
): string {
  const digest = createHmac("sha256", secret).update(identifier || "unknown").digest("hex").slice(0, 24);
  return soloRedisKeys(prefix).rate(digest);
}

export const SAVE_SOLO_SCORE_SCRIPT = `
if redis.call("EXISTS", KEYS[2]) == 1 then
  return {0, -1}
end

local attempts = redis.call("INCR", KEYS[3])
if attempts == 1 then
  redis.call("EXPIRE", KEYS[3], 60)
end
if attempts > tonumber(ARGV[6]) then
  return {2, -1}
end

redis.call("SET", KEYS[2], "1", "EX", ARGV[4])
redis.call("ZADD", KEYS[1], ARGV[1], ARGV[2])

local total = redis.call("ZCARD", KEYS[1])
local limit = tonumber(ARGV[5])
if total > limit then
  redis.call("ZREMRANGEBYRANK", KEYS[1], 0, total - limit - 1)
end

local position = redis.call("ZREVRANK", KEYS[1], ARGV[2])
if not position then
  return {1, 0}
end

local score = tonumber(ARGV[3])
local higher = redis.call("ZCOUNT", KEYS[1], (score + 1) * 10000000000000, "+inf")
return {1, higher + 1}
`;

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function normalizeRedisKeyPrefix(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const prefix = value.trim();
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,47}$/.test(prefix) ? prefix : undefined;
}

function normalizeSoloName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const name = value.trim();
  if (name.length === 0 || name.length > 18 || /[\u0000-\u001f\u007f]/.test(name)) {
    return undefined;
  }

  return name;
}

function parseStoredSoloScore(value: unknown): StoredSoloScore | undefined {
  let candidate: unknown = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }

  const entry = candidate as Partial<StoredSoloScore>;
  const name = normalizeSoloName(entry.name);
  if (typeof entry.id !== "string"
    || !name
    || !Number.isInteger(entry.score)
    || Number(entry.score) < 0
    || Number(entry.score) > SOLO_MAX_SCORE
    || typeof entry.playedAt !== "string"
    || !Number.isFinite(Date.parse(entry.playedAt))) {
    return undefined;
  }

  return {
    id: entry.id,
    name,
    score: Number(entry.score),
    playedAt: entry.playedAt
  };
}
