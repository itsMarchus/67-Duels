import type { HandCenter, HandObservation, PlayerId, PlayerTrackingState } from "./types";
import { buildPlayerTrackingState, centerOfPalmLandmarks } from "./zones";

export function statesFromObservations(observations: HandObservation[]): Record<PlayerId, PlayerTrackingState> {
  const centers = {
    left: [] as HandCenter[],
    right: [] as HandCenter[]
  };

  for (const observation of observations) {
    if (observation.zone === "center") {
      continue;
    }

    centers[observation.zone].push(centerOfPalmLandmarks(observation.landmarks));
  }

  return {
    left: buildPlayerTrackingState("left", selectLanePair("left", centers.left)),
    right: buildPlayerTrackingState("right", selectLanePair("right", centers.right))
  };
}

export function soloStateFromObservations(observations: HandObservation[]): Record<PlayerId, PlayerTrackingState> {
  const centers = observations
    .map((observation) => centerOfPalmLandmarks(observation.landmarks))
    .sort((a, b) => a.x - b.x);
  const soloPair = centers.length > 2 ? [centers[0], centers[centers.length - 1]] : centers;

  return {
    left: buildPlayerTrackingState("left", soloPair),
    right: buildPlayerTrackingState("right", [])
  };
}

export function selectLanePair(playerId: PlayerId, centers: HandCenter[]): HandCenter[] {
  const sorted = [...centers].sort((a, b) => a.x - b.x);
  return playerId === "left" ? sorted.slice(0, 2) : sorted.slice(-2);
}
