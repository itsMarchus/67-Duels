import type { ActivePlayers, StorageLike } from "./players";
import type { PlayerId } from "../cv/types";

export const ARCADE_RECORDS_STORAGE_KEY = "67-duels.arcade.v1";
export const MAX_MATCHES = 500;

export type ArcadePlayer = {
  name: string;
  score: number;
};

export type MatchRecord = {
  id: string;
  playedAt: string;
  left: ArcadePlayer;
  right: ArcadePlayer;
  winner: PlayerId | "tie";
};

export type ArcadeRecords = {
  version: 1;
  matches: MatchRecord[];
};

export type LeaderboardEntry = ArcadePlayer & {
  id: string;
  matchId: string;
  playedAt: string;
  rank: number;
  result: "WIN" | "LOSS" | "TIE";
  side: PlayerId;
};

export function emptyArcadeRecords(): ArcadeRecords {
  return { version: 1, matches: [] };
}

export function createMatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createMatchRecord(
  id: string,
  players: ActivePlayers,
  scores: Record<PlayerId, number>,
  winner: PlayerId | "tie",
  playedAt = new Date()
): MatchRecord {
  return {
    id,
    playedAt: playedAt.toISOString(),
    left: { name: players.left, score: scores.left },
    right: { name: players.right, score: scores.right },
    winner
  };
}

export function parseArcadeRecordsJson(json: string): ArcadeRecords {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  if (!isArcadeRecords(value)) {
    throw new Error("That file is not a valid 67 Duels records backup.");
  }

  return {
    version: 1,
    matches: [...value.matches]
      .sort((a, b) => Date.parse(a.playedAt) - Date.parse(b.playedAt))
      .slice(-MAX_MATCHES)
  };
}

export function loadArcadeRecords(storage: StorageLike = window.localStorage): ArcadeRecords {
  try {
    const json = storage.getItem(ARCADE_RECORDS_STORAGE_KEY);
    return json ? parseArcadeRecordsJson(json) : emptyArcadeRecords();
  } catch {
    return emptyArcadeRecords();
  }
}

export function replaceArcadeRecords(records: ArcadeRecords, storage: StorageLike = window.localStorage): ArcadeRecords {
  const normalized = parseArcadeRecordsJson(JSON.stringify(records));
  storage.setItem(ARCADE_RECORDS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function appendMatch(match: MatchRecord, storage: StorageLike = window.localStorage): ArcadeRecords {
  const current = loadArcadeRecords(storage);
  if (current.matches.some((record) => record.id === match.id)) {
    return current;
  }

  return replaceArcadeRecords(
    { version: 1, matches: [...current.matches, match].slice(-MAX_MATCHES) },
    storage
  );
}

export function clearArcadeRecords(storage: StorageLike = window.localStorage): void {
  storage.removeItem(ARCADE_RECORDS_STORAGE_KEY);
}

export function exportArcadeRecords(records: ArcadeRecords): string {
  return `${JSON.stringify(records, null, 2)}\n`;
}

export function getMatchHistory(records: ArcadeRecords): MatchRecord[] {
  return [...records.matches].sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt));
}

export function getLeaderboard(records: ArcadeRecords): LeaderboardEntry[] {
  const entries = records.matches.flatMap((match) =>
    (["left", "right"] as const).map((side) => ({
      ...match[side],
      id: `${match.id}:${side}`,
      matchId: match.id,
      playedAt: match.playedAt,
      rank: 0,
      result: match.winner === "tie" ? "TIE" as const : match.winner === side ? "WIN" as const : "LOSS" as const,
      side
    }))
  );

  entries.sort((a, b) => b.score - a.score || Date.parse(b.playedAt) - Date.parse(a.playedAt));

  let currentRank = 0;
  let previousScore: number | undefined;
  return entries.map((entry, index) => {
    if (entry.score !== previousScore) {
      currentRank = index + 1;
      previousScore = entry.score;
    }

    return { ...entry, rank: currentRank };
  });
}

function isArcadeRecords(value: unknown): value is ArcadeRecords {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ArcadeRecords>;
  return candidate.version === 1 && Array.isArray(candidate.matches) && candidate.matches.every(isMatchRecord);
}

function isMatchRecord(value: unknown): value is MatchRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<MatchRecord>;
  return typeof candidate.id === "string"
    && candidate.id.length > 0
    && typeof candidate.playedAt === "string"
    && Number.isFinite(Date.parse(candidate.playedAt))
    && isArcadePlayer(candidate.left)
    && isArcadePlayer(candidate.right)
    && (candidate.winner === "left" || candidate.winner === "right" || candidate.winner === "tie");
}

function isArcadePlayer(value: unknown): value is ArcadePlayer {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ArcadePlayer>;
  return typeof candidate.name === "string"
    && candidate.name.trim().length > 0
    && candidate.name.trim().length <= 18
    && typeof candidate.score === "number"
    && Number.isInteger(candidate.score)
    && candidate.score >= 0;
}
