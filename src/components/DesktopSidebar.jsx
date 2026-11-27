import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Library,
  Heart,
  DownloadCloud,
  SlidersHorizontal,
  ShieldCheck,
  Disc3,
  Music2,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAllSongs } from "../utils/storage";
import { useMusic } from "../context/MusicContext";

export default function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsSettingsOpen } = useMusic();

  const [downloadedCount, setDownloadedCount] = useState(0);
  const [playlists, setPlaylists] = useState([]);

  const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {
    name: "Guest",
  };
  const isAdmin = user.role === "admin";

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const songs = await getAllSongs();
        setDownloadedCount(songs.length);
      } catch {
        setDownloadedCount(0);
      }
    };
    loadCounts();
    window.addEventListener("downloadsUpdated", loadCounts);
    return () => window.removeEventListener("downloadsUpdated", loadCounts);
  }, []);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await apiFetch("/api/library");
        if (res.ok) {
          const data = await res.json();
          const combined = [
            ...(data.playlists || []).slice().reverse(),
            ...(data.savedPlaylists || []).slice().reverse(),
          ];
          setPlaylists(combined.slice(0, 12));
        }
      } catch {
        // Offline or network unavailable
      }
    };
    fetchPlaylists();
    window.addEventListener("libraryUpdated", fetchPlaylists);
    return () => window.removeEventListener("libraryUpdated", fetchPlaylists);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-brand" onClick={() => navigate("/home")}>
        <div className="sidebar-brand-mark">
          <Music2 size={18} strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-brand-name">Groove</div>
          <div className="sidebar-brand-tag">Hi-Fi Studio</div>
        </div>
      </div>

      <div className="sidebar-nav-list">
        <button
          className={`sidebar-nav-item ${isActive("/home") ? "active" : ""}`}
          onClick={() => navigate("/home")}
        >
          <span className="sidebar-nav-left">
            <Home size={18} />
            <span>Home</span>
          </span>
        </button>

        <button
          className={`sidebar-nav-item ${isActive("/search") ? "active" : ""}`}
          onClick={() => navigate("/search")}
        >
          <span className="sidebar-nav-left">
            <Search size={18} />
            <span>Search</span>
          </span>
        </button>

        <button
          className={`sidebar-nav-item ${isActive("/library") ? "active" : ""}`}
          onClick={() => navigate("/library")}
        >
          <span className="sidebar-nav-left">
            <Library size={18} />
            <span>Your Library</span>
          </span>
        </button>
      </div>

      <div className="sidebar-section-label">Collection</div>
      <div className="sidebar-nav-list">
        <button
          className={`sidebar-nav-item ${isActive("/library/liked") ? "active" : ""}`}
          onClick={() => navigate("/library/liked")}
        >
          <span className="sidebar-nav-left">
            <Heart size={18} />
            <span>Liked Songs</span>
          </span>
        </button>

        <button
          className={`sidebar-nav-item ${isActive("/library/downloads") ? "active" : ""}`}
          onClick={() => navigate("/library/downloads")}
        >
          <span className="sidebar-nav-left">
            <DownloadCloud size={18} />
            <span>Downloads</span>
          </span>
          {downloadedCount > 0 && (
            <span className="sidebar-badge">{downloadedCount}</span>
          )}
        </button>

        {isAdmin && (
          <button
            className={`sidebar-nav-item ${["/admin-secret", "/admin"].includes(location.pathname) ? "active" : ""}`}
            onClick={() => navigate("/admin-secret")}
          >
            <span className="sidebar-nav-left">
              <ShieldCheck size={18} />
              <span>Admin HQ</span>
            </span>
          </button>
        )}
      </div>

      {playlists.length > 0 && (
        <>
          <div className="sidebar-section-label">Playlists</div>
          <div className="sidebar-playlists">
            {playlists.map((pl, idx) => {
              const targetId = pl.playlistId || pl._id || pl.id;
              const name = pl.title || pl.name || "Untitled";
              return (
                <button
                  key={targetId || idx}
                  className="sidebar-playlist-item"
                  onClick={() => navigate(`/playlist/${targetId}`)}
                >
                  {pl.image && !pl.image.includes("default_album.jpg") ? (
                    <img
                      src={pl.image}
                      alt={name}
                      className="sidebar-playlist-thumb"
                    />
                  ) : (
                    <div
                      className="sidebar-playlist-thumb"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Disc3 size={14} color="rgba(255,255,255,0.45)" />
                    </div>
                  )}
                  <span className="sidebar-playlist-name">{name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="sidebar-footer">
        <button
          className="sidebar-nav-item"
          onClick={() => setIsSettingsOpen(true)}
        >
          <span className="sidebar-nav-left">
            <SlidersHorizontal size={18} />
            <span>Audio & Downloads</span>
          </span>
        </button>

        <div
          className="sidebar-profile-card"
          onClick={() => navigate("/profile")}
        >
          <div className="sidebar-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              (user.name || "G").charAt(0).toUpperCase()
            )}
          </div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">{user.name || "Guest"}</div>
            <div className="sidebar-user-sub">
              {user.role === "admin" ? "Admin • Hi-Fi" : "Premium Audio"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
