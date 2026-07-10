export const ACTIVE_PLAYERS_STORAGE_KEY = "67-duels.active-players.v1";
export const PLAYER_NAME_MAX_LENGTH = 18;

export type ActivePlayers = {
  left: string;
  right: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function normalizePlayerName(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0 || name.length > PLAYER_NAME_MAX_LENGTH) {
    return undefined;
  }

  return name;
}

export function playerNameError(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0) {
    return "Enter a player name.";
  }

  if (name.length > PLAYER_NAME_MAX_LENGTH) {
    return `Keep it to ${PLAYER_NAME_MAX_LENGTH} characters.`;
  }

  return undefined;
}

export function normalizeActivePlayers(value: unknown): ActivePlayers | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<ActivePlayers>;
  if (typeof candidate.left !== "string" || typeof candidate.right !== "string") {
    return undefined;
  }

  const left = normalizePlayerName(candidate.left);
  const right = normalizePlayerName(candidate.right);
  return left && right ? { left, right } : undefined;
}

export function loadActivePlayers(storage: StorageLike = window.sessionStorage): ActivePlayers | undefined {
  try {
    const value = storage.getItem(ACTIVE_PLAYERS_STORAGE_KEY);
    return value ? normalizeActivePlayers(JSON.parse(value)) : undefined;
  } catch {
    return undefined;
  }
}

export function saveActivePlayers(players: ActivePlayers, storage: StorageLike = window.sessionStorage): ActivePlayers {
  const normalized = normalizeActivePlayers(players);
  if (!normalized) {
    throw new Error("Both player names must be between 1 and 18 characters.");
  }

  storage.setItem(ACTIVE_PLAYERS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearActivePlayers(storage: StorageLike = window.sessionStorage): void {
  storage.removeItem(ACTIVE_PLAYERS_STORAGE_KEY);
}
