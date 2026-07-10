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
  confidence: number;
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
  minConfidence: number;
  debugOverlay: boolean;
};

export const PARTY_FORGIVING_SETTINGS: DetectionSettings = {
  verticalThreshold: 0.055,
  debounceMs: 135,
  minConfidence: 0.42,
  debugOverlay: true
};
