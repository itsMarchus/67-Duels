import { describe, expect, it } from "vitest";
import { RepCounter } from "./repCounter";
import { PARTY_FORGIVING_SETTINGS } from "./types";

describe("RepCounter", () => {
  it("counts a rep when two hands complete one alternating swap", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    expect(counter.update([{ x: 0.2, y: 0.25 }, { x: 0.35, y: 0.7 }], 0)).toBeUndefined();
    const event = counter.update([{ x: 0.2, y: 0.72 }, { x: 0.35, y: 0.24 }], 180);

    expect(event).toEqual({
      playerId: "left",
      timestamp: 180,
      previousState: "left-high",
      nextState: "right-high"
    });
  });

  it("debounces jitter so one swap does not spam repeated reps", () => {
    const counter = new RepCounter("right", PARTY_FORGIVING_SETTINGS);

    expect(counter.update([{ x: 0.55, y: 0.25 }, { x: 0.8, y: 0.7 }], 0)).toBeUndefined();
    expect(counter.update([{ x: 0.55, y: 0.72 }, { x: 0.8, y: 0.24 }], 180)).toBeDefined();
    expect(counter.update([{ x: 0.55, y: 0.26 }, { x: 0.8, y: 0.71 }], 240)).toBeUndefined();
  });

  it("pauses scoring and resets state when both hands are not visible", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    expect(counter.update([{ x: 0.2, y: 0.25 }, { x: 0.35, y: 0.7 }], 0)).toBeUndefined();
    expect(counter.getState()).toBe("left-high");

    expect(counter.update([{ x: 0.2, y: 0.25 }], 200)).toBeUndefined();
    expect(counter.getState()).toBe("unknown");

    expect(counter.update([{ x: 0.2, y: 0.72 }, { x: 0.35, y: 0.24 }], 360)).toBeUndefined();
  });
});
