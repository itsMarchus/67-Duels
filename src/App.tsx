import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { loadActivePlayers } from "./arcade/players";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { LandingPage } from "./pages/LandingPage";
import { preloadSharedHandLandmarker } from "./cv/handTracker";

const DuelGame = lazy(() =>
  import("./pages/DuelGame").then((module) => ({ default: module.DuelGame }))
);

export default function App() {
  useEffect(() => {
    preloadSharedHandLandmarker();
  }, []);

  return (
    <AppErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/play" element={<PlayRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

function PlayRoute() {
  const players = loadActivePlayers();
  return players ? <DuelGame players={players} /> : <Navigate to="/?setup=1" replace />;
}

function RouteLoading() {
  return <main className="route-loading" role="status">Loading the 67 arena...</main>;
}
