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
import {
  loadActiveGameSession,
  saveActiveGameSession,
  type ActiveGameSession
} from "../arcade/session";
import { PlayerSetupDialog } from "../components/PlayerSetupDialog";
import { RecordsDialog } from "../components/RecordsDialog";
import { publicAssetUrl } from "../config/assets";
import "./LandingPage.css";

const TECH_STEPS = [
  { icon: Camera, label: "Webcam", copy: "One mirrored camera sees Solo or both Duel players." },
  { icon: Cpu, label: "MediaPipe", copy: "The model tracks up to four hands." },
  { icon: Columns2, label: "Game mode", copy: "Solo uses the full frame; Duel splits red and blue." },
  { icon: Repeat2, label: "Swap detector", copy: "High and low hand positions must alternate." },
  { icon: Gauge, label: "Rep counter", copy: "Thresholds and debounce reject jitter." },
  { icon: Database, label: "Arcade records", copy: "Solo scores go global; Duel history stays local." }
];

export function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestedSetup = useMemo(() => new URLSearchParams(location.search).get("setup") === "1", [location.search]);
  const [setupOpen, setSetupOpen] = useState(requestedSetup);
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [setupError, setSetupError] = useState<string>();
  const initialSession = useMemo(() => loadActiveGameSession(), [setupOpen]);

  useEffect(() => {
    if (requestedSetup) {
      setSetupOpen(true);
      navigate("/", { replace: true });
    }
  }, [navigate, requestedSetup]);

  const enterArena = (session: ActiveGameSession) => {
    try {
      saveActiveGameSession(session);
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
          <span className="hero-sticker hero-sticker-left">SOLO OR DUEL</span>
          <span className="hero-sticker hero-sticker-right">ZERO LOGINS</span>
          <img className="inventor-meme" src={publicAssetUrl("memes/67_inventor_disorted_img.jpg")} alt="The distorted 67 inventor meme" />

          <div className="hero-copy">
            <span className="hero-kicker"><Swords size={20} /> FRESHIE ARCADE CHALLENGE</span>
            <h1><span>67</span> Duels</h1>
            <div className="minecraft-splash">67 in the big 2026?!</div>
            <p>One or two players. Hand-tracked chaos. Thirty seconds to make the leaderboard regret existing.</p>
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
              <Rule number="01" title="Choose your challenge" copy="Go Solo for the global Top 100 or bring a friend into Duel." />
              <Rule number="02" title="Show both hands" copy="Solo uses the full frame; each Duel player keeps two hands in their lane." />
              <Rule number="03" title="Swap high and low" copy="Alternate your two hands like the 67 gesture. Clean swaps count as reps." />
              <Rule number="04" title="Survive 30 seconds" copy="Solo climbs the board; the highest Duel score wins the round." />
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

          <div className="tech-footnote"><Hand size={22} /> No hand video leaves the browser. Only Solo names and final scores are sent to the global leaderboard.</div>
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
              <Play size={21} fill="currentColor" /> Choose your mode
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

      {setupOpen && <PlayerSetupDialog errorMessage={setupError} initialSession={initialSession} onClose={() => setSetupOpen(false)} onSubmit={enterArena} />}
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
