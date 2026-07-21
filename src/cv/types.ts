export type PlayerId = "left" | "right";
export type Zone = PlayerId | "center";
export type SwapState = "left-high" | "right-high" | "neutral" | "unknown";
export type RoundPhase = "cameraSetup" | "readyCheck" | "countdown" | "playing" | "results";

export type Point3D = {
  x: number;
  y: number;
  z?: number;
};

export type HandObservation = {
  landmarks: Point3D[];
  worldLandmarks?: Point3D[];
  handedness: "Left" | "Right" | "Unknown";
  handednessConfidence: number;
  zone: Zone;
};

export type HandCenter = {
  x: number;
  y: number;
};

export type PlayerTrackingState = {
  playerId: PlayerId;
  visibleHands: number;
  handCenters: HandCenter[];
  swapState: SwapState;
  confidence: number;
  invalidReason?: string;
};

export type RepEvent = {
  playerId: PlayerId;
  timestamp: number;
  previousState: SwapState;
  nextState: SwapState;
};

export type RepDiagnostics = {
  acceptedReps: number;
  debounceRejections: number;
  graceDropouts: number;
  graceActive: boolean;
};

export type TrackingMetrics = {
  processedFps: number;
  observedCameraFps: number;
  averageInferenceMs: number;
  detectedHands: number;
  cameraFps: number;
  cameraWidth: number;
  cameraHeight: number;
  sampleWindowMs: number;
  duplicateFramesSkipped: number;
  busyFramesSkipped: number;
  runtimeMode: "worker-gpu" | "worker-cpu" | "main-thread";
  performanceProfile: "balanced" | "performance";
  diagnostics: Record<PlayerId, RepDiagnostics>;
};
export type RoundState = {
  phase: RoundPhase;
  remainingTime: number;
  scores: Record<PlayerId, number>;
  winner?: PlayerId | "tie";
  startedAt?: number;
  endedAt?: number;
};

export type DetectionSettings = {
  verticalThreshold: number;
  debounceMs: number;
  dropoutGraceMs: number;
  modelDetectionConfidence: number;
  modelPresenceConfidence: number;
  modelTrackingConfidence: number;
  debugOverlay: boolean;
};

export const PARTY_FORGIVING_SETTINGS: DetectionSettings = {
  verticalThreshold: 0.04,
  debounceMs: 80,
  dropoutGraceMs: 180,
  modelDetectionConfidence: 0.35,
  modelPresenceConfidence: 0.35,
  modelTrackingConfidence: 0.3,
  debugOverlay: false
};
