export const SOLO_LEADERBOARD_LIMIT = 100;
export const SOLO_MAX_SCORE = 400;

export type SoloLeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  playedAt: string;
  rank: number;
};

export type SoloScoreResult = {
  entry: Omit<SoloLeaderboardEntry, "rank">;
  madeLeaderboard: boolean;
  rank: number | null;
};

export async function requestSoloRound(): Promise<string> {
  const response = await fetch("/api/solo-round", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  assertApiRuntime(response);
  const data = await readJson(response);
  if (!response.ok || !data || typeof data !== "object" || !("token" in data) || typeof data.token !== "string") {
    throw new Error(apiError(data, "The global leaderboard is unavailable right now."));
  }

  return data.token;
}

export async function submitSoloScore(token: string, name: string, score: number): Promise<SoloScoreResult> {
  const response = await fetch("/api/solo-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, name, score })
  });
  assertApiRuntime(response);
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(apiError(data, "The score could not reach the global leaderboard."));
  }

  return parseSoloScoreResult(data);
}

export async function fetchSoloLeaderboard(signal?: AbortSignal): Promise<SoloLeaderboardEntry[]> {
  const response = await fetch("/api/solo-leaderboard", {
    headers: { Accept: "application/json" },
    signal
  });
  assertApiRuntime(response);
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(apiError(data, "The global leaderboard is unavailable right now."));
  }

  return parseSoloLeaderboard(data);
}

export function parseSoloLeaderboard(value: unknown): SoloLeaderboardEntry[] {
  if (!value || typeof value !== "object" || !("entries" in value) || !Array.isArray(value.entries)) {
    throw new Error("The global leaderboard returned an invalid response.");
  }

  const entries = value.entries.filter(isSoloLeaderboardEntry);
  if (entries.length !== value.entries.length || entries.length > SOLO_LEADERBOARD_LIMIT) {
    throw new Error("The global leaderboard returned an invalid response.");
  }

  return entries;
}

export function parseSoloScoreResult(value: unknown): SoloScoreResult {
  if (!value || typeof value !== "object") {
    throw new Error("The score service returned an invalid response.");
  }

  const candidate = value as Partial<SoloScoreResult>;
  const entry = candidate.entry as SoloScoreResult["entry"] | undefined;
  const validEntry = entry
    && typeof entry.id === "string"
    && typeof entry.name === "string"
    && Number.isInteger(entry.score)
    && typeof entry.playedAt === "string"
    && Number.isFinite(Date.parse(entry.playedAt));
  const validRank = candidate.rank === null
    || (Number.isInteger(candidate.rank) && Number(candidate.rank) >= 1 && Number(candidate.rank) <= SOLO_LEADERBOARD_LIMIT);

  if (!validEntry || typeof candidate.madeLeaderboard !== "boolean" || !validRank) {
    throw new Error("The score service returned an invalid response.");
  }

  return candidate as SoloScoreResult;
}

function isSoloLeaderboardEntry(value: unknown): value is SoloLeaderboardEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SoloLeaderboardEntry>;
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.name === "string"
    && candidate.name.trim().length > 0
    && candidate.name.length <= 18
    && Number.isInteger(candidate.score)
    && Number(candidate.score) >= 0
    && Number(candidate.score) <= SOLO_MAX_SCORE
    && typeof candidate.playedAt === "string"
    && Number.isFinite(Date.parse(candidate.playedAt))
    && Number.isInteger(candidate.rank)
    && Number(candidate.rank) >= 1
    && Number(candidate.rank) <= SOLO_LEADERBOARD_LIMIT;
}

function assertApiRuntime(response: Response): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 404 || !contentType.includes("application/json")) {
    throw new Error("Solo APIs are not running. Start with npm run dev and open the URL it prints.");
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function apiError(value: unknown, fallback: string): string {
  return value && typeof value === "object" && "error" in value && typeof value.error === "string"
    ? value.error
    : fallback;
}
