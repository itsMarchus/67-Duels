import { describe, expect, it } from "vitest";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  calculateCoverProjection,
  observationsFromResult,
  projectPointToCover
} from "./handTracker";

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
    expect(observationsFromResult(result, false)[0]).not.toHaveProperty("worldLandmarks");
  });
});

describe("hand overlay cover projection", () => {
  it("matches horizontal cropping when a wide camera fills a square arena", () => {
    const projection = calculateCoverProjection(900, 900, 1600, 900);

    expect(projection).toEqual({
      renderedWidth: 1600,
      renderedHeight: 900,
      offsetX: -350,
      offsetY: 0
    });
    expect(projectPointToCover({ x: 0.5, y: 0.5 }, projection)).toEqual({
      x: 450,
      y: 450
    });
    expect(projectPointToCover({ x: 0, y: 0.5 }, projection).x).toBe(-350);
    expect(projectPointToCover({ x: 1, y: 0.5 }, projection).x).toBe(1250);
  });

  it("matches vertical cropping when a portrait camera fills a wide arena", () => {
    const projection = calculateCoverProjection(1600, 900, 900, 1600);
    const center = projectPointToCover({ x: 0.5, y: 0.5 }, projection);

    expect(projection.renderedWidth).toBeCloseTo(1600);
    expect(projection.renderedHeight).toBeCloseTo(2844.444);
    expect(projection.offsetX).toBeCloseTo(0);
    expect(projection.offsetY).toBeCloseTo(-972.222);
    expect(center.x).toBeCloseTo(800);
    expect(center.y).toBeCloseTo(450);
  });

  it("uses direct canvas coordinates until camera dimensions are available", () => {
    expect(calculateCoverProjection(800, 600, 0, 0)).toEqual({
      renderedWidth: 800,
      renderedHeight: 600,
      offsetX: 0,
      offsetY: 0
    });
  });
});
