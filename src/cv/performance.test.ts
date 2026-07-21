import { describe, expect, it } from "vitest";
import {
  cameraConstraints,
  shouldUsePerformanceProfile
} from "./performance";
import type { TrackingMetrics } from "./types";

const baseMetrics: TrackingMetrics = {
  processedFps: 55,
  observedCameraFps: 60,
  averageInferenceMs: 12,
  detectedHands: 4,
  cameraFps: 60,
  cameraWidth: 960,
  cameraHeight: 540,
  sampleWindowMs: 1000,
  duplicateFramesSkipped: 0,
  busyFramesSkipped: 2,
  runtimeMode: "worker-gpu",
  performanceProfile: "balanced",
  diagnostics: {
    left: { acceptedReps: 0, debounceRejections: 0, graceDropouts: 0, graceActive: false },
    right: { acceptedReps: 0, debounceRejections: 0, graceDropouts: 0, graceActive: false }
  }
};

describe("camera performance profiles", () => {
  it("caps the balanced capture size while still requesting 60 FPS", () => {
    expect(cameraConstraints("balanced")).toEqual({
      width: { ideal: 960, max: 960 },
      height: { ideal: 540, max: 540 },
      frameRate: { ideal: 60, max: 60 },
      facingMode: "user"
    });
  });

  it("downgrades when inference cannot keep up with a 60 FPS source", () => {
    expect(shouldUsePerformanceProfile({
      ...baseMetrics,
      processedFps: 30,
      averageInferenceMs: 25
    }, "balanced")).toBe(true);
  });

  it("keeps balanced quality when throughput is healthy at 30 or 60 FPS", () => {
    expect(shouldUsePerformanceProfile(baseMetrics, "balanced")).toBe(false);
    expect(shouldUsePerformanceProfile({
      ...baseMetrics,
      cameraFps: 30,
      observedCameraFps: 30,
      processedFps: 29,
      averageInferenceMs: 20
    }, "balanced")).toBe(false);
  });

  it("waits for a useful sample and never repeats a downgrade", () => {
    expect(shouldUsePerformanceProfile({
      ...baseMetrics,
      sampleWindowMs: 500,
      processedFps: 20
    }, "balanced")).toBe(false);
    expect(shouldUsePerformanceProfile({
      ...baseMetrics,
      processedFps: 20
    }, "performance")).toBe(false);
  });
});
