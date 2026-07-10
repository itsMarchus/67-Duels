import { describe, expect, it } from "vitest";
import { assignZone, buildPlayerTrackingState, centerOfLandmarks } from "./zones";

describe("zone assignment", () => {
  it("assigns normalized x positions to left, center, and right zones", () => {
    expect(assignZone(0.12)).toBe("left");
    expect(assignZone(0.49)).toBe("left");
    expect(assignZone(0.5)).toBe("center");
    expect(assignZone(0.51)).toBe("right");
    expect(assignZone(0.89)).toBe("right");
  });

  it("averages landmarks into a stable hand center", () => {
    expect(
      centerOfLandmarks([
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.6 },
        { x: 0.2, y: 0.4 }
      ])
    ).toEqual({ x: 0.2, y: 0.4 });
  });

  it("marks a player ready only when two hands are visible", () => {
    expect(buildPlayerTrackingState("left", [{ x: 0.2, y: 0.3 }])).toMatchObject({
      playerId: "left",
      visibleHands: 1,
      swapState: "unknown",
      invalidReason: "show both hands"
    });

    expect(
      buildPlayerTrackingState("right", [
        { x: 0.7, y: 0.25 },
        { x: 0.8, y: 0.65 }
      ])
    ).toMatchObject({
      playerId: "right",
      visibleHands: 2,
      invalidReason: undefined
    });
  });
});
