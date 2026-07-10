import { describe, expect, it } from "vitest";
import { statesFromObservations } from "./playerTracking";
import type { HandObservation } from "./types";

function hand(zone: "left" | "right" | "center", confidence = 0.9, x = 0.2, y = 0.3): HandObservation {
  return {
    zone,
    confidence,
    handedness: "Unknown",
    landmarks: [
      { x, y },
      { x: x + 0.02, y: y + 0.04 }
    ]
  };
}

describe("player tracking", () => {
  it("builds ready states when each zone has two confident hands", () => {
    const states = statesFromObservations(
      [hand("left", 0.8), hand("left", 0.85, 0.35), hand("right", 0.9, 0.7), hand("right", 0.92, 0.82)],
      0.42
    );

    expect(states.left).toMatchObject({ visibleHands: 2, invalidReason: undefined });
    expect(states.right).toMatchObject({ visibleHands: 2, invalidReason: undefined });
  });

  it("ignores center-zone and low-confidence hands", () => {
    const states = statesFromObservations(
      [hand("left", 0.9), hand("left", 0.2, 0.33), hand("center", 0.9, 0.5), hand("right", 0.9, 0.75)],
      0.42
    );

    expect(states.left).toMatchObject({ visibleHands: 1, invalidReason: "show both hands" });
    expect(states.right).toMatchObject({ visibleHands: 1, invalidReason: "show both hands" });
  });
});
