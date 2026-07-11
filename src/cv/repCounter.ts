import type {
  DetectionSettings,
  HandCenter,
  PlayerId,
  RepDiagnostics,
  RepEvent,
  SwapState
} from "./types";

export class RepCounter {
  private swapState: SwapState = "unknown";
  private lastRepAt = Number.NEGATIVE_INFINITY;
  private lastTwoHandsAt = Number.NEGATIVE_INFINITY;
  private diagnostics: RepDiagnostics = emptyDiagnostics();

  constructor(
    public readonly playerId: PlayerId,
    public readonly settings: DetectionSettings
  ) {}

  update(handCenters: HandCenter[], timestamp: number): RepEvent | undefined {
    if (handCenters.length < 2) {
      const withinGrace = Number.isFinite(this.lastTwoHandsAt)
        && timestamp - this.lastTwoHandsAt <= this.settings.dropoutGraceMs;

      if (withinGrace) {
        if (!this.diagnostics.graceActive) {
          this.diagnostics.graceDropouts += 1;
        }
        this.diagnostics.graceActive = true;
        return undefined;
      }

      this.swapState = "unknown";
      this.diagnostics.graceActive = false;
      return undefined;
    }

    if (Number.isFinite(this.lastTwoHandsAt)
      && timestamp - this.lastTwoHandsAt > this.settings.dropoutGraceMs) {
      this.swapState = "unknown";
    }
    this.lastTwoHandsAt = timestamp;
    this.diagnostics.graceActive = false;

    const [firstHand, secondHand] = [...handCenters].sort((a, b) => a.x - b.x);
    const nextState = classifySwapState(firstHand, secondHand, this.settings.verticalThreshold);

    if (nextState === "neutral") {
      return undefined;
    }

    const previousState = this.swapState;
    this.swapState = nextState;

    const changedDirection =
      previousState !== "unknown" && previousState !== "neutral" && previousState !== nextState;
    const outsideDebounce = timestamp - this.lastRepAt >= this.settings.debounceMs;

    if (!changedDirection || !outsideDebounce) {
      if (changedDirection && !outsideDebounce) {
        this.diagnostics.debounceRejections += 1;
      }
      return undefined;
    }

    this.lastRepAt = timestamp;
    this.diagnostics.acceptedReps += 1;

    return {
      playerId: this.playerId,
      timestamp,
      previousState,
      nextState
    };
  }

  getState(): SwapState {
    return this.swapState;
  }

  getDiagnostics(): RepDiagnostics {
    return { ...this.diagnostics };
  }

  reset(): void {
    this.swapState = "unknown";
    this.lastRepAt = Number.NEGATIVE_INFINITY;
    this.lastTwoHandsAt = Number.NEGATIVE_INFINITY;
    this.diagnostics = emptyDiagnostics();
  }
}

function emptyDiagnostics(): RepDiagnostics {
  return {
    acceptedReps: 0,
    debounceRejections: 0,
    graceDropouts: 0,
    graceActive: false
  };
}

function classifySwapState(leftHand: HandCenter, rightHand: HandCenter, threshold: number): SwapState {
  const verticalDelta = leftHand.y - rightHand.y;

  if (Math.abs(verticalDelta) < threshold) {
    return "neutral";
  }

  return verticalDelta < 0 ? "left-high" : "right-high";
}
