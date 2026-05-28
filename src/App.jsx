import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MusicProvider } from "./context/MusicContext";
import "./App.css";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Search from "./pages/Search";
import Register from "./pages/Register";

import BottomNav from "./components/BottomNav";
import Player from "./components/Player";
import Home from "./pages/Home";
import Library from "./pages/Library";
import LikedSongs from "./pages/LikedSongs";
import PlaylistDetail from "./pages/PlaylistDetail";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

export default function App() {
  return (
    <BrowserRouter>
      <MusicProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<AuthenticatedLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/liked" element={<LikedSongs />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
          </Route>
        </Routes>
      </MusicProvider>
    </BrowserRouter>
  );
}
