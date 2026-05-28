import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMusic } from "../context/MusicContext";
import { formatSongData } from "../utils/formatters";
import { Play } from "lucide-react";

export default function Home() {
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const navigate = useNavigate();
  const { playSong } = useMusic();

  const user = JSON.parse(localStorage.getItem("groove_user")) || {
    name: "Guest",
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const res = await fetch("/api/home-data");
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  };

  const handleCardClick = (item) => {
    if (item.type === "song") {
      playDirect(item.id);
    } else {
      navigate(`/playlist/${item.id}`);
    }
  };

  const playDirect = async (songId, e) => {
    e?.stopPropagation();
    setPlayingId(songId);
    try {
      const res = await fetch(`/api/search?id=${songId}`);
      const data = await res.json();
      const rawSong = data[songId];
      if (rawSong) {
        const cleanTrack = formatSongData(rawSong);
        playSong(cleanTrack);
      }
    } catch (error) {
      console.error("Failed to play song directly:", error);
    } finally {
      setPlayingId(null);
    }
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
    <div className="scrollable-page fade-in">
      <header className="majestic-header">
        <div className="header-ambient-glow"></div>
        <div className="header-content">
          <div>
            <h1 className="home-greeting">
              {getGreeting()},<br />
              <span style={{ color: "#f5ece6" }}>
                {user.name.split(" ")[0]}
              </span>
            </h1>
          </div>
          <div
            className="user-avatar-placeholder majestic-avatar native-tap"
            onClick={() => navigate("/library")}
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
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </header>

      <div className="home-content-wrapper">
        {homeData?.new_trending && (
          <section className="home-shelf" style={{ marginTop: "-10px" }}>
            <div className="hero-carousel native-scroll-lock">
              {homeData.new_trending.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="hero-card native-tap"
                  onClick={() => handleCardClick(item)}
                >
                  <img
                    src={item.image.replace("150x150", "500x500")}
                    alt={item.title}
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
                      <h3 className="hero-title">{item.title}</h3>
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
                            size={24}
                            color="#110f0d"
                            fill="#110f0d"
                            style={{ marginLeft: "4px" }}
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

        {/* TIER 2: JUMP BACK IN */}
        <section className="home-shelf">
          <div className="shelf-grid">
            <div
              className="majestic-jump-card native-tap"
              onClick={() => navigate("/library")}
            >
              <div className="jump-gradient liked-gradient"></div>
              <span>Liked Songs</span>
            </div>
            <div className="majestic-jump-card native-tap">
              <div className="jump-gradient mix-gradient"></div>
              <span>Daily Mix</span>
            </div>
          </div>
        </section>

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
                    alt={playlist.title}
                    className="cinematic-img"
                    loading="lazy"
                  />
                  <div className="cinematic-overlay">
                    <h4 className="cinematic-title">{playlist.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TIER 4: GLOBAL CHARTS */}
        {homeData?.charts && (
          <section className="home-shelf">
            <h2 className="majestic-shelf-title">Global Charts</h2>
            <div className="shelf-carousel native-scroll-lock">
              {homeData.charts.map((chart) => (
                <div
                  key={chart.id}
                  className="carousel-card native-tap"
                  onClick={() => handleCardClick(chart)}
                >
                  <div className="carousel-img-wrapper">
                    <img
                      src={chart.image.replace("150x150", "500x500")}
                      alt={chart.title}
                      className="carousel-img elevated-img"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="carousel-title">{chart.title}</h4>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
