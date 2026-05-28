import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ListMusic, Clock, Plus, Music, UserCircle } from "lucide-react";
import { useMusic } from "../context/MusicContext";

export default function Library() {
  const navigate = useNavigate();
  const { playSong } = useMusic();

  const [activeTab, setActiveTab] = useState("playlists");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated via local storage token
  const token = localStorage.getItem("groove_token");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return; // Stop here if no token, UI will handle the logged-out state
    }

    const fetchUserLibrary = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            "x-auth-token": token,
          },
        });

        if (!res.ok) throw new Error("Session expired");

        const data = await res.json();
        setUserData(data);
      } catch (error) {
        console.error("Failed to fetch library:", error);
        // Clear invalid token
        localStorage.removeItem("groove_token");
        localStorage.removeItem("groove_user");
      } finally {
        setLoading(false);
      }
    };

    fetchUserLibrary();
  }, [token]);

  // ==========================================
  // LOGGED OUT STATE
  // ==========================================
  if (!token && !loading) {
    return (
      <div
        className="app-container fade-in scrollable-page"
        style={{
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "150px",
        }}
      >
        <Music size={64} color="#3d3632" style={{ marginBottom: "20px" }} />
        <h2
          style={{ fontSize: "2rem", color: "#ffe5b6", marginBottom: "10px" }}
        >
          Your Music, Anywhere
        </h2>
        <p
          style={{
            color: "#a89f98",
            textAlign: "center",
            maxWidth: "300px",
            marginBottom: "30px",
            fontStyle: "italic",
          }}
        >
          Log in to save your favorite tracks and build custom playlists.
        </p>
        <button
          className="btn-primary native-tap"
          onClick={() => navigate("/login")}
        >
          Sign In Securely
        </button>
      </div>
    );
  }

  // ==========================================
  // LOADING STATE (Premium Skeletons)
  // ==========================================
  if (loading) {
    return (
      <div className="app-container scrollable-page">
        <header className="library-header">
          <div className="skeleton skeleton-title"></div>
        </header>
        <main className="library-content">
          <div className="skeleton skeleton-hero"></div>
          <div className="skeleton skeleton-row"></div>
          <div className="skeleton skeleton-row"></div>
        </main>
      </div>
    );
  }

  // ==========================================
  // LOGGED IN: REAL DYNAMIC DATA
  // ==========================================
  return (
    <div className="app-container fade-in scrollable-page">
      <header className="library-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h1 className="library-title" style={{ marginBottom: 0 }}>
            Your Library
          </h1>
          <div className="user-avatar-mini">
            {userData?.avatar ? (
              <img src={userData.avatar} alt="avatar" />
            ) : (
              <UserCircle size={32} color="#ffe5b6" />
            )}
          </div>
        </div>

        <div className="library-tabs">
          <button
            className={`lib-tab native-tap ${activeTab === "playlists" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("playlists")}
          >
            Playlists
          </button>
          <button
            className={`lib-tab native-tap ${activeTab === "artists" ? "active-tab" : ""}`}
            onClick={() => setActiveTab("artists")}
          >
            Artists
          </button>
        </div>
      </header>

      <main className="library-content">
        {/* DYNAMIC LIKED SONGS HERO CARD */}
        <div
          className="liked-hero-card native-tap"
          onClick={() => {
            if (userData?.likedSongs?.length > 0) {
              // Future implementation: Fetch these specific IDs and play the first one
              console.log("Play Liked Songs Queue:", userData.likedSongs);
            }
          }}
        >
          <div className="liked-hero-content">
            <h2
              style={{
                fontSize: "2rem",
                color: "#ffffff",
                margin: "0 0 5px 0",
                letterSpacing: "-0.5px",
              }}
            >
              Liked Songs
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "1.1rem",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              {userData?.likedSongs?.length || 0} saved tracks
            </p>
          </div>
          <Heart
            size={80}
            color="rgba(255,255,255,0.1)"
            className="hero-bg-icon"
          />
        </div>

        {/* RECENTLY PLAYED */}
        <div className="library-row native-tap">
          <div
            className="lib-icon-box"
            style={{ background: "#1c1917", border: "1px solid #3d3632" }}
          >
            <Clock size={28} color="#ffe5b6" />
          </div>
          <div className="lib-row-info">
            <h3 className="lib-row-title">Recently Played</h3>
            <p className="lib-row-sub">Your listening history</p>
          </div>
        </div>

        <hr className="lib-divider" />

        {/* DYNAMIC PLAYLISTS */}
        {activeTab === "playlists" && (
          <>
            <div
              className="library-row native-tap"
              onClick={() => console.log("Open Create Playlist Modal")}
            >
              <div
                className="lib-icon-box"
                style={{
                  background: "rgba(255, 229, 182, 0.1)",
                  border: "1px dashed #ffe5b6",
                }}
              >
                <Plus size={32} color="#ffe5b6" />
              </div>
              <div className="lib-row-info">
                <h3 className="lib-row-title" style={{ color: "#ffe5b6" }}>
                  Create Playlist
                </h3>
                <p className="lib-row-sub">Build a new mix</p>
              </div>
            </div>

            {/* Map over user's actual database playlists */}
            {userData?.playlists?.map((playlist) => (
              <div key={playlist._id} className="library-row native-tap">
                <div className="lib-icon-box" style={{ background: "#26221f" }}>
                  {playlist.coverImage ? (
                    <img
                      src={playlist.coverImage}
                      alt="cover"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "8px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <ListMusic size={28} color="#a89f98" />
                  )}
                </div>
                <div className="lib-row-info">
                  <h3 className="lib-row-title">{playlist.name}</h3>
                  <p className="lib-row-sub">
                    {playlist.songs?.length || 0} tracks
                  </p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* EMPTY ARTISTS TAB */}
        {activeTab === "artists" && (
          <div
            style={{ textAlign: "center", marginTop: "40px", color: "#a89f98" }}
          >
            <p style={{ fontStyle: "italic", fontSize: "1.1rem" }}>
              You haven't followed any artists yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
