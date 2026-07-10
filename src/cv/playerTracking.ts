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

export function selectLanePair(playerId: PlayerId, centers: HandCenter[]): HandCenter[] {
  const sorted = [...centers].sort((a, b) => a.x - b.x);
  return playerId === "left" ? sorted.slice(0, 2) : sorted.slice(-2);
}
