import {
  FilesetResolver,
  HandLandmarker
} from "@mediapipe/tasks-vision";
import {
  PARTY_FORGIVING_SETTINGS,
  type DetectionSettings,
  type HandObservation,
  type PlayerTrackingState,
  type Point3D,
  type TrackingMetrics
} from "./types";
import { publicAssetUrl } from "../config/assets";
import { centerOfPalmLandmarks } from "./zones";
export { observationsFromResult } from "./handObservations";

export const MODEL_PATH = publicAssetUrl("models/hand_landmarker.task");
export const WASM_PATH = publicAssetUrl("wasm");

export type CoverProjection = {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
};

export function calculateCoverProjection(
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number
): CoverProjection {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      renderedWidth: canvasWidth,
      renderedHeight: canvasHeight,
      offsetX: 0,
      offsetY: 0
    };
  }

  const scale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;

  return {
    renderedWidth,
    renderedHeight,
    offsetX: (canvasWidth - renderedWidth) / 2,
    offsetY: (canvasHeight - renderedHeight) / 2
  };
}

export function projectPointToCover(point: Pick<Point3D, "x" | "y">, projection: CoverProjection) {
  return {
    x: projection.offsetX + point.x * projection.renderedWidth,
    y: projection.offsetY + point.y * projection.renderedHeight
  };
}


const sharedTrackerPromises = new Map<string, Promise<HandLandmarker>>();

function sharedTrackerKey(settings: DetectionSettings, numHands: number): string {
  return [
    numHands,
    settings.modelDetectionConfidence,
    settings.modelPresenceConfidence,
    settings.modelTrackingConfidence
  ].join(":");
}

export function preloadSharedHandLandmarker(
  settings: DetectionSettings = PARTY_FORGIVING_SETTINGS,
  numHands = 4
): void {
  void getSharedHandLandmarker(settings, numHands);
}

export function getSharedHandLandmarker(
  settings: DetectionSettings = PARTY_FORGIVING_SETTINGS,
  numHands = 4
): Promise<HandLandmarker> {
  const key = sharedTrackerKey(settings, numHands);
  const cached = sharedTrackerPromises.get(key);
  if (cached) {
    return cached;
  }

  const trackerPromise = createHandLandmarker(settings, numHands).catch((error) => {
    sharedTrackerPromises.delete(key);
    throw error;
  });
  sharedTrackerPromises.set(key, trackerPromise);
  return trackerPromise;
}

export async function createHandLandmarker(
  settings: DetectionSettings = PARTY_FORGIVING_SETTINGS,
  numHands = 4
): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

  try {
    return await createWithDelegate("GPU", vision, settings, numHands);
  } catch (gpuError) {
    console.warn("MediaPipe GPU delegate failed, falling back to CPU", gpuError);
    return createWithDelegate("CPU", vision, settings, numHands);
  }
}


export function drawHandOverlay(
  canvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
  observations: HandObservation[],
  playerStates: Record<"left" | "right", PlayerTrackingState>,
  debugOverlay: boolean,
  metrics?: TrackingMetrics,
  singlePlayerMode = false
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const projection = calculateCoverProjection(
    canvas.width,
    canvas.height,
    sourceWidth,
    sourceHeight
  );
  const markerRadius = Math.max(7, Math.min(15, canvas.width * 0.009));

  for (const observation of observations) {
    const color = singlePlayerMode
      ? "#e11d48"
      : observation.zone === "left" ? "#f43f5e" : observation.zone === "right" ? "#2563eb" : "#f59e0b";
    const palmCenter = centerOfPalmLandmarks(observation.landmarks);
    const projectedCenter = projectPointToCover(palmCenter, projection);

    context.fillStyle = color;
    context.beginPath();
    context.arc(projectedCenter.x, projectedCenter.y, markerRadius, 0, Math.PI * 2);
    context.fill();
  }

  if (!debugOverlay) {
    return;
  }

  drawDebugText(context, canvas, playerStates.left, 24, "#f43f5e");
  if (!singlePlayerMode) {
    drawDebugText(context, canvas, playerStates.right, canvas.width - 300, "#2563eb");
  }
  if (metrics) {
    drawMetricsText(context, canvas, metrics);
  }
}

async function createWithDelegate(
  delegate: "CPU" | "GPU",
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  settings: DetectionSettings,
  numHands: number
) {
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate
    },
    runningMode: "VIDEO",
    numHands,
    minHandDetectionConfidence: settings.modelDetectionConfidence,
    minHandPresenceConfidence: settings.modelPresenceConfidence,
    minTrackingConfidence: settings.modelTrackingConfidence
  });
}

function drawDebugText(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: PlayerTrackingState,
  x: number,
  color: string
): void {
  context.save();
  context.font = Math.max(14, canvas.width * 0.014) + "px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillStyle = color;
  context.shadowColor = "white";
  context.shadowBlur = 4;
  context.fillText(
    state.playerId.toUpperCase() + " hands:" + state.visibleHands + " state:" + state.swapState,
    x,
    36
  );
  if (state.invalidReason) {
    context.fillText(state.invalidReason, x, 62);
  }
  context.restore();
}

function drawMetricsText(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  metrics: TrackingMetrics
): void {
  const fontSize = Math.max(9, Math.min(14, canvas.width * 0.009));
  const lineHeight = fontSize * 1.4;
  const panelWidth = Math.min(canvas.width - 24, Math.max(480, canvas.width * 0.72));
  const panelHeight = lineHeight * 4 + 20;
  const x = (canvas.width - panelWidth) / 2;
  const y = canvas.height - panelHeight - 14;
  const left = metrics.diagnostics.left;
  const right = metrics.diagnostics.right;

  context.save();
  context.fillStyle = "rgba(17, 24, 39, 0.9)";
  context.fillRect(x, y, panelWidth, panelHeight);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.strokeRect(x, y, panelWidth, panelHeight);
  context.font = fontSize + "px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillStyle = "#ffffff";
  context.shadowBlur = 0;
  context.fillText(
    "CV " + metrics.processedFps.toFixed(1) + " | camera "
      + metrics.observedCameraFps.toFixed(1) + "/" + formatCameraFps(metrics.cameraFps)
      + " | " + metrics.averageInferenceMs.toFixed(1) + "ms",
    x + 10,
    y + lineHeight
  );
  context.fillText(
    metrics.runtimeMode.replace("-", " ") + " | " + metrics.performanceProfile
      + " " + metrics.cameraWidth + "x" + metrics.cameraHeight
      + " | hands " + metrics.detectedHands + " | busy " + metrics.busyFramesSkipped,
    x + 10,
    y + lineHeight * 2
  );
  context.fillText(
    "LEFT reps " + left.acceptedReps + " | reject " + left.debounceRejections
      + " | grace " + left.graceDropouts + (left.graceActive ? "*" : ""),
    x + 10,
    y + lineHeight * 3
  );
  context.fillText(
    "RIGHT reps " + right.acceptedReps + " | reject " + right.debounceRejections
      + " | grace " + right.graceDropouts + (right.graceActive ? "*" : ""),
    x + 10,
    y + lineHeight * 4
  );
  context.restore();
}
function formatCameraFps(cameraFps: number): string {
  return cameraFps > 0 ? cameraFps.toFixed(0) + "fps" : "?fps";
}
