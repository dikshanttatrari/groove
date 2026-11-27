import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../context/MusicContext";
import { apiUrl } from "../utils/api";
import { cleanHtmlText, formatSongData } from "../utils/formatters";
import { getAllSongs } from "../utils/storage";
import {
  Play,
  Heart,
  Shuffle,
  Mic2,
  DownloadCloud,
  Radio,
  SlidersHorizontal,
  Clock3,
  MoreHorizontal,
} from "lucide-react";

const pickRandomItem = (items) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
};

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [activeTab, setActiveTab] = useState("music");

  const navigate = useNavigate();
  const {
    playSong,
    setQueue,
    recentlyPlayed,
    openSongActions,
    setIsSettingsOpen,
    showToast,
    currentSong,
    isPlaying,
  } = useMusic();

  const user = JSON.parse(localStorage.getItem("groove_user") || "null") || {
    name: "Guest",
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await fetch(apiUrl("/api/home-data"));
        const data = await res.json();
        setHomeData(data);
      } catch (error) {
        console.error("Failed to load home data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  useEffect(() => {
    const syncDownloads = async () => {
      try {
        const items = await getAllSongs();
        setDownloadedCount(items.length);
      } catch {
        setDownloadedCount(0);
      }
    };
    syncDownloads();
    window.addEventListener("downloadsUpdated", syncDownloads);
    return () => window.removeEventListener("downloadsUpdated", syncDownloads);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleCardClick = (item) => {
    if (item.type === "song") {
      playDirect(item.id);
    } else if (item.type === "show" || item.type === "podcast") {
      navigate(`/show/${item.id}`);
    } else {
      navigate(`/playlist/${item.id}`);
    }
  };

  const playDirect = async (songId, e) => {
    e?.stopPropagation();
    setPlayingId(songId);
    try {
      const res = await fetch(apiUrl(`/api/search?id=${songId}`));
      const data = await res.json();
      const rawSong = data[songId];
      if (rawSong) {
        const cleanTrack = formatSongData(rawSong);
        playSong(cleanTrack);
      }
    } catch (error) {
      console.error("Failed to play song directly:", error);
      showToast("Could not load track", "error");
    } finally {
      setPlayingId(null);
    }
  };

  const playRadio = async (station) => {
    if (!station) return;
    setPlayingId(station.id);
    try {
      const res = await fetch(
        apiUrl(
          `/api/radio?name=${encodeURIComponent(station.title)}&permaUrl=${encodeURIComponent(station.perma_url || "")}`,
        ),
      );

      if (res.ok) {
        const rawSongs = await res.json();
        const cleanTracks = rawSongs.map(formatSongData).filter(Boolean);

        if (cleanTracks.length > 0) {
          playSong(cleanTracks[0], true, true);
          setQueue(cleanTracks.slice(1));
          showToast(`Playing ${cleanHtmlText(station.title)} Radio`);
        } else {
          showToast("Station has no tracks right now", "error");
        }
      }
    } catch (error) {
      console.error("Failed to start radio:", error);
      showToast("Failed to start radio", "error");
    } finally {
      setPlayingId(null);
    }
  };

  const handleDailyMix = () => {
    const randomMix = pickRandomItem(homeData?.top_playlists);
    if (randomMix) navigate(`/playlist/${randomMix.id}`);
  };

  const handleQuickRadio = () => {
    const station = pickRandomItem(homeData?.radio);
    if (station) {
      playRadio(station);
    } else if (homeData?.new_trending?.length) {
      const song = homeData.new_trending.find((i) => i.type === "song");
      if (song) playDirect(song.id);
    }
  };

  if (loading) {
    return (
      <div className="scrollable-page fade-in">
        <header className="majestic-header">
          <div className="skeleton skeleton-title" style={{ margin: 0 }}></div>
        </header>
        <div className="home-content-wrapper" style={{ marginTop: 12 }}>
          <div className="skeleton skeleton-hero"></div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div className="skeleton" style={{ height: 68 }}></div>
            <div className="skeleton" style={{ height: 68 }}></div>
            <div className="skeleton" style={{ height: 68 }}></div>
            <div className="skeleton" style={{ height: 68 }}></div>
          </div>
          <div className="skeleton" style={{ height: 180 }}></div>
        </div>
      </div>
    );
  }

  const lineClamp2 = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
  };

  const lineClamp1 = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    width: "100%",
  };

  const podcastCategories = homeData?.podcast_categories || [];

  return (
    <div className="scrollable-page fade-in">
      <header className="majestic-header">
        <div className="header-ambient-glow"></div>
        <div className="header-content">
          <div>
            <p className="header-date">Curated Hi-Fi Session</p>
            <h1 className="home-greeting">
              {getGreeting()},<br />
              <span style={{ color: "#f5ece6" }}>
                {(user.name || "Guest").split(" ")[0]}
              </span>
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="icon-btn native-tap"
              onClick={() => setIsSettingsOpen(true)}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              title="Audio & Download Settings"
            >
              <SlidersHorizontal size={18} color="#ffe5b6" />
            </button>
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
        </div>
      </header>

      <div className="home-toggle-container">
        <div className="home-toggle-bg">
          <button
            className={`home-toggle-btn ${activeTab === "music" ? "active" : ""}`}
            onClick={() => setActiveTab("music")}
          >
            Music
          </button>
          <button
            className={`home-toggle-btn ${activeTab === "podcast" ? "active" : ""}`}
            onClick={() => setActiveTab("podcast")}
          >
            Podcasts
          </button>
        </div>
      </div>

      <div className="home-content-wrapper">
        {activeTab === "music" ? (
          <>
            {/* TIER 1: TRENDING HERO */}
            {homeData?.new_trending && (
              <section className="home-shelf" style={{ marginTop: "-8px" }}>
                <div className="hero-carousel native-scroll-lock">
                  {homeData.new_trending.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="hero-card native-tap"
                      onClick={() => handleCardClick(item)}
                    >
                      <img
                        src={item.image.replace("150x150", "500x500")}
                        alt={cleanHtmlText(item.title)}
                        className="hero-img"
                        loading="lazy"
                      />
                      <div className="hero-card-overlay">
                        <div className="hero-card-text">
                          <span className="hero-badge">
                            {item.type === "song"
                              ? "TRENDING TRACK"
                              : "TRENDING ALBUM"}
                          </span>
                          <h3 className="hero-title" style={lineClamp2}>
                            {cleanHtmlText(item.title)}
                          </h3>
                        </div>
                        {item.type === "song" && (
                          <button
                            className="hero-play-btn"
                            onClick={(e) => playDirect(item.id, e)}
                          >
                            {playingId === item.id ? (
                              <div className="tiny-loader-dark"></div>
                            ) : (
                              <Play
                                size={22}
                                color="#110f0d"
                                fill="#110f0d"
                                style={{ marginLeft: "3px" }}
                              />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TIER 2: QUICK ACCESS JUMP CARDS */}
            <section className="home-shelf">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  className="majestic-jump-card native-tap"
                  onClick={() => navigate("/library/liked")}
                  style={{ padding: 0 }}
                >
                  <div
                    style={{
                      width: 56,
                      height: "100%",
                      background: "linear-gradient(135deg, #1DB954, #116830)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Heart size={22} color="#fff" fill="#fff" />
                  </div>
                  <span>Liked Songs</span>
                </div>

                <div
                  className="majestic-jump-card native-tap"
                  onClick={handleDailyMix}
                  style={{ padding: 0 }}
                >
                  <div
                    style={{
                      width: 56,
                      height: "100%",
                      background: "linear-gradient(135deg, #ffe5b6, #a37b36)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Shuffle size={22} color="#110f0d" />
                  </div>
                  <span>Daily Mix</span>
                </div>

                <div
                  className="majestic-jump-card native-tap"
                  onClick={() => navigate("/library/downloads")}
                  style={{ padding: 0 }}
                >
                  <div
                    style={{
                      width: 56,
                      height: "100%",
                      background: "linear-gradient(135deg, #2c2825, #181513)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <DownloadCloud size={22} color="#1DB954" />
                  </div>
                  <div style={{ padding: "0 12px", minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        color: "#f5ece6",
                      }}
                    >
                      Downloads
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#a89f98" }}>
                      {downloadedCount} offline
                    </div>
                  </div>
                </div>

                <div
                  className="majestic-jump-card native-tap"
                  onClick={handleQuickRadio}
                  style={{ padding: 0 }}
                >
                  <div
                    style={{
                      width: 56,
                      height: "100%",
                      background: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Radio size={22} color="#fff" />
                  </div>
                  <span>Live Radio</span>
                </div>
              </div>
            </section>

            {/* RECENTLY PLAYED SHELF */}
            {recentlyPlayed.length > 0 && (
              <section className="home-shelf">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <Clock3 size={18} color="#ffe5b6" />
                  <h2
                    className="majestic-shelf-title"
                    style={{ margin: 0 }}
                  >
                    Jump Back In
                  </h2>
                </div>
                <div className="shelf-carousel native-scroll-lock">
                  {recentlyPlayed.slice(0, 12).map(({ song }) => {
                    const isCurrent = currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        className="carousel-card native-tap"
                        onClick={() => playSong(song)}
                        style={{ width: "145px", position: "relative" }}
                      >
                        <div className="carousel-img-wrapper">
                          <img
                            src={
                              song.albumArt?.[2]?.url ||
                              song.albumArt?.[1]?.url ||
                              song.albumArt?.[0]?.url ||
                              "https://c.saavncdn.com/default_album.jpg"
                            }
                            alt={song.title}
                            className="carousel-img elevated-img"
                            loading="lazy"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSongActions(song);
                            }}
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "rgba(17,15,13,0.75)",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                            title="More actions"
                          >
                            <MoreHorizontal size={15} color="#fff" />
                          </button>
                          {isCurrent && isPlaying && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: 8,
                                right: 8,
                                background: "rgba(17,15,13,0.85)",
                                padding: "4px 7px",
                                borderRadius: 999,
                              }}
                            >
                              <div className="eq-bars">
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                            </div>
                          )}
                        </div>
                        <h4
                          className="carousel-title"
                          style={{
                            color: isCurrent ? "#1DB954" : "#f5ece6",
                            ...lineClamp1,
                          }}
                        >
                          {song.title}
                        </h4>
                        <p
                          style={{
                            margin: "2px 0 0 0",
                            fontSize: "0.75rem",
                            color: "#a89f98",
                            ...lineClamp1,
                          }}
                        >
                          {song.artists?.[0]?.name || "Track"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TIER 3: CINEMATIC PLAYLISTS */}
            {homeData?.top_playlists && (
              <section className="home-shelf">
                <h2 className="majestic-shelf-title">Curated For You</h2>
                <div className="shelf-carousel cinematic-carousel native-scroll-lock">
                  {homeData.top_playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="cinematic-card native-tap"
                      onClick={() => handleCardClick(playlist)}
                    >
                      <img
                        src={playlist.image.replace("150x150", "500x500")}
                        alt={cleanHtmlText(playlist.title)}
                        className="cinematic-img"
                        loading="lazy"
                      />
                      <div className="cinematic-overlay">
                        <h4 className="cinematic-title" style={lineClamp2}>
                          {cleanHtmlText(playlist.title)}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TIER 4: NEW RELEASES */}
            {homeData?.new_albums && (
              <section className="home-shelf">
                <h2 className="majestic-shelf-title">New Releases</h2>
                <div className="shelf-carousel native-scroll-lock">
                  {homeData.new_albums.map((album) => (
                    <div
                      key={album.id}
                      className="carousel-card native-tap"
                      onClick={() => handleCardClick(album)}
                      style={{ width: "145px" }}
                    >
                      <div className="carousel-img-wrapper">
                        <img
                          src={album.image.replace("150x150", "500x500")}
                          alt={cleanHtmlText(album.title)}
                          className="carousel-img elevated-img"
                          loading="lazy"
                        />
                      </div>
                      <h4
                        className="carousel-title"
                        style={{
                          marginTop: "6px",
                          fontSize: "0.92rem",
                          ...lineClamp1,
                        }}
                      >
                        {cleanHtmlText(album.title)}
                      </h4>
                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "0.75rem",
                          color: "#a89f98",
                          ...lineClamp1,
                        }}
                      >
                        {cleanHtmlText(album.subtitle || "Album")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TIER 5: GLOBAL CHARTS */}
            {homeData?.charts && (
              <section className="home-shelf">
                <h2 className="majestic-shelf-title">Global Charts</h2>
                <div className="shelf-carousel native-scroll-lock">
                  {homeData.charts.map((chart) => (
                    <div
                      key={chart.id}
                      className="carousel-card native-tap"
                      onClick={() => handleCardClick(chart)}
                      style={{ width: "145px" }}
                    >
                      <div className="carousel-img-wrapper">
                        <img
                          src={chart.image.replace("150x150", "500x500")}
                          alt={cleanHtmlText(chart.title)}
                          className="carousel-img elevated-img"
                          loading="lazy"
                        />
                      </div>
                      <h4
                        className="carousel-title"
                        style={{ marginTop: "6px", ...lineClamp2 }}
                      >
                        {cleanHtmlText(chart.title)}
                      </h4>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TIER 6: RADIO STATIONS */}
            {homeData?.radio && (
              <section className="home-shelf">
                <h2 className="majestic-shelf-title">Radio Stations</h2>
                <div className="shelf-carousel native-scroll-lock">
                  {homeData.radio.map((station) => (
                    <div
                      key={station.id}
                      className="carousel-card native-tap"
                      onClick={() => playRadio(station)}
                      style={{ width: "125px" }}
                    >
                      <div
                        className="carousel-img-wrapper"
                        style={{
                          borderRadius: "50%",
                          overflow: "hidden",
                          position: "relative",
                          width: "125px",
                          height: "125px",
                        }}
                      >
                        <img
                          src={station.image.replace("150x150", "500x500")}
                          alt={cleanHtmlText(station.title)}
                          className="carousel-img"
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            opacity: playingId === station.id ? 0.5 : 1,
                          }}
                        />
                        {playingId === station.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <div
                              className="tiny-loader-dark"
                              style={{ borderTopColor: "#1DB954" }}
                            ></div>
                          </div>
                        )}
                      </div>
                      <h4
                        className="carousel-title"
                        style={{
                          marginTop: "10px",
                          textAlign: "center",
                          ...lineClamp2,
                        }}
                      >
                        {cleanHtmlText(station.title)}
                      </h4>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="fade-in">
            {podcastCategories.length > 0 ? (
              podcastCategories.map((category, idx) => (
                <section
                  className="home-shelf"
                  key={idx}
                  style={{ marginTop: idx === 0 ? "-10px" : "10px" }}
                >
                  <h2 className="majestic-shelf-title">{category.title}</h2>
                  <div className="shelf-carousel cinematic-carousel native-scroll-lock">
                    {category.data.map((show) => (
                      <div
                        key={show.id}
                        className="cinematic-card native-tap"
                        onClick={() => handleCardClick(show)}
                      >
                        <img
                          src={
                            show.image
                              ? show.image.replace("150x150", "500x500")
                              : "https://c.saavncdn.com/default_album.jpg"
                          }
                          alt={cleanHtmlText(show.title)}
                          className="cinematic-img"
                          loading="lazy"
                        />
                        <div className="cinematic-overlay">
                          <h4 className="cinematic-title" style={lineClamp2}>
                            {cleanHtmlText(show.title)}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section className="home-shelf">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "60px 20px",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  <Mic2
                    size={64}
                    color="#1DB954"
                    style={{ marginBottom: "20px" }}
                  />
                  <h2
                    style={{
                      fontSize: "1.8rem",
                      color: "#fff",
                      fontFamily: "var(--font-editorial, serif)",
                      marginBottom: "10px",
                    }}
                  >
                    Curating Podcasts
                  </h2>
                  <p style={{ color: "#a89f98", fontSize: "0.95rem" }}>
                    No podcast categories loaded right now. Try searching in
                    Search &gt; Podcasts!
                  </p>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
