import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Swords, UserRound, Users, X } from "lucide-react";
import { playerNameError } from "../arcade/players";
import type { ActiveGameSession } from "../arcade/session";
import { ModalFrame } from "./ModalFrame";

type PlayerSetupDialogProps = {
  errorMessage?: string;
  initialSession?: ActiveGameSession;
  onClose: () => void;
  onSubmit: (session: ActiveGameSession) => void;
};

export function PlayerSetupDialog({ errorMessage, initialSession, onClose, onSubmit }: PlayerSetupDialogProps) {
  const [mode, setMode] = useState<ActiveGameSession["mode"]>(initialSession?.mode ?? "duel");
  const [soloName, setSoloName] = useState(initialSession?.mode === "solo" ? initialSession.player : "");
  const [left, setLeft] = useState(initialSession?.mode === "duel" ? initialSession.players.left : "");
  const [right, setRight] = useState(initialSession?.mode === "duel" ? initialSession.players.right : "");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMode(initialSession?.mode ?? "duel");
    setSoloName(initialSession?.mode === "solo" ? initialSession.player : "");
    setLeft(initialSession?.mode === "duel" ? initialSession.players.left : "");
    setRight(initialSession?.mode === "duel" ? initialSession.players.right : "");
    setSubmitted(false);
  }, [initialSession]);

  const soloError = submitted && mode === "solo" ? playerNameError(soloName) : undefined;
  const leftError = submitted && mode === "duel" ? playerNameError(left) : undefined;
  const rightError = submitted && mode === "duel" ? playerNameError(right) : undefined;

  const selectMode = (nextMode: ActiveGameSession["mode"]) => {
    setMode(nextMode);
    setSubmitted(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (mode === "solo") {
      if (playerNameError(soloName)) {
        return;
      }

      onSubmit({ mode: "solo", player: soloName.trim() });
      return;
    }

    if (playerNameError(left) || playerNameError(right)) {
      return;
    }

    onSubmit({ mode: "duel", players: { left: left.trim(), right: right.trim() } });
  };

  return (
    <ModalFrame className="setup-dialog" labelledBy="setup-title" onClose={onClose}>
      <button className="modal-close icon-button" type="button" onClick={onClose} aria-label="Close player setup" title="Close">
        <X size={20} />
      </button>
      <div className="modal-eyebrow"><Swords size={18} /> CHOOSE YOUR CHAOS</div>
      <h2 id="setup-title">{mode === "solo" ? "Ready to chase the board?" : "Who is entering the arena?"}</h2>

      <div className="setup-mode-switch" role="group" aria-label="Game mode">
        <button type="button" className={mode === "solo" ? "active solo" : ""} aria-pressed={mode === "solo"} onClick={() => selectMode("solo")}>
          <UserRound size={20} /> Solo
          <small>Global Top 50</small>
        </button>
        <button type="button" className={mode === "duel" ? "active duel" : ""} aria-pressed={mode === "duel"} onClick={() => selectMode("duel")}>
          <Users size={20} /> Duel
          <small>Two players</small>
        </button>
      </div>

      <p className="setup-copy">
        {mode === "solo"
          ? "No login. Your name and final score join the public Solo leaderboard; camera video never leaves this device."
          : "Names appear on the local scoreboard. Same names are allowed and every run gets its own record."}
      </p>

      <form className={"player-form " + (mode === "solo" ? "player-form-solo" : "")} onSubmit={handleSubmit} noValidate>
        {mode === "solo" ? (
          <label className="player-name-field player-name-solo">
            <span>Player name</span>
            <input
              data-autofocus
              type="text"
              value={soloName}
              maxLength={18}
              autoComplete="nickname"
              placeholder="Enter name"
              aria-invalid={Boolean(soloError)}
              aria-describedby={soloError ? "solo-name-error" : undefined}
              onChange={(event) => setSoloName(event.target.value)}
            />
            <small id="solo-name-error">{soloError ?? soloName.trim().length + "/18"}</small>
          </label>
        ) : (
          <>
            <label className="player-name-field player-name-left">
              <span>Player 1 / Left lane</span>
              <input
                data-autofocus
                type="text"
                value={left}
                maxLength={18}
                autoComplete="off"
                placeholder="Enter name"
                aria-invalid={Boolean(leftError)}
                aria-describedby={leftError ? "left-name-error" : undefined}
                onChange={(event) => setLeft(event.target.value)}
              />
              <small id="left-name-error">{leftError ?? left.trim().length + "/18"}</small>
            </label>

            <div className="setup-vs">VS</div>

            <label className="player-name-field player-name-right">
              <span>Player 2 / Right lane</span>
              <input
                type="text"
                value={right}
                maxLength={18}
                autoComplete="off"
                placeholder="Enter name"
                aria-invalid={Boolean(rightError)}
                aria-describedby={rightError ? "right-name-error" : undefined}
                onChange={(event) => setRight(event.target.value)}
              />
              <small id="right-name-error">{rightError ?? right.trim().length + "/18"}</small>
            </label>
          </>
        )}

        <button className="landing-button landing-button-primary setup-submit" type="submit">
          {mode === "solo" ? "Enter solo run" : "Enter arena"} <ArrowRight size={20} />
        </button>
        {errorMessage && <p className="setup-error" role="alert">{errorMessage}</p>}
      </form>
    </ModalFrame>
  );
}
