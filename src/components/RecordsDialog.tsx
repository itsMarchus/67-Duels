import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Download, Globe2, History, RefreshCw, Trash2, Trophy, Upload, Users, X } from "lucide-react";
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
import { fetchSoloLeaderboard, type SoloLeaderboardEntry } from "../arcade/soloApi";
import { ModalFrame } from "./ModalFrame";

type RecordsDialogProps = {
  onClose: () => void;
};

type RecordsTab = "solo" | "duel" | "history";

export function RecordsDialog({ onClose }: RecordsDialogProps) {
  const [tab, setTab] = useState<RecordsTab>("solo");
  const [records, setRecords] = useState<ArcadeRecords>(() => loadArcadeRecords());
  const [soloEntries, setSoloEntries] = useState<SoloLeaderboardEntry[]>([]);
  const [soloStatus, setSoloStatus] = useState<"loading" | "ready" | "error">("loading");
  const [soloNotice, setSoloNotice] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string>();
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setRecords(loadArcadeRecords()), []);

  useEffect(() => {
    const controller = new AbortController();
    setSoloStatus("loading");
    setSoloNotice(undefined);

    void fetchSoloLeaderboard(controller.signal)
      .then((entries) => {
        setSoloEntries(entries);
        setSoloStatus("ready");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setSoloStatus("error");
        setSoloNotice(error instanceof Error ? error.message : "The global leaderboard is unavailable.");
      });

    return () => controller.abort();
  }, [refreshKey]);

  const leaderboard = getLeaderboard(records);
  const history = getMatchHistory(records);
  const highlights = tab === "solo" ? soloEntries : tab === "duel" ? leaderboard : [];

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
    if (!window.confirm("Clear every local Duel match and leaderboard entry on this browser?")) {
      return;
    }

    try {
      clearArcadeRecords();
      setRecords({ version: 1, matches: [] });
      setNotice("All local Duel records cleared.");
    } catch {
      setNotice("This browser could not clear its saved records.");
    }
  };

  return (
    <ModalFrame
      className={"records-dialog " + (highlights.length > 0 ? "records-has-highlights" : "")}
      labelledBy="records-title"
      onClose={onClose}
    >
      <header className="records-header">
        <div>
          <div className="modal-eyebrow"><Trophy size={18} /> GLOBAL + LOCAL ARCADE</div>
          <h2 id="records-title">Arcade Records</h2>
        </div>
        <button data-autofocus className="modal-close icon-button" type="button" onClick={onClose} aria-label="Close arcade records" title="Close">
          <X size={20} />
        </button>
      </header>

      <div className="record-tabs" role="tablist" aria-label="Arcade record views">
        <button className={tab === "solo" ? "active" : ""} type="button" role="tab" aria-selected={tab === "solo"} onClick={() => setTab("solo")}>
          <Globe2 size={17} /> Solo Top 100
        </button>
        <button className={tab === "duel" ? "active" : ""} type="button" role="tab" aria-selected={tab === "duel"} onClick={() => setTab("duel")}>
          <Users size={17} /> Duel scores
        </button>
        <button className={tab === "history" ? "active" : ""} type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          <History size={17} /> Duel history
        </button>
      </div>

      {highlights.length > 0 && (
        <div className="record-highlights" aria-label="Top arcade scores">
          {highlights.slice(0, 3).map((entry, index) => (
            <div className={"record-highlight record-highlight-" + (index + 1)} key={entry.id}>
              <span>#{entry.rank}</span>
              <strong>{entry.name}</strong>
              <b>{entry.score}</b>
            </div>
          ))}
        </div>
      )}

      <div className="records-content">
        {tab === "solo" && <SoloLeaderboardTable entries={soloEntries} status={soloStatus} notice={soloNotice} />}
        {tab === "duel" && <DuelLeaderboardTable records={records} />}
        {tab === "history" && <HistoryTable history={history} />}
      </div>

      <footer className="records-footer">
        {tab === "solo" ? (
          <>
            <div className="records-tools">
              <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={soloStatus === "loading"}>
                <RefreshCw size={17} /> Refresh
              </button>
            </div>
            <span className="records-notice" role="status">
              {soloStatus === "loading" ? "Loading the global board..." : soloNotice ?? "Top 100 Solo performances"}
            </span>
          </>
        ) : (
          <>
            <div className="records-tools">
              <button type="button" onClick={handleExport} title="Export local Duel records as JSON">
                <Download size={17} /> Export
              </button>
              <button type="button" onClick={() => importRef.current?.click()} title="Import local Duel records from JSON">
                <Upload size={17} /> Import
              </button>
              <button className="danger" type="button" onClick={handleClear} disabled={records.matches.length === 0}>
                <Trash2 size={17} /> Clear
              </button>
              <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden="true" onChange={handleImport} />
            </div>
            <span className="records-notice" role="status">{notice ?? records.matches.length + " Duel matches saved on this browser"}</span>
          </>
        )}
      </footer>
    </ModalFrame>
  );
}

function SoloLeaderboardTable({
  entries,
  notice,
  status
}: {
  entries: SoloLeaderboardEntry[];
  notice?: string;
  status: "loading" | "ready" | "error";
}) {
  if (status === "loading") {
    return <EmptyRecords icon={<RefreshCw className="record-spinner" size={34} />} title="Calling the global board" copy="One tiny Redis read. Very serious business." />;
  }

  if (status === "error") {
    return <EmptyRecords icon={<Globe2 size={34} />} title="The global board is taking a nap" copy={notice ?? "Try refreshing in a moment."} />;
  }

  if (entries.length === 0) {
    return <EmptyRecords icon={<Trophy size={34} />} title="The global board is wide open" copy="Finish a Solo run and claim the first spot." />;
  }

  return (
    <table className="records-table">
      <thead><tr><th>Rank</th><th>Player</th><th>Score</th><th>Played</th></tr></thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td data-label="Rank"><strong>#{entry.rank}</strong></td>
            <td data-label="Player">{entry.name}</td>
            <td data-label="Score"><b className="table-score">{entry.score}</b></td>
            <td data-label="Played">{formatDate(entry.playedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DuelLeaderboardTable({ records }: { records: ArcadeRecords }) {
  const entries = getLeaderboard(records);
  if (entries.length === 0) {
    return <EmptyRecords icon={<Trophy size={34} />} title="The local board is suspiciously empty" copy="Finish a duel and the first score lands here." />;
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
    return <EmptyRecords icon={<History size={34} />} title="No legendary battles yet" copy="The full matchup and winner will appear after each Duel round." />;
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
