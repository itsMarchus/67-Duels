import { describe, expect, it } from "vitest";
import { assignZone, buildPlayerTrackingState, centerOfLandmarks, centerOfPalmLandmarks } from "./zones";
import type { HandCenter } from "./types";

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

  it("uses palm landmarks so fingertip motion does not shift the gesture center", () => {
    const relaxed = Array.from({ length: 21 }, (_, index) => ({
      x: index * 0.01,
      y: index * 0.01
    }));
    const extended = relaxed.map((point, index) =>
      [0, 5, 9, 13, 17].includes(index) ? point : { x: point.x + 0.4, y: point.y - 0.3 }
    );

    expect(centerOfPalmLandmarks(extended)).toEqual(centerOfPalmLandmarks(relaxed));
  });

  it("falls back to all available landmarks when a partial observation lacks palm points", () => {
    const partial: HandCenter[] = [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }];
    expect(centerOfPalmLandmarks(partial)).toEqual({ x: 0.3, y: 0.4 });
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
