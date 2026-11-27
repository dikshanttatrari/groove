import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  User as UserIcon,
  LogOut,
  DownloadCloud,
  Heart,
  Clock3,
  Trash2,
  X,
  Play,
} from "lucide-react";
import "./Profile.css";
import { apiFetch } from "../../utils/api";
import { cleanHtmlText, formatBytes } from "../../utils/formatters";
import { getStorageStats } from "../../utils/storage";
import { getFollowedArtists } from "../../utils/preferences";
import { useMusic } from "../../context/MusicContext";

export default function Profile() {
  const navigate = useNavigate();
  const {
    setIsSettingsOpen,
    recentlyPlayed,
    clearHistory,
    playSong,
    showToast,
    likedTrackIds,
  } = useMusic();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState({ count: 0, totalBytes: 0 });
  const [followedCount, setFollowedCount] = useState(
    () => getFollowedArtists().length,
  );

  const [user, setUser] = useState(
    () =>
      JSON.parse(localStorage.getItem("groove_user") || "null") || {
        name: "Guest User",
        email: "guest@groove.com",
      },
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [editAvatar, setEditAvatar] = useState(user.avatar || "");

  useEffect(() => {
    const fetchUserPlaylists = async () => {
      try {
        const [libRes, vaultStats] = await Promise.all([
          apiFetch("/api/library"),
          getStorageStats(),
        ]);
        if (libRes.ok) {
          const data = await libRes.json();
          setPlaylists(data.playlists || []);
        }
        setStorageStats(vaultStats);
      } catch (error) {
        console.error("Failed to fetch profile playlists", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPlaylists();

    const syncStats = () => {
      getStorageStats().then(setStorageStats).catch(() => {});
      setFollowedCount(getFollowedArtists().length);
    };
    window.addEventListener("downloadsUpdated", syncStats);
    window.addEventListener("libraryUpdated", syncStats);
    return () => {
      window.removeEventListener("downloadsUpdated", syncStats);
      window.removeEventListener("libraryUpdated", syncStats);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("groove_token");
    localStorage.removeItem("groove_user");
    navigate("/login");
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    const updatedUser = {
      ...user,
      name: editName.trim(),
      avatar: editAvatar.trim(),
    };
    localStorage.setItem("groove_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setShowEditModal(false);
    showToast("Profile updated");
  };

  const totalLocalPlays = recentlyPlayed.reduce(
    (sum, item) => sum + (item.playCount || 1),
    0,
  );

  if (loading) {
    return (
      <div
        className="app-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="majestic-loader"></div>
      </div>
    );
  }

  return (
    <div className="scrollable-page fade-in profile-page-padding">
      <nav className="profile-nav">
        <h2 className="profile-nav-title">Profile</h2>
        <button
          className="icon-btn native-tap"
          onClick={() => setIsSettingsOpen(true)}
          title="Audio & Download Settings"
        >
          <Settings size={22} color="#ffe5b6" />
        </button>
      </nav>

      <header className="profile-hero">
        <div className="profile-avatar-container">
          {user.avatar ? (
            <img src={user.avatar} alt="Profile" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-fallback">
              <UserIcon size={64} color="#b3b3b3" />
            </div>
          )}
        </div>

        <h1 className="profile-name">{user.name}</h1>
        {user.email && (
          <p
            style={{
              color: "#a89f98",
              fontSize: "0.86rem",
              marginTop: -8,
              marginBottom: 20,
            }}
          >
            {user.email}
          </p>
        )}

        <div className="profile-stats">
          <div className="stat-pill">
            <span className="stat-number">{playlists.length}</span>
            <span className="stat-label">Playlists</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-pill">
            <span className="stat-number">{likedTrackIds.length}</span>
            <span className="stat-label">Liked</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-pill">
            <span className="stat-number">{followedCount}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-pill">
            <span className="stat-number">{totalLocalPlays}</span>
            <span className="stat-label">Plays</span>
          </div>
        </div>

        <div className="profile-actions" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="profile-edit-btn native-tap"
            onClick={() => {
              setEditName(user.name || "");
              setEditAvatar(user.avatar || "");
              setShowEditModal(true);
            }}
          >
            Edit Profile
          </button>
          <button
            className="profile-edit-btn native-tap"
            onClick={() => setIsSettingsOpen(true)}
          >
            Audio & Downloads
          </button>
          <button
            className="profile-logout-btn native-tap"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <main className="profile-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Quick Vault & Liked Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            onClick={() => navigate("/library/downloads")}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <DownloadCloud size={26} color="#1db954" />
            <div>
              <div style={{ fontWeight: 700, color: "#fff" }}>
                {storageStats.count} Offline Tracks
              </div>
              <div style={{ fontSize: "0.8rem", color: "#a89f98" }}>
                {formatBytes(storageStats.totalBytes)} in vault • Manage & Export
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate("/library/liked")}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
          >
            <Heart size={26} color="#ffe5b6" fill="#ffe5b6" />
            <div>
              <div style={{ fontWeight: 700, color: "#fff" }}>
                {likedTrackIds.length} Liked Songs
              </div>
              <div style={{ fontSize: "0.8rem", color: "#a89f98" }}>
                Synced with your Groove account
              </div>
            </div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">Your Playlists</h2>
        </div>

        {playlists.length === 0 ? (
          <div className="empty-profile-state">
            <p>You haven't created any playlists yet.</p>
          </div>
        ) : (
          <div className="spotify-card-grid" style={{ marginBottom: 36 }}>
            {playlists.map((pl) => (
              <div
                key={pl._id}
                className="spotify-card native-tap"
                onClick={() => navigate(`/playlist/${pl._id}`)}
              >
                <img
                  src={pl.image || "https://c.saavncdn.com/default_album.jpg"}
                  alt={cleanHtmlText(pl.name)}
                  className="spotify-card-img"
                  loading="lazy"
                />
                <h4 className="spotify-card-title">{cleanHtmlText(pl.name)}</h4>
                <p className="spotify-card-subtitle">
                  {pl.tracks?.length || 0} tracks
                </p>
              </div>
            ))}
          </div>
        )}

        <div
          className="section-header"
          style={{
            marginTop: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock3 size={18} color="#ffe5b6" />
            <h2 className="section-title" style={{ margin: 0 }}>
              Recently Played
            </h2>
          </div>
          {recentlyPlayed.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                background: "transparent",
                border: "none",
                color: "#a89f98",
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>

        {recentlyPlayed.length === 0 ? (
          <div className="empty-profile-state">
            <p>Play a track to start building your listening history.</p>
          </div>
        ) : (
          <div className="songs-list">
            {recentlyPlayed.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className="premium-song-row native-tap"
                onClick={() => playSong(entry.song)}
              >
                <img
                  src={
                    entry.song.albumArt?.[1]?.url ||
                    entry.song.albumArt?.[0]?.url ||
                    "https://c.saavncdn.com/default_album.jpg"
                  }
                  alt={entry.song.title}
                  className="row-song-img"
                />
                <div className="row-song-info">
                  <h4 className="row-song-title">{entry.song.title}</h4>
                  <p className="row-song-artist">
                    {entry.song.artists?.[0]?.name || "Unknown Artist"} •{" "}
                    {entry.playCount} {entry.playCount === 1 ? "play" : "plays"}
                  </p>
                </div>
                <Play size={18} color="#1db954" />
              </div>
            ))}
          </div>
        )}
      </main>

      {showEditModal && (
        <div
          className="sheet-backdrop fade-in"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="sheet-panel slide-up-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-editorial, serif)",
                  fontSize: "1.6rem",
                  color: "#ffe5b6",
                }}
              >
                Edit Profile
              </h2>
              <button
                className="icon-btn"
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} color="#fff" />
              </button>
            </div>
            <form
              onSubmit={handleSaveProfile}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label className="settings-label">Display Name</label>
                <input
                  type="text"
                  className="input-glass"
                  style={{ width: "100%" }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="settings-label">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  className="input-glass"
                  style={{ width: "100%" }}
                  placeholder="https://..."
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ maxWidth: "none", marginTop: 6 }}
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
