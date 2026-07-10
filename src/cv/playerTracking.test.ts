import { describe, expect, it } from "vitest";
import { selectLanePair, statesFromObservations } from "./playerTracking";
import type { HandObservation } from "./types";

function hand(
  zone: "left" | "right" | "center",
  handednessConfidence = 0.9,
  x = 0.2,
  y = 0.3
): HandObservation {
  return {
    zone,
    handednessConfidence,
    handedness: "Unknown",
    landmarks: Array.from({ length: 21 }, () => ({ x, y }))
  };
}

describe("player tracking", () => {
  it("builds ready states when each zone has two hands", () => {
    const states = statesFromObservations([
      hand("left", 0.8),
      hand("left", 0.85, 0.35),
      hand("right", 0.9, 0.7),
      hand("right", 0.92, 0.82)
    ]);

    expect(states.left).toMatchObject({ visibleHands: 2, invalidReason: undefined });
    expect(states.right).toMatchObject({ visibleHands: 2, invalidReason: undefined });
  });

  it("keeps valid landmarks even when handedness classification is uncertain", () => {
    const states = statesFromObservations([
      hand("left", 0.01),
      hand("left", 0.02, 0.33),
      hand("center", 0.9, 0.5),
      hand("right", 0.03, 0.75),
      hand("right", 0.04, 0.85)
    ]);

    expect(states.left).toMatchObject({ visibleHands: 2, invalidReason: undefined });
    expect(states.right).toMatchObject({ visibleHands: 2, invalidReason: undefined });
  });

  it("selects the two outermost hands when a third hand crosses a lane boundary", () => {
    expect(selectLanePair("left", [
      { x: 0.48, y: 0.4 },
      { x: 0.12, y: 0.3 },
      { x: 0.32, y: 0.6 }
    ])).toEqual([
      { x: 0.12, y: 0.3 },
      { x: 0.32, y: 0.6 }
    ]);

    expect(selectLanePair("right", [
      { x: 0.52, y: 0.4 },
      { x: 0.68, y: 0.3 },
      { x: 0.9, y: 0.6 }
    ])).toEqual([
      { x: 0.68, y: 0.3 },
      { x: 0.9, y: 0.6 }
    ]);
  });
});
