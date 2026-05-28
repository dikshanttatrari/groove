import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, ArrowLeft, MoreVertical, Shuffle, Heart } from "lucide-react";
import { useMusic } from "../context/MusicContext";

export default function PlaylistDetail() {
  console.log("PlaylistDetail component rendered");
  const { id } = useParams();
  console.log("PlaylistDetail mounted with ID:", id);
  const navigate = useNavigate();
  const { playSong } = useMusic();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylist = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://192.168.1.13:5000/api/playlist/${id}`);

        if (!res.ok) throw new Error("Failed to fetch playlist");

        const data = await res.json();

        setPlaylist({
          title: data.name,
          subtitle: `${data.curator || "Curated"} • ${data.songs?.length || 0} tracks`,
          image: data.image?.[2]?.link || data.image?.[0]?.link || data.image,
          songs: data.songs || [],
        });
      } catch (e) {
        console.error("Error fetching playlist:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  if (loading) return <div className="loader"></div>;

  return (
    <div className="scrollable-page fade-in">
      {/* HERO SECTION - Cinematic Gradient */}
      <header className="playlist-hero">
        <div
          className="playlist-hero-bg"
          style={{ backgroundImage: `url(${playlist.image})` }}
        ></div>
        <div className="playlist-hero-overlay"></div>

        <button
          className="icon-btn native-tap back-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={28} color="#ffffff" />
        </button>

        <div className="playlist-hero-content">
          <div className="playlist-art-shadow">
            <img
              src={playlist.image}
              alt={playlist.title}
              className="playlist-cover-img"
            />
          </div>
          <div className="playlist-text">
            <h1 className="playlist-title">{playlist.title}</h1>
            <p className="playlist-meta">{playlist.subtitle}</p>
          </div>
        </div>
      </header>

      {/* ACTION BAR - Compact & Premium */}
      <div className="playlist-action-bar">
        <button
          className="play-btn-large native-tap"
          onClick={() => playSong(playlist.songs[0])}
        >
          <Play
            size={28}
            color="#110f0d"
            fill="#110f0d"
            style={{ marginLeft: "4px" }}
          />
        </button>
        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          <Heart size={28} color="#a89f98" className="native-tap" />
          <Shuffle size={28} color="#a89f98" className="native-tap" />
          <MoreVertical size={28} color="#a89f98" className="native-tap" />
        </div>
      </div>

      {/* TRACKLIST - Truncation Enforced */}
      <main className="playlist-tracklist">
        {playlist.songs.map((song, index) => (
          <div
            key={song.id}
            className="track-row native-tap"
            onClick={() => playSong(song)}
          >
            <div className="track-info">
              <h4 className="track-title">{song.title}</h4>
              <p className="track-artist">{song.artist}</p>
            </div>
            <span className="track-duration">{song.duration}</span>
          </div>
        ))}
      </main>
    </div>
  );
}
