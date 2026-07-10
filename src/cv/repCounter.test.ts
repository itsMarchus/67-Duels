import { describe, expect, it } from "vitest";
import { RepCounter } from "./repCounter";
import { PARTY_FORGIVING_SETTINGS } from "./types";
import type { HandCenter } from "./types";

const LEFT_HIGH: HandCenter[] = [{ x: 0.2, y: 0.25 }, { x: 0.35, y: 0.7 }];
const RIGHT_HIGH: HandCenter[] = [{ x: 0.2, y: 0.72 }, { x: 0.35, y: 0.24 }];
const NEUTRAL: HandCenter[] = [{ x: 0.2, y: 0.49 }, { x: 0.35, y: 0.51 }];

describe("RepCounter", () => {
  it("counts observed reversals 80 ms apart", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    expect(counter.update(LEFT_HIGH, 0)).toBeUndefined();
    expect(counter.update(RIGHT_HIGH, 80)).toMatchObject({
      previousState: "left-high",
      nextState: "right-high"
    });
    expect(counter.update(LEFT_HIGH, 160)).toMatchObject({
      previousState: "right-high",
      nextState: "left-high"
    });
  });

  it("supports fast synthetic 30 FPS and 60 FPS gesture sequences", () => {
    const sixtyFpsCounter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);
    const thirtyFpsCounter = new RepCounter("right", PARTY_FORGIVING_SETTINGS);

    expect(countSequence(sixtyFpsCounter, 83, 12)).toBe(12);
    expect(countSequence(thirtyFpsCounter, 99, 10)).toBe(10);
  });

  it("rejects a reversal inside debounce without corrupting the next valid state", () => {
    const counter = new RepCounter("right", PARTY_FORGIVING_SETTINGS);

    counter.update(LEFT_HIGH, 0);
    expect(counter.update(RIGHT_HIGH, 80)).toBeDefined();
    expect(counter.update(LEFT_HIGH, 140)).toBeUndefined();
    expect(counter.update(RIGHT_HIGH, 220)).toBeDefined();

    expect(counter.getDiagnostics()).toMatchObject({
      acceptedReps: 2,
      debounceRejections: 1
    });
  });

  it("keeps the previous stable state through neutral transition frames", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    counter.update(LEFT_HIGH, 0);
    expect(counter.update(NEUTRAL, 40)).toBeUndefined();
    expect(counter.getState()).toBe("left-high");
    expect(counter.update(RIGHT_HIGH, 80)).toBeDefined();
  });

  it("preserves state through a brief missing-hand dropout and counts one reversal", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    counter.update(LEFT_HIGH, 0);
    expect(counter.update([LEFT_HIGH[0]], 90)).toBeUndefined();
    expect(counter.getState()).toBe("left-high");
    expect(counter.getDiagnostics().graceActive).toBe(true);

    expect(counter.update(RIGHT_HIGH, 170)).toBeDefined();
    expect(counter.getDiagnostics()).toMatchObject({
      acceptedReps: 1,
      graceDropouts: 1,
      graceActive: false
    });
  });

  it("resets after the dropout grace period and cannot award a stale reversal", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    counter.update(LEFT_HIGH, 0);
    counter.update([], 90);
    expect(counter.update(RIGHT_HIGH, 200)).toBeUndefined();
    expect(counter.getState()).toBe("right-high");
  });

  it("resets diagnostics with the counter", () => {
    const counter = new RepCounter("left", PARTY_FORGIVING_SETTINGS);

    counter.update(LEFT_HIGH, 0);
    counter.update([], 90);
    counter.update(RIGHT_HIGH, 170);
    counter.reset();

    expect(counter.getState()).toBe("unknown");
    expect(counter.getDiagnostics()).toEqual({
      acceptedReps: 0,
      debounceRejections: 0,
      graceDropouts: 0,
      graceActive: false
    });
  });
});

function countSequence(counter: RepCounter, intervalMs: number, reversals: number): number {
  counter.update(LEFT_HIGH, 0);
  let count = 0;

  for (let index = 1; index <= reversals; index += 1) {
    const state = index % 2 === 1 ? RIGHT_HIGH : LEFT_HIGH;
    if (counter.update(state, index * intervalMs)) {
      count += 1;
    }
  }

  return count;
}
