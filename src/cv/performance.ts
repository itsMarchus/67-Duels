import type { TrackingMetrics } from "./types";

export type CameraPerformanceProfile = "balanced" | "performance";

export type CameraProfile = {
  id: CameraPerformanceProfile;
  width: number;
  height: number;
};

export const CAMERA_PROFILES: Record<CameraPerformanceProfile, CameraProfile> = {
  balanced: {
    id: "balanced",
    width: 960,
    height: 540
  },
  performance: {
    id: "performance",
    width: 640,
    height: 360
  }
};

export const DEFAULT_CAMERA_PROFILE: CameraPerformanceProfile = "balanced";

export function cameraConstraints(profileId: CameraPerformanceProfile): MediaTrackConstraints {
  const profile = CAMERA_PROFILES[profileId];

  return {
    width: { ideal: profile.width, max: profile.width },
    height: { ideal: profile.height, max: profile.height },
    frameRate: { ideal: 60, max: 60 },
    facingMode: "user"
  };
}

export function shouldUsePerformanceProfile(
  metrics: TrackingMetrics,
  currentProfile: CameraPerformanceProfile
): boolean {
  if (currentProfile === "performance"
    || metrics.sampleWindowMs < 700
    || metrics.observedCameraFps < 12
    || metrics.processedFps <= 0) {
    return false;
  }

  const targetFps = Math.min(60, metrics.observedCameraFps);
  const frameBudgetMs = 1000 / targetFps;
  const throughputRatio = metrics.processedFps / targetFps;

  return metrics.averageInferenceMs > frameBudgetMs * 0.82 || throughputRatio < 0.78;
}

export function setMotionContentHint(track: MediaStreamTrack): void {
  try {
    track.contentHint = "motion";
  } catch {
    // Some browsers expose contentHint as read-only or reject camera hints.
  }
}
