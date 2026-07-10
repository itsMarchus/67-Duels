import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Download, History, Trash2, Trophy, Upload, X } from "lucide-react";
import {
  clearArcadeRecords,
  exportArcadeRecords,
  getLeaderboard,
  getMatchHistory,
  loadArcadeRecords,
  parseArcadeRecordsJson,
  replaceArcadeRecords,
  type ArcadeRecords,
  type MatchRecord
} from "../arcade/records";
import { ModalFrame } from "./ModalFrame";

type RecordsDialogProps = {
  onClose: () => void;
};

type RecordsTab = "leaderboard" | "history";

export function RecordsDialog({ onClose }: RecordsDialogProps) {
  const [tab, setTab] = useState<RecordsTab>("leaderboard");
  const [records, setRecords] = useState<ArcadeRecords>(() => loadArcadeRecords());
  const [notice, setNotice] = useState<string>();
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setRecords(loadArcadeRecords()), []);

  const leaderboard = getLeaderboard(records);
  const history = getMatchHistory(records);

  const handleExport = () => {
    const blob = new Blob([exportArcadeRecords(records)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "67-duels-records-" + new Date().toISOString().slice(0, 10) + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exported.");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const imported = parseArcadeRecordsJson(await file.text());
      if (!window.confirm("Replace current records with " + imported.matches.length + " imported matches?")) {
        return;
      }

      setRecords(replaceArcadeRecords(imported));
      setNotice("Imported " + imported.matches.length + " matches.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed.");
    }
  };

  const handleClear = () => {
    if (!window.confirm("Clear every 67 Duels match and leaderboard entry on this browser?")) {
      return;
    }

    clearArcadeRecords();
    setRecords({ version: 1, matches: [] });
    setNotice("All arcade records cleared.");
  };

  return (
    <ModalFrame className="records-dialog" labelledBy="records-title" onClose={onClose}>
      <header className="records-header">
        <div>
          <div className="modal-eyebrow"><Trophy size={18} /> LOCAL ARCADE</div>
          <h2 id="records-title">Arcade Records</h2>
        </div>
        <button data-autofocus className="modal-close icon-button" type="button" onClick={onClose} aria-label="Close arcade records" title="Close">
          <X size={20} />
        </button>
      </header>

      <div className="record-tabs" role="tablist" aria-label="Arcade record views">
        <button className={tab === "leaderboard" ? "active" : ""} type="button" role="tab" aria-selected={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
          <Trophy size={17} /> Leaderboard
        </button>
        <button className={tab === "history" ? "active" : ""} type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          <History size={17} /> Match history
        </button>
      </div>

      {leaderboard.length > 0 && (
        <div className="record-highlights" aria-label="Top arcade scores">
          {leaderboard.slice(0, 3).map((entry, index) => (
            <div className={"record-highlight record-highlight-" + (index + 1)} key={entry.id}>
              <span>#{entry.rank}</span>
              <strong>{entry.name}</strong>
              <b>{entry.score}</b>
            </div>
          ))}
        </div>
      )}

      <div className="records-content">
        {tab === "leaderboard" ? <LeaderboardTable records={records} /> : <HistoryTable history={history} />}
      </div>

      <footer className="records-footer">
        <div className="records-tools">
          <button type="button" onClick={handleExport} title="Export records as JSON">
            <Download size={17} /> Export
          </button>
          <button type="button" onClick={() => importRef.current?.click()} title="Import records from JSON">
            <Upload size={17} /> Import
          </button>
          <button className="danger" type="button" onClick={handleClear} disabled={records.matches.length === 0}>
            <Trash2 size={17} /> Clear
          </button>
          <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden="true" onChange={handleImport} />
        </div>
        <span className="records-notice" role="status">{notice ?? records.matches.length + " matches saved on this browser"}</span>
      </footer>
    </ModalFrame>
  );
}

function LeaderboardTable({ records }: { records: ArcadeRecords }) {
  const entries = getLeaderboard(records);
  if (entries.length === 0) {
    return <EmptyRecords icon={<Trophy size={34} />} title="The board is suspiciously empty" copy="Finish a duel and the first score lands here." />;
  }

  return (
    <table className="records-table">
      <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Result</th><th>Played</th></tr></thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td data-label="Rank"><strong>#{entry.rank}</strong></td>
            <td data-label="Player">{entry.name}</td>
            <td data-label="Score"><b className="table-score">{entry.score}</b></td>
            <td data-label="Result"><span className={"result-tag result-" + entry.result.toLowerCase()}>{entry.result}</span></td>
            <td data-label="Played">{formatDate(entry.playedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryTable({ history }: { history: MatchRecord[] }) {
  if (history.length === 0) {
    return <EmptyRecords icon={<History size={34} />} title="No legendary battles yet" copy="The full matchup and winner will appear after each round." />;
  }

  return (
    <table className="records-table history-table">
      <thead><tr><th>Match</th><th>Score</th><th>Winner</th><th>Played</th></tr></thead>
      <tbody>
        {history.map((match) => (
          <tr key={match.id}>
            <td data-label="Match"><strong>{match.left.name}</strong> vs <strong>{match.right.name}</strong></td>
            <td data-label="Score"><b className="table-score">{match.left.score} - {match.right.score}</b></td>
            <td data-label="Winner">{winnerName(match)}</td>
            <td data-label="Played">{formatDate(match.playedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyRecords({ copy, icon, title }: { copy: string; icon: ReactNode; title: string }) {
  return <div className="empty-records">{icon}<strong>{title}</strong><span>{copy}</span></div>;
}

function winnerName(match: MatchRecord): string {
  if (match.winner === "tie") {
    return "Tie";
  }

  return match[match.winner].name;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
