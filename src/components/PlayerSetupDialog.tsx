import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Swords, X } from "lucide-react";
import { playerNameError, type ActivePlayers } from "../arcade/players";
import { ModalFrame } from "./ModalFrame";

type PlayerSetupDialogProps = {
  initialPlayers?: ActivePlayers;
  onClose: () => void;
  onSubmit: (players: ActivePlayers) => void;
};

export function PlayerSetupDialog({ initialPlayers, onClose, onSubmit }: PlayerSetupDialogProps) {
  const [left, setLeft] = useState(initialPlayers?.left ?? "");
  const [right, setRight] = useState(initialPlayers?.right ?? "");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLeft(initialPlayers?.left ?? "");
    setRight(initialPlayers?.right ?? "");
    setSubmitted(false);
  }, [initialPlayers]);

  const leftError = submitted ? playerNameError(left) : undefined;
  const rightError = submitted ? playerNameError(right) : undefined;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (playerNameError(left) || playerNameError(right)) {
      return;
    }

    onSubmit({ left: left.trim(), right: right.trim() });
  };

  return (
    <ModalFrame className="setup-dialog" labelledBy="setup-title" onClose={onClose}>
      <button className="modal-close icon-button" type="button" onClick={onClose} aria-label="Close player setup" title="Close">
        <X size={20} />
      </button>
      <div className="modal-eyebrow"><Swords size={18} /> NEXT DUEL</div>
      <h2 id="setup-title">Who is entering the arena?</h2>
      <p className="setup-copy">Names appear on the scoreboard. Same names are allowed and every run gets its own record.</p>

      <form className="player-form" onSubmit={handleSubmit} noValidate>
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

        <button className="landing-button landing-button-primary setup-submit" type="submit">
          Enter arena <ArrowRight size={20} />
        </button>
      </form>
    </ModalFrame>
  );
}
