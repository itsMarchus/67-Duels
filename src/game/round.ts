import type { PlayerId, RoundState } from "../cv/types";

export const ROUND_SECONDS = 30;

export function createInitialRoundState(): RoundState {
  return {
    phase: "cameraSetup",
    remainingTime: ROUND_SECONDS,
    scores: { left: 0, right: 0 }
  };
}

export function startCountdown(round: RoundState, timestamp: number): RoundState {
  return {
    ...round,
    phase: "countdown",
    remainingTime: ROUND_SECONDS,
    winner: undefined,
    startedAt: timestamp,
    endedAt: undefined
  };
}

export function startPlaying(round: RoundState, timestamp: number): RoundState {
  return {
    ...round,
    phase: "playing",
    remainingTime: ROUND_SECONDS,
    winner: undefined,
    startedAt: timestamp,
    endedAt: undefined
  };
}

export function tickRound(round: RoundState, timestamp: number): RoundState {
  if (round.phase !== "playing" || round.startedAt === undefined) {
    return round;
  }

  const elapsedSeconds = Math.floor((timestamp - round.startedAt) / 1000);
  const remainingTime = Math.max(0, ROUND_SECONDS - elapsedSeconds);

  if (remainingTime === 0) {
    return finishRound({ ...round, remainingTime }, timestamp);
  }

  return {
    ...round,
    remainingTime
  };
}

export function scoreRep(round: RoundState, playerId: PlayerId): RoundState {
  if (round.phase !== "playing") {
    return round;
  }

  return {
    ...round,
    scores: {
      ...round.scores,
      [playerId]: round.scores[playerId] + 1
    }
  };
}

export function finishRound(round: RoundState, timestamp: number): RoundState {
  const winner = getWinner(round.scores.left, round.scores.right);

  return {
    ...round,
    phase: "results",
    remainingTime: 0,
    winner,
    endedAt: timestamp
  };
}

function getWinner(leftScore: number, rightScore: number): PlayerId | "tie" {
  if (leftScore > rightScore) {
    return "left";
  }

  if (rightScore > leftScore) {
    return "right";
  }

  return "tie";
}
