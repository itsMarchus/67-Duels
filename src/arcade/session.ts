import {
  ACTIVE_PLAYERS_STORAGE_KEY,
  loadActivePlayers,
  normalizeActivePlayers,
  normalizePlayerName,
  type ActivePlayers,
  type StorageLike
} from "./players";

export const ACTIVE_GAME_STORAGE_KEY = "67-duels.active-game.v1";

export type ActiveGameSession =
  | { mode: "duel"; players: ActivePlayers }
  | { mode: "solo"; player: string };

export function normalizeActiveGameSession(value: unknown): ActiveGameSession | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ActiveGameSession>;
  if (candidate.mode === "solo" && "player" in candidate && typeof candidate.player === "string") {
    const player = normalizePlayerName(candidate.player);
    return player ? { mode: "solo", player } : undefined;
  }

  if (candidate.mode === "duel" && "players" in candidate) {
    const players = normalizeActivePlayers(candidate.players);
    return players ? { mode: "duel", players } : undefined;
  }

  return undefined;
}

export function loadActiveGameSession(storage: StorageLike = window.sessionStorage): ActiveGameSession | undefined {
  try {
    const value = storage.getItem(ACTIVE_GAME_STORAGE_KEY);
    const session = value ? normalizeActiveGameSession(JSON.parse(value)) : undefined;
    if (session) {
      return session;
    }
  } catch {
    // Fall through to the legacy duel session.
  }

  const legacyPlayers = loadActivePlayers(storage);
  return legacyPlayers ? { mode: "duel", players: legacyPlayers } : undefined;
}

export function saveActiveGameSession(
  session: ActiveGameSession,
  storage: StorageLike = window.sessionStorage
): ActiveGameSession {
  const normalized = normalizeActiveGameSession(session);
  if (!normalized) {
    throw new Error("Player names must be between 1 and 18 characters.");
  }

  storage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(normalized));
  storage.removeItem(ACTIVE_PLAYERS_STORAGE_KEY);
  return normalized;
}

export function clearActiveGameSession(storage: StorageLike = window.sessionStorage): void {
  storage.removeItem(ACTIVE_GAME_STORAGE_KEY);
  storage.removeItem(ACTIVE_PLAYERS_STORAGE_KEY);
}
