import type { HandCenter, PlayerTrackingState, Zone } from "./types";

export function assignZone(x: number): Zone {
  if (x === 0.5) {
    return "center";
  }

  return x < 0.5 ? "left" : "right";
}

export function centerOfLandmarks(landmarks: HandCenter[]): HandCenter {
  if (landmarks.length === 0) {
    return { x: 0, y: 0 };
  }

  const total = landmarks.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: Number((total.x / landmarks.length).toFixed(6)),
    y: Number((total.y / landmarks.length).toFixed(6))
  };
}

export function buildPlayerTrackingState(
  playerId: "left" | "right",
  handCenters: HandCenter[],
  minHands = 2
): PlayerTrackingState {
  const visibleHands = handCenters.length;

  return {
    playerId,
    visibleHands,
    handCenters,
    swapState: visibleHands >= minHands ? "neutral" : "unknown",
    confidence: Math.min(1, visibleHands / minHands),
    invalidReason: visibleHands >= minHands ? undefined : "show both hands"
  };
}
