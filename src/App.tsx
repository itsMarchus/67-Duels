import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { loadActivePlayers } from "./arcade/players";
import { LandingPage } from "./pages/LandingPage";
import { DuelGame } from "./pages/DuelGame";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<PlayRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlayRoute() {
  const players = loadActivePlayers();
  return players ? <DuelGame players={players} /> : <Navigate to="/?setup=1" replace />;
}
