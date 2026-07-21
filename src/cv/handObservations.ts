import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { HandObservation } from "./types";
import { assignZone, centerOfPalmLandmarks } from "./zones";

export function observationsFromResult(
  result: HandLandmarkerResult,
  includeWorldLandmarks = true
): HandObservation[] {
  return result.landmarks.map((landmarks, index) => {
    const mirroredLandmarks = landmarks.map((landmark) => ({
      x: 1 - landmark.x,
      y: landmark.y,
      z: landmark.z
    }));
    const center = centerOfPalmLandmarks(mirroredLandmarks);
    const handedness = result.handedness[index]?.[0];

    return {
      landmarks: mirroredLandmarks,
      ...(includeWorldLandmarks ? { worldLandmarks: result.worldLandmarks[index] } : {}),
      handedness: handedness?.categoryName === "Left" || handedness?.categoryName === "Right"
        ? handedness.categoryName
        : "Unknown",
      handednessConfidence: handedness?.score ?? 0,
      zone: assignZone(center.x)
    };
  });
}
