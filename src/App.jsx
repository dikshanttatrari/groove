import { Routes, Route, HashRouter, Navigate } from "react-router-dom";
import { MusicProvider } from "./context/MusicContext";
import "./App.css";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Search from "./pages/Search/Search";
import Register from "./pages/Register";

import Home from "./pages/Home";
import Library from "./pages/Library/Library";
import LikedSongs from "./pages/LikedSongs/LikedSongs";
import PlaylistDetail from "./pages/Playlist/PlaylistDetail";
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import GlobalOverlays from "./components/GlobalOverlays";
import Profile from "./pages/Profile/Profile";
import DownloadedSongs from "./pages/Download/DownloadedSongs";
import SharedSong from "./pages/SharedSong/SharedSong";
import Dashboard from "./pages/Admin/Dashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import ShowDetail from "./pages/ShowDetail/ShowDetail";
import ArtistDetail from "./pages/Artist/ArtistDetail";

function AdminGuard({ children }) {
  const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {};
  return user.role === "admin" ? children : <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <MusicProvider>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/song/:id" element={<SharedSong />} />

          <Route element={<AuthenticatedLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/library/liked" element={<LikedSongs />} />
            <Route path="/library/downloads" element={<DownloadedSongs />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
            <Route path="/show/:id" element={<ShowDetail />} />
            <Route path="/artist/:id" element={<ArtistDetail />} />

            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <Dashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/admin-secret"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
          </Route>
        </Routes>
        <GlobalOverlays />
      </MusicProvider>
    </HashRouter>
  );
}
