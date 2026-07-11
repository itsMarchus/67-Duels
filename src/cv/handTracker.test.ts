import { describe, expect, it } from "vitest";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { observationsFromResult } from "./handTracker";

describe("hand tracker observations", () => {
  it("keeps handedness confidence as metadata without using it for validity", () => {
    const landmarks = Array.from({ length: 21 }, (_, index) => ({
      x: [0, 5, 9, 13, 17].includes(index) ? 0.8 : 0.1,
      y: 0.3,
      z: 0
    }));
    const result = {
      landmarks: [landmarks],
      worldLandmarks: [[]],
      handedness: [[{ categoryName: "Left", score: 0.01 }]]
    } as unknown as HandLandmarkerResult;

    expect(observationsFromResult(result)[0]).toMatchObject({
      handedness: "Left",
      handednessConfidence: 0.01,
      zone: "left"
    });
  });
});
