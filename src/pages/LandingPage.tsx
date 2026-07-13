import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Camera,
  Columns2,
  Cpu,
  Database,
  Gauge,
  Github,
  Hand,
  History,
  Play,
  Repeat2,
  Swords,
  TriangleAlert,
  User
} from "lucide-react";
import { loadActivePlayers, saveActivePlayers, type ActivePlayers } from "../arcade/players";
import { PlayerSetupDialog } from "../components/PlayerSetupDialog";
import { RecordsDialog } from "../components/RecordsDialog";
import { publicAssetUrl } from "../config/assets";
import "./LandingPage.css";

const TECH_STEPS = [
  { icon: Camera, label: "Webcam", copy: "One mirrored camera sees both players." },
  { icon: Cpu, label: "MediaPipe", copy: "The model tracks up to four hands." },
  { icon: Columns2, label: "Player zones", copy: "Hand centers enter the red or blue lane." },
  { icon: Repeat2, label: "Swap detector", copy: "High and low hand positions must alternate." },
  { icon: Gauge, label: "Rep counter", copy: "Thresholds and debounce reject jitter." },
  { icon: Database, label: "Arcade records", copy: "Final scores stay on this browser." }
];

export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedSetup = useMemo(() => new URLSearchParams(location.search).get("setup") === "1", [location.search]);
  const [setupOpen, setSetupOpen] = useState(requestedSetup);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [setupError, setSetupError] = useState<string>();
  const initialPlayers = useMemo(() => loadActivePlayers(), [setupOpen]);

  useEffect(() => {
    if (requestedSetup) {
      setSetupOpen(true);
      navigate("/", { replace: true });
    }
  }, [navigate, requestedSetup]);

  const enterArena = (players: ActivePlayers) => {
    try {
      saveActivePlayers(players);
      setSetupError(undefined);
      navigate("/play");
    } catch {
      setSetupError("This browser blocked session storage. Allow site data, then try again.");
    }
  };

  return (
    <main className="landing-page">
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="nav-brand" href="#top" aria-label="67 Duels home"><span>67</span> DUELS</a>
        <div className="nav-links">
          <a href="#how">How to play</a>
          <a href="#tech">The tech</a>
          <button type="button" onClick={() => setRecordsOpen(true)}><History size={17} /> Records</button>
        </div>
      </nav>

      <section className="landing-hero" id="top">
        <div className="hero-stage">
          <span className="hero-sticker hero-sticker-left">TWO PLAYERS</span>
          <span className="hero-sticker hero-sticker-right">ONE CAMERA</span>
          <img className="inventor-meme" src={publicAssetUrl("memes/67_inventor_disorted_img.jpg")} alt="The distorted 67 inventor meme" />

          <div className="hero-copy">
            <span className="hero-kicker"><Swords size={20} /> FRESHIE ARCADE CHALLENGE</span>
            <h1><span>67</span> Duels</h1>
            <div className="minecraft-splash">67 in the big 2026?!</div>
            <p>Two players. Four tracked hands. Thirty seconds of deeply serious academic competition.</p>
            <div className="hero-actions">
              <button className="landing-button landing-button-primary" type="button" onClick={() => setSetupOpen(true)}>
                <Play size={21} fill="currentColor" /> Play now
              </button>
              <button className="landing-button landing-button-secondary" type="button" onClick={() => setRecordsOpen(true)}>
                <History size={20} /> Arcade records
              </button>
            </div>
          </div>
        </div>
        <a className="scroll-cue" href="#how" aria-label="Scroll to how the game works"><ArrowDown size={20} /></a>
      </section>

      <section className="how-section" id="how">
        <div className="section-inner how-layout">
          <div className="section-copy">
            <span className="section-kicker">THE EXTREMELY OFFICIAL RULES</span>
            <h2>How does one achieve 67 greatness?</h2>
            <div className="rule-list">
              <Rule number="01" title="Pick a side" copy="Stand together in one camera: Player 1 on red, Player 2 on blue." />
              <Rule number="02" title="Show both hands" copy="Each player needs two visible hands before their lane locks in." />
              <Rule number="03" title="Swap high and low" copy="Alternate your two hands like the 67 gesture. Clean swaps count as reps." />
              <Rule number="04" title="Survive 30 seconds" copy="The player with the most counted swaps takes the round." />
            </div>
          </div>

          <div className="explain-scene">
            <div className="board-note">YES, THE CAMERA<br />IS JUDGING YOU</div>
            <img className="explain-meme" src={publicAssetUrl("memes/trying_to_explain.jpg")} alt="A person enthusiastically explaining a board" />
            <figure className="unimpressed-callout">
              <img src={publicAssetUrl("memes/unimpressed-not-impressed.gif")} alt="An unimpressed reaction" />
              <figcaption>One hand visible?<br /><strong>No points. Tragic.</strong></figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="tech-section" id="tech">
        <div className="section-inner">
          <div className="tech-heading">
            <div>
              <span className="section-kicker">COMPUTER VISION, BUT MAKE IT 67</span>
              <h2>What is happening behind the camera?</h2>
            </div>
            <img src={publicAssetUrl("memes/monkey-thinking.png")} alt="A monkey thinking very hard about computer vision" />
          </div>

          <div className="tech-flow" aria-label="How the computer vision scoring pipeline works">
            {TECH_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div className="tech-step-wrap" key={step.label}>
                  <article className={"tech-step tech-step-" + (index + 1)}>
                    <Icon size={27} />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{step.label}</strong>
                    <p>{step.copy}</p>
                  </article>
                  {index < TECH_STEPS.length - 1 && <ArrowRight className="tech-arrow" size={24} aria-hidden="true" />}
                </div>
              );
            })}
          </div>

          <div className="tech-footnote"><Hand size={22} /> No hand video leaves the browser. The model and scoring run locally on this machine.</div>
          <div className="camera-fps-note" role="note">
            <TriangleAlert size={17} aria-hidden="true" />
            <span><strong>Best with a 60 FPS camera.</strong> 30 FPS is supported, but extreme speed may outrun the camera.</span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="section-inner final-cta-inner">
          <img src={publicAssetUrl("memes/shocked-face-shocked-meme.gif")} alt="A shocked reaction to an unbelievable 67 score" />
          <div>
            <span className="section-kicker">THE LEADERBOARD WILL REMEMBER THIS</span>
            <h2>Okay, enough theory.<br />Do the 67.</h2>
            <button className="landing-button landing-button-primary" type="button" onClick={() => setSetupOpen(true)}>
              <Play size={21} fill="currentColor" /> Start a duel
            </button>
          </div>
          <span className="cta-score-sticker">NEW HIGH SCORE?</span>
        </div>
      </section>

      <footer className="site-footer">
        <strong>67 DUELS</strong>
        <a
          className="github-profile-link"
          href="https://github.com/itsMarchus"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit itsMarchus on GitHub"
        >
          <Github size={19} />
          <User size={16} />
          <span>itsMarchus</span>
        </a>
      </footer>

      {setupOpen && <PlayerSetupDialog errorMessage={setupError} initialPlayers={initialPlayers} onClose={() => setSetupOpen(false)} onSubmit={enterArena} />}
      {recordsOpen && <RecordsDialog onClose={() => setRecordsOpen(false)} />}
    </main>
  );
}

function Rule({ copy, number, title }: { copy: string; number: string; title: string }) {
  return (
    <div className="rule-row">
      <span>{number}</span>
      <div><strong>{title}</strong><p>{copy}</p></div>
    </div>
  );
}
