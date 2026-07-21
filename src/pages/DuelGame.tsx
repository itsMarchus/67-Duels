import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bug, Camera, Home, Play, RotateCcw, UserRound, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { appendMatch, createMatchId, createMatchRecord } from "../arcade/records";
import { clearActivePlayers, type ActivePlayers } from "../arcade/players";
import { cameraErrorMessage, cameraSupportError, stopMediaStream } from "../cv/camera";
import { FrameMetricsTracker, shouldProcessVideoFrame } from "../cv/frameMetrics";
import { drawHandOverlay } from "../cv/handTracker";
import { createHandTrackingRuntime, type HandTrackingRuntime } from "../cv/trackingRuntime";
import { RepCounter } from "../cv/repCounter";
import {
  PARTY_FORGIVING_SETTINGS,
  type DetectionSettings,
  type PlayerId,
  type PlayerTrackingState,
  type RoundState
} from "../cv/types";
import { buildPlayerTrackingState } from "../cv/zones";
import { statesFromObservations } from "../cv/playerTracking";
import { createInitialRoundState, scoreRep, startCountdown, startPlaying, tickRound } from "../game/round";

type CameraStatus = "idle" | "requesting" | "ready" | "error";
type TrackerStatus = "idle" | "loading" | "ready" | "error";

const COUNTDOWN_SECONDS = 3;
const EMPTY_TRACKING: Record<PlayerId, PlayerTrackingState> = {
  left: buildPlayerTrackingState("left", []),
  right: buildPlayerTrackingState("right", [])
};

const MEME_LINES = [
  "67 IN 2026?!",
  "SIX SEVEN SPEEDRUN",
  "LEFT HAND? RIGHT HAND?",
  "CHAT IS THIS REAL",
  "CERTIFIED 67 MOMENT",
  "TOO MUCH AURA",
  "LOCAL DUEL ARC",
  "HAND TRACKED MAYHEM"
];

const STICKER_LAYOUT = [
  { top: "7%", left: "4%", rotate: "-8deg" },
  { top: "10%", right: "6%", rotate: "7deg" },
  { bottom: "16%", left: "8%", rotate: "10deg" },
  { bottom: "13%", right: "5%", rotate: "-10deg" },
  { top: "45%", left: "2%", rotate: "-3deg" },
  { top: "42%", right: "2%", rotate: "4deg" }
];

export function DuelGame({ players }: { players: ActivePlayers }) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<HandTrackingRuntime | null>(null);
  const fallbackFrameRef = useRef<number>();
  const videoFrameCallbackRef = useRef<number>();
  const timerFrameRef = useRef<number>();
  const metricsRef = useRef(new FrameMetricsTracker());
  const cameraRequestIdRef = useRef(0);
  const cameraFpsRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const roundRef = useRef<RoundState>(createInitialRoundState());
  const settingsRef = useRef<DetectionSettings>(PARTY_FORGIVING_SETTINGS);
  const countdownTimersRef = useRef<number[]>([]);
  const activeMatchIdRef = useRef<string>();
  const savedMatchIdRef = useRef<string>();
  const countersRef = useRef<Record<PlayerId, RepCounter>>({
    left: new RepCounter("left", PARTY_FORGIVING_SETTINGS),
    right: new RepCounter("right", PARTY_FORGIVING_SETTINGS)
  });

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("requesting");
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [round, setRound] = useState<RoundState>(() => createInitialRoundState());
  const [countdownLeft, setCountdownLeft] = useState<number | null>(null);
  const [playerStates, setPlayerStates] = useState<Record<PlayerId, PlayerTrackingState>>(EMPTY_TRACKING);
  const [settings, setSettings] = useState<DetectionSettings>(PARTY_FORGIVING_SETTINGS);
  const [memeTick, setMemeTick] = useState(0);

  roundRef.current = round;
  settingsRef.current = settings;

  const bothPlayersReady = playerStates.left.visibleHands >= 2 && playerStates.right.visibleHands >= 2;
  const canStart = cameraStatus === "ready"
    && trackerStatus === "ready"
    && round.phase !== "countdown"
    && round.phase !== "playing";

  const statusText = useMemo(() => {
    if (cameraStatus === "idle") return "camera offline";
    if (cameraStatus === "requesting") return "camera waking up";
    if (trackerStatus === "loading") return "hand model loading";
    if (round.phase === "countdown") return "get set";
    if (round.phase === "playing") return "67 now";
    if (round.phase === "results") return "round complete";
    return bothPlayersReady ? "both players locked" : "show both hands";
  }, [bothPlayersReady, cameraStatus, round.phase, trackerStatus]);

  const startCamera = useCallback(async () => {
    const supportError = cameraSupportError(
      window.isSecureContext,
      window.location.hostname,
      navigator.mediaDevices
    );
    if (supportError || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setTrackerStatus("error");
      setErrorMessage(supportError ?? "This browser cannot access a webcam.");
      return;
    }

    const requestId = ++cameraRequestIdRef.current;
    const mediaDevices = navigator.mediaDevices;
    const video = videoRef.current;
    if (!video) {
      setCameraStatus("error");
      setTrackerStatus("error");
      setErrorMessage("The camera display is not ready. Reload the page and try again.");
      return;
    }

    setCameraStatus("requesting");
    setTrackerStatus("loading");
    setErrorMessage(undefined);
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    video.srcObject = null;

    let stream: MediaStream | undefined;
    try {
      stream = await mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60, max: 60 },
          facingMode: "user"
        }
      });

      if (requestId !== cameraRequestIdRef.current) {
        stopMediaStream(stream);
        return;
      }

      streamRef.current = stream;
      cameraFpsRef.current = stream.getVideoTracks()[0]?.getSettings().frameRate ?? 0;
      metricsRef.current.reset();
      video.srcObject = stream;
      await video.play();
      setCameraStatus("ready");
      setRound((current) => current.phase === "cameraSetup" ? { ...current, phase: "readyCheck" } : current);

      const tracker = await createHandTrackingRuntime(settingsRef.current);
      if (requestId !== cameraRequestIdRef.current) {
        tracker.close();
        stopMediaStream(stream);
        return;
      }

      trackerRef.current = tracker;
      setTrackerStatus("ready");

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current !== stream) {
          return;
        }

        cameraRequestIdRef.current += 1;
        stopMediaStream(stream);
        streamRef.current = null;
        trackerRef.current?.close();
        trackerRef.current = null;
        video.srcObject = null;
        setCameraStatus("error");
        setTrackerStatus("idle");
        setErrorMessage("The webcam disconnected. Reconnect it, then retry the camera.");
      }, { once: true });
    } catch (error) {
      if (requestId !== cameraRequestIdRef.current) {
        stopMediaStream(stream);
        return;
      }

      stopMediaStream(stream);
      streamRef.current = null;
      trackerRef.current?.close();
      trackerRef.current = null;
      video.srcObject = null;
      setCameraStatus("error");
      setTrackerStatus("error");
      setErrorMessage(cameraErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const startupTimer = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => window.clearTimeout(startupTimer);
  }, [startCamera]);

  const resetRound = useCallback(() => {
    for (const timer of countdownTimersRef.current) {
      window.clearTimeout(timer);
    }
    countdownTimersRef.current = [];
    activeMatchIdRef.current = undefined;
    countersRef.current.left.reset();
    countersRef.current.right.reset();
    setCountdownLeft(null);
    setRound(cameraStatus === "ready" ? { ...createInitialRoundState(), phase: "readyCheck" } : createInitialRoundState());
  }, [cameraStatus]);

  const startDuel = useCallback(() => {
    if (!canStart) {
      return;
    }

    resetRound();
    activeMatchIdRef.current = createMatchId();
    savedMatchIdRef.current = undefined;
    countersRef.current.left.reset();
    countersRef.current.right.reset();
    const now = performance.now();
    setCountdownLeft(COUNTDOWN_SECONDS);
    setRound(startCountdown(createInitialRoundState(), now));

    countdownTimersRef.current = [1, 2, 3].map((second) =>
      window.setTimeout(() => {
        const remaining = COUNTDOWN_SECONDS - second;
        setCountdownLeft(remaining > 0 ? remaining : null);
        if (remaining === 0) {
          setRound((current) => startPlaying(current, performance.now()));
        }
      }, second * 1000)
    );
  }, [canStart, resetRound]);

  const leaveForHome = useCallback(() => {
    const active = roundRef.current.phase === "playing" || roundRef.current.phase === "countdown";
    if (active && !window.confirm("Leave this active duel? The unfinished round will not be recorded.")) {
      return;
    }

    navigate("/");
  }, [navigate]);

  const chooseNewPlayers = useCallback(() => {
    clearActivePlayers();
    navigate("/?setup=1");
  }, [navigate]);

  useEffect(() => {
    if (round.phase !== "results" || !round.winner || !activeMatchIdRef.current) {
      return;
    }

    const matchId = activeMatchIdRef.current;
    if (savedMatchIdRef.current === matchId) {
      return;
    }

    try {
      appendMatch(createMatchRecord(matchId, players, round.scores, round.winner));
    } catch {
      setErrorMessage("Round complete, but this browser could not save the match record.");
    }
    savedMatchIdRef.current = matchId;
  }, [players, round.phase, round.scores, round.winner]);

  useEffect(() => {
    const timer = window.setInterval(() => setMemeTick((value) => value + 1), 1800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) {
        return;
      }

      const rect = video.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [cameraStatus]);

  useEffect(() => {
    if (trackerStatus !== "ready") {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      return;
    }

    let cancelled = false;
    let lastVideoTime = -1;
    let lastTrackingRenderAt = Number.NEGATIVE_INFINITY;

    const processFrame = (timestamp: number) => {
      const tracker = trackerRef.current;
      if (!tracker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      if (!shouldProcessVideoFrame(video.currentTime, lastVideoTime)) {
        metricsRef.current.recordSkippedFrame();
        return;
      }
      lastVideoTime = video.currentTime;

      if (tracker.busy) {
        metricsRef.current.recordSkippedFrame();
        return;
      }

      void tracker.processFrame(video, timestamp).then((frame) => {
        if (cancelled || !frame) {
          return;
        }

        const nextObservations = frame.observations;
        const rawStates = statesFromObservations(nextObservations);
        const currentRound = roundRef.current;

        if (currentRound.phase === "playing") {
          for (const playerId of ["left", "right"] as const) {
            const counter = countersRef.current[playerId];
            const event = counter.update(rawStates[playerId].handCenters, frame.timestamp);
            if (event) {
              setRound((activeRound) => scoreRep(activeRound, playerId));
            }
          }
        }

        const nextStates = {
          left: { ...rawStates.left, swapState: countersRef.current.left.getState() },
          right: { ...rawStates.right, swapState: countersRef.current.right.getState() }
        };

        metricsRef.current.recordFrame(frame.timestamp, frame.inferenceMs, nextObservations.length);
        if (frame.timestamp - lastTrackingRenderAt >= 50) {
          setPlayerStates(nextStates);
          lastTrackingRenderAt = frame.timestamp;
        }

        drawHandOverlay(
          canvas,
          nextObservations,
          nextStates,
          settingsRef.current.debugOverlay,
          metricsRef.current.snapshot(cameraFpsRef.current, {
            left: countersRef.current.left.getDiagnostics(),
            right: countersRef.current.right.getDiagnostics()
          })
        );
      }).catch((error) => {
        if (cancelled) {
          return;
        }
        setTrackerStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Hand tracking stopped unexpectedly.");
      });
    };

    const scheduleNextFrame = () => {
      if (cancelled) {
        return;
      }

      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrameCallbackRef.current = video.requestVideoFrameCallback((timestamp) => {
          processFrame(timestamp);
          scheduleNextFrame();
        });
        return;
      }

      fallbackFrameRef.current = window.requestAnimationFrame((timestamp) => {
        processFrame(timestamp);
        scheduleNextFrame();
      });
    };

    scheduleNextFrame();

    return () => {
      cancelled = true;
      if (videoFrameCallbackRef.current !== undefined && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      if (fallbackFrameRef.current !== undefined) {
        window.cancelAnimationFrame(fallbackFrameRef.current);
      }
    };
  }, [trackerStatus]);

  useEffect(() => {
    if (round.phase !== "playing") {
      return;
    }

    const updateTimer = (timestamp: number) => {
      setRound((current) => tickRound(current, timestamp));
      timerFrameRef.current = window.requestAnimationFrame(updateTimer);
    };

    timerFrameRef.current = window.requestAnimationFrame(updateTimer);
    return () => {
      if (timerFrameRef.current !== undefined) {
        window.cancelAnimationFrame(timerFrameRef.current);
      }
    };
  }, [round.phase]);
  useEffect(() => {
    return () => {
      for (const timer of countdownTimersRef.current) {
        window.clearTimeout(timer);
      }
      cameraRequestIdRef.current += 1;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, []);

  return (
    <main className="duel-shell">
      <section className={"arena arena-" + round.phase} aria-label="67 duel arena">
        <video ref={videoRef} className="camera-feed" muted playsInline />
        <canvas ref={canvasRef} className="hand-overlay" />
        <div className="lane lane-left" />
        <div className="lane lane-right" />
        <div className="center-split" />
        <div className="meme-layer" aria-hidden="true">
          {STICKER_LAYOUT.map((position, index) => (
            <span
              className="text-sticker"
              key={(position.top ?? position.bottom) + "-" + index}
              style={position}
            >
              {MEME_LINES[(index + memeTick) % MEME_LINES.length]}
            </span>
          ))}
        </div>

        <header className="top-bar">
          <div className="brand-lockup">
            <span className="brand-number">67</span>
            <span className="brand-text">DUELS</span>
          </div>
          <div className="status-pill">{statusText}</div>
          <div className="game-nav-actions">
            <button className="icon-button" type="button" aria-label="Return home" title="Home" onClick={leaveForHome}>
              <Home size={19} />
            </button>
            <button
              className={"icon-button " + (settings.debugOverlay ? "active" : "")}
              type="button"
              aria-label="Toggle debug overlay"
              title="Toggle debug overlay"
              onClick={() => setSettings((current) => ({ ...current, debugOverlay: !current.debugOverlay }))}
            >
              <Bug size={19} />
            </button>
          </div>
        </header>

        <PlayerHud side="left" name={players.left} score={round.scores.left} state={playerStates.left} />
        <PlayerHud side="right" name={players.right} score={round.scores.right} state={playerStates.right} />

        <div className="timer-stack">
          <div className="timer-label">{round.phase === "playing" ? "SECONDS" : "ROUND"}</div>
          <div className="timer-value">{round.phase === "countdown" ? countdownLeft ?? "GO" : round.remainingTime}</div>
          <div className="timer-caption">30 SEC SPRINT</div>
        </div>

        {round.phase === "results" && (
          <div className="winner-banner">
            <span>{winnerText(round.winner, players)}</span>
            <strong>{round.scores.left} - {round.scores.right}</strong>
            <div className="result-actions">
              <button type="button" onClick={startDuel} disabled={!canStart}><RotateCcw size={18} /> Rematch</button>
              <button type="button" onClick={chooseNewPlayers}><UserRound size={18} /> New players</button>
              <button type="button" onClick={leaveForHome}><Home size={18} /> Home</button>
            </div>
            {errorMessage && <div className="result-notice" role="alert">{errorMessage}</div>}
          </div>
        )}

        {round.phase === "countdown" && <div className="countdown-blast">{countdownLeft ?? "GO"}</div>}
        {errorMessage && round.phase !== "results" && <div className="error-toast" role="alert">{errorMessage}</div>}

        {round.phase !== "results" && (
          <div className="control-dock">
            {cameraStatus !== "ready" ? (
              <button className="control-button primary" type="button" onClick={startCamera} disabled={cameraStatus === "requesting"}>
                {cameraStatus === "requesting" ? <Video size={20} /> : <Camera size={20} />}
                {cameraStatus === "requesting" ? "Opening" : cameraStatus === "error" ? "Retry camera" : "Camera"}
              </button>
            ) : (
              <button className="control-button primary" type="button" onClick={startDuel} disabled={!canStart}>
                <Play size={20} />
                Start
              </button>
            )}
            <button className="control-button" type="button" onClick={resetRound}>
              <RotateCcw size={20} />
              Reset
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerHud({ side, name, score, state }: { side: PlayerId; name: string; score: number; state: PlayerTrackingState }) {
  const ready = state.visibleHands >= 2;
  const lane = side === "left" ? "PLAYER 1 / LEFT" : "PLAYER 2 / RIGHT";

  return (
    <aside className={"player-hud player-hud-" + side}>
      <div className="player-label">{lane}</div>
      <div className="player-name" title={name}>{name}</div>
      <div className="score-number">{score}</div>
      <div className={"ready-badge " + (ready ? "ready" : "not-ready")}>
        {ready ? "LOCKED" : state.invalidReason?.toUpperCase() ?? "WAITING"}
      </div>
      <div className="swap-state">{state.swapState.replace("-", " ").toUpperCase()}</div>
    </aside>
  );
}

export function winnerText(winner: RoundState["winner"], players: ActivePlayers): string {
  if (winner === "left") {
    return players.left.toUpperCase() + " WINS";
  }

  if (winner === "right") {
    return players.right.toUpperCase() + " WINS";
  }

  return "TIE: DOUBLE 67";
}
