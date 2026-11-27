import { useState, useEffect } from "react";
import {
  Heart,
  Plus,
  LayoutGrid,
  List,
  Disc3,
  DownloadCloud,
  Mic2,
  UserCheck,
  ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Library.css";
import { apiFetch } from "../../utils/api";
import { cleanHtmlText } from "../../utils/formatters";
import { getAllSongs } from "../../utils/storage";
import { getFollowedArtists, getSavedShows } from "../../utils/preferences";
import { useMusic } from "../../context/MusicContext";

const Library = () => {
  const [playlists, setPlaylists] = useState([]);
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [followedArtists, setFollowedArtists] = useState(() =>
    getFollowedArtists(),
  );
  const [savedShows, setSavedShows] = useState(() => getSavedShows());
  const [likedCount, setLikedCount] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("playlists");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [loading, setLoading] = useState(true);

  const [recentIds, setRecentIds] = useState(() => {
    return JSON.parse(localStorage.getItem("groove_recent_playlists") || "[]");
  });

  const navigate = useNavigate();
  const { showToast } = useMusic();

  const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {
    name: "Guest",
  };

  useEffect(() => {
    const fetchLibraryData = async () => {
      try {
        const res = await apiFetch("/api/library");
        if (res.ok) {
          const data = await res.json();
          setLikedCount(data.likedCount || 0);
          setPlaylists((data.playlists || []).slice().reverse());
          setSavedPlaylists((data.savedPlaylists || []).slice().reverse());
        }
      } catch (error) {
        console.error("Failed to fetch library", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLibraryData();

    const syncLocalCollections = () => {
      setFollowedArtists(getFollowedArtists());
      setSavedShows(getSavedShows());
      fetchLibraryData();
    };
    window.addEventListener("libraryUpdated", syncLocalCollections);
    return () =>
      window.removeEventListener("libraryUpdated", syncLocalCollections);
  }, []);

  useEffect(() => {
    const checkDownloads = async () => {
      const data = await getAllSongs();
      setDownloadedCount(data.length);
    };

    checkDownloads();
    window.addEventListener("downloadsUpdated", checkDownloads);
    return () => window.removeEventListener("downloadsUpdated", checkDownloads);
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const res = await apiFetch("/api/library/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      });

      if (!res.ok) throw new Error("Failed");
      const newPlaylist = await res.json();

      setPlaylists((prev) => [newPlaylist, ...prev]);

      const targetId = newPlaylist._id || newPlaylist.id;
      const updatedRecents = [
        targetId,
        ...recentIds.filter((id) => id !== targetId),
      ];
      setRecentIds(updatedRecents);
      localStorage.setItem(
        "groove_recent_playlists",
        JSON.stringify(updatedRecents),
      );

      window.dispatchEvent(new Event("libraryUpdated"));
      setIsModalOpen(false);
      setNewPlaylistName("");
      showToast(`Created "${newPlaylist.name}"`);
    } catch (error) {
      console.error("Error creating playlist", error);
      showToast("Failed to create playlist", "error");
    }
  };

  const handlePlaylistClick = (targetId) => {
    const updatedRecents = [
      targetId,
      ...recentIds.filter((id) => id !== targetId),
    ];

    setRecentIds(updatedRecents);
    localStorage.setItem(
      "groove_recent_playlists",
      JSON.stringify(updatedRecents),
    );

    navigate(`/playlist/${targetId}`);
  };

  const getSortedPlaylists = () => {
    const combined = [...playlists, ...savedPlaylists];

    if (sortBy === "alpha") {
      return combined.sort((a, b) =>
        (a.title || a.name || "").localeCompare(b.title || b.name || ""),
      );
    }

    return combined.sort((a, b) => {
      const idA = a.playlistId || a._id || a.id;
      const idB = b.playlistId || b._id || b.id;

      const indexA = recentIds.indexOf(idA);
      const indexB = recentIds.indexOf(idB);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  };

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
    <div className="scrollable-page fade-in lib-page-padding">
      <header className="majestic-header" style={{ boxShadow: "none" }}>
        <div className="header-content">
          <div>
            <p className="header-date">Personal Collection</p>
            <h1
              className="home-greeting"
              style={{ fontSize: "2.8rem", marginBottom: 0 }}
            >
              Your Library
            </h1>
          </div>
          <div
            className="user-avatar-placeholder majestic-avatar native-tap"
            onClick={() => navigate("/profile")}
            style={{ cursor: "pointer" }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              (user.name || "G").charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </header>

      <div className="home-content-wrapper" style={{ marginTop: "10px" }}>
        <div className="controls-row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="filter-row">
            <button
              className={`aesthetic-pill ${activeFilter === "playlists" ? "active" : ""}`}
              onClick={() => setActiveFilter("playlists")}
            >
              Playlists
            </button>
            <button
              className={`aesthetic-pill ${activeFilter === "artists" ? "active" : ""}`}
              onClick={() => setActiveFilter("artists")}
            >
              Artists ({followedArtists.length})
            </button>
            <button
              className={`aesthetic-pill ${activeFilter === "podcasts" ? "active" : ""}`}
              onClick={() => setActiveFilter("podcasts")}
            >
              Shows ({savedShows.length})
            </button>
          </div>
          <div className="view-toggles" style={{ alignItems: "center" }}>
            {activeFilter === "playlists" && (
              <button
                className="view-btn"
                onClick={() =>
                  setSortBy((prev) => (prev === "recent" ? "alpha" : "recent"))
                }
                title="Toggle sort"
                style={{
                  gap: 5,
                  fontSize: "0.78rem",
                  color: "#ffe5b6",
                  marginRight: 6,
                }}
              >
                <ArrowUpDown size={15} />
                <span>{sortBy === "recent" ? "Recent" : "A–Z"}</span>
              </button>
            )}
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={20} strokeWidth={1.6} />
            </button>
            <button
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List size={22} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        {/* Highlight Blocks: Liked Songs & Offline Vault */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            className="dreamy-liked-block native-tap"
            style={{ marginBottom: 0, cursor: "pointer" }}
            onClick={() => navigate("/library/liked")}
          >
            <div className="liked-content-wrapper">
              <div className="liked-icon-glass">
                <Heart size={28} color="#fff" fill="#fff" />
              </div>
              <div className="liked-text-aesthetic">
                <h3>Liked Songs</h3>
                <p>{likedCount} saved tracks</p>
              </div>
            </div>
          </div>

          <div
            className="dreamy-liked-block native-tap fade-in"
            onClick={() => navigate("/library/downloads")}
            style={{
              background: "linear-gradient(135deg, #2a2521 0%, #151311 100%)",
              marginBottom: 0,
              cursor: "pointer",
              border: "1px solid rgba(255, 229, 182, 0.12)",
            }}
          >
            <div className="liked-content-wrapper">
              <div
                className="liked-icon-glass"
                style={{ background: "rgba(29, 185, 84, 0.16)" }}
              >
                <DownloadCloud size={28} color="#1DB954" />
              </div>
              <div className="liked-text-aesthetic">
                <h3>Downloads & Vault</h3>
                <p>
                  {downloadedCount} offline tracks • Export .m4a / ZIP
                </p>
              </div>
            </div>
          </div>
        </div>

        {activeFilter === "playlists" && (
          <div className={viewMode === "grid" ? "lib-grid" : "lib-list"}>
            <div
              className={`native-tap ${viewMode === "grid" ? "aesthetic-card" : "aesthetic-row"}`}
              style={{ cursor: "pointer" }}
              onClick={() => setIsModalOpen(true)}
            >
              <div className="create-art-minimal">
                <Plus
                  size={viewMode === "grid" ? 32 : 24}
                  color="#ffe5b6"
                  strokeWidth={1.6}
                />
              </div>
              <div className="playlist-text-block">
                <h4>Create New</h4>
                <p>Build a custom playlist</p>
              </div>
            </div>

            {getSortedPlaylists().map((pl, index) => {
              const isDefaultImage =
                !pl.image || pl.image.includes("default_album.jpg");
              const targetId = pl.playlistId || pl._id || pl.id;
              const displayName = cleanHtmlText(pl.title || pl.name);
              let displaySubtitle =
                pl.subtitle || `Playlist • ${pl.tracks?.length || 0} tracks`;
              displaySubtitle = cleanHtmlText(displaySubtitle).replace(
                /JioSaavn/gi,
                "Groove",
              );

              return (
                <div
                  key={targetId || index}
                  className={`native-tap ${viewMode === "grid" ? "aesthetic-card" : "aesthetic-row"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handlePlaylistClick(targetId)}
                >
                  {isDefaultImage ? (
                    <div className="aesthetic-art aesthetic-default-cover">
                      <Disc3
                        size={viewMode === "grid" ? 48 : 28}
                        color="rgba(255,255,255,0.4)"
                        strokeWidth={1}
                      />
                    </div>
                  ) : (
                    <img
                      src={pl.image}
                      alt={displayName}
                      className="aesthetic-art"
                    />
                  )}

                  <div className="playlist-text-block">
                    <h4>{displayName}</h4>
                    <p>{displaySubtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeFilter === "artists" && (
          <div>
            {followedArtists.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#a89f98",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 16,
                }}
              >
                <UserCheck
                  size={36}
                  color="#ffe5b6"
                  style={{ marginBottom: 12 }}
                />
                <h3 style={{ color: "#fff", marginBottom: 6 }}>
                  No Followed Artists Yet
                </h3>
                <p style={{ fontSize: "0.9rem" }}>
                  Visit any artist page and tap Follow to keep them here.
                </p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "lib-grid" : "lib-list"}>
                {followedArtists.map((artist) => (
                  <div
                    key={artist.id}
                    className={`native-tap ${viewMode === "grid" ? "aesthetic-card" : "aesthetic-row"}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/artist/${artist.id}`)}
                  >
                    <img
                      src={
                        artist.image || "https://c.saavncdn.com/default_album.jpg"
                      }
                      alt={artist.name}
                      className="aesthetic-art"
                      style={{ borderRadius: "50%" }}
                    />
                    <div className="playlist-text-block">
                      <h4>{artist.name}</h4>
                      <p>Artist</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeFilter === "podcasts" && (
          <div>
            {savedShows.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#a89f98",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 16,
                }}
              >
                <Mic2 size={36} color="#1db954" style={{ marginBottom: 12 }} />
                <h3 style={{ color: "#fff", marginBottom: 6 }}>
                  No Saved Podcasts Yet
                </h3>
                <p style={{ fontSize: "0.9rem" }}>
                  Tap the Heart icon on any podcast show to save it here.
                </p>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "lib-grid" : "lib-list"}>
                {savedShows.map((show) => (
                  <div
                    key={show.id}
                    className={`native-tap ${viewMode === "grid" ? "aesthetic-card" : "aesthetic-row"}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/show/${show.id}`)}
                  >
                    <img
                      src={
                        show.image || "https://c.saavncdn.com/default_album.jpg"
                      }
                      alt={show.title}
                      className="aesthetic-art"
                    />
                    <div className="playlist-text-block">
                      <h4>{show.title}</h4>
                      <p>{show.subtitle || "Podcast Show"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="aesthetic-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Name your playlist</h2>
            <input
              type="text"
              className="aesthetic-input"
              placeholder="Late night acoustics..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              autoFocus
            />
            <div className="modal-actions" style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-ghost native-tap"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-glow native-tap"
                onClick={handleCreatePlaylist}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
