import type { DetectionSettings, HandObservation, PlayerTrackingState } from "./types";
import { buildPlayerTrackingState, centerOfLandmarks } from "./zones";

export function statesFromObservations(
  observations: HandObservation[],
  minConfidenceOrSettings: number | Pick<DetectionSettings, "minConfidence">
): Record<"left" | "right", PlayerTrackingState> {
  const minConfidence =
    typeof minConfidenceOrSettings === "number" ? minConfidenceOrSettings : minConfidenceOrSettings.minConfidence;

  const centers = {
    left: [] as { x: number; y: number }[],
    right: [] as { x: number; y: number }[]
  };

  for (const observation of observations) {
    if (observation.zone === "center" || observation.confidence < minConfidence) {
      continue;
    }

    centers[observation.zone].push(centerOfLandmarks(observation.landmarks));
  }

  return {
    left: buildPlayerTrackingState("left", centers.left),
    right: buildPlayerTrackingState("right", centers.right)
  };
}
