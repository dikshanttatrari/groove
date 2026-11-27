import { useState, useRef, useEffect } from "react";
import {
  Search as SearchIcon,
  X,
  Play,
  MoreHorizontal,
  Download,
  HardDriveDownload,
  Clock3,
  Sparkles,
} from "lucide-react";
import { apiUrl } from "../../utils/api";
import { cleanHtmlText, formatSongData } from "../../utils/formatters";
import { useMusic } from "../../context/MusicContext";
import { useNavigate } from "react-router-dom";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from "../../utils/preferences";
import { isSongDownloaded } from "../../utils/storage";
import { downloadSongToDevice, silentDownload } from "../../utils/downloadSongs";
import "./Search.css";

const getHighResImage = (url) => {
  if (!url) return "https://c.saavncdn.com/default_album.jpg";
  return url.replace("50x50", "500x500").replace("150x150", "500x500");
};

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "songs", label: "Songs" },
  { id: "podcasts", label: "Podcasts" },
  { id: "artists", label: "Artists" },
  { id: "playlists", label: "Playlists" },
];

const BROWSE_MOODS = [
  {
    label: "Bollywood Hits",
    sub: "Trending chartbusters",
    query: "Bollywood Top Hits",
    tab: "all",
    gradient: "linear-gradient(135deg, #1db954 0%, #0d4a22 100%)",
  },
  {
    label: "Late Night Lo-Fi",
    sub: "Ambient & chill",
    query: "Lofi Chill Hindi",
    tab: "songs",
    gradient: "linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%)",
  },
  {
    label: "Arijit & Romance",
    sub: "Soulful acoustics",
    query: "Arijit Singh",
    tab: "all",
    gradient: "linear-gradient(135deg, #be185d 0%, #500724 100%)",
  },
  {
    label: "Workout Energy",
    sub: "High-tempo beats",
    query: "Gym Workout Punjabi",
    tab: "songs",
    gradient: "linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)",
  },
  {
    label: "90s Gold",
    sub: "Timeless classics",
    query: "90s Bollywood Classics",
    tab: "playlists",
    gradient: "linear-gradient(135deg, #ca8a04 0%, #422006 100%)",
  },
  {
    label: "Sufi & Ghazals",
    sub: "Warm vinyl sessions",
    query: "Sufi Classics",
    tab: "songs",
    gradient: "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)",
  },
  {
    label: "Global Pop",
    sub: "Worldwide hits",
    query: "Top English Pop",
    tab: "songs",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #2e1065 100%)",
  },
  {
    label: "Podcasts & Talks",
    sub: "Stories & interviews",
    query: "Podcast",
    tab: "podcasts",
    gradient: "linear-gradient(135deg, #334155 0%, #0f172a 100%)",
  },
];

export default function Search() {
  const {
    playSong,
    openSongActions,
    showToast,
    settings,
    currentSong,
    isPlaying,
  } = useMusic();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() =>
    getRecentSearches(),
  );
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const [results, setResults] = useState({
    topResult: null,
    songs: [],
    artists: [],
    playlists: [],
    podcasts: [],
  });

  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName?.toLowerCase() !== "input"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const syncDownloads = async () => {
      if (!results.songs.length) return;
      const checks = await Promise.all(
        results.songs.map(async (s) => ({
          id: s.id,
          exists: await isSongDownloaded(s.id),
        })),
      );
      setDownloadedIds(checks.filter((c) => c.exists).map((c) => c.id));
    };
    syncDownloads();
    window.addEventListener("downloadsUpdated", syncDownloads);
    return () => window.removeEventListener("downloadsUpdated", syncDownloads);
  }, [results.songs]);

  const performSearch = async (searchQuery, tabType) => {
    const cleanQ = searchQuery.trim();
    if (!cleanQ) return;

    setLoading(true);
    setHasSearched(true);
    setRecentSearches(addRecentSearch(cleanQ));
    if (inputRef.current) inputRef.current.blur();

    try {
      const res = await fetch(
        apiUrl(
          `/api/search?q=${encodeURIComponent(cleanQ)}&type=${tabType}`,
        ),
      );
      const data = await res.json();

      let rawSongs = [];
      let rawArtists = [];
      let rawPlaylists = [];
      let rawPodcasts = [];

      if (tabType === "all") {
        rawSongs = data.songs?.data || data.results || [];
        rawArtists = data.artists?.data || [];
        rawPlaylists = data.playlists?.data || [];
        rawPodcasts = data.shows?.data || [];
      } else if (tabType === "songs") {
        rawSongs = data.results || data.data || [];
      } else if (tabType === "artists") {
        rawArtists = data.results || data.data || [];
      } else if (tabType === "playlists") {
        rawPlaylists = data.results || data.data || [];
      } else if (tabType === "podcasts") {
        rawPodcasts = data.shows?.data || data.results || [];
      }

      const cleanSongs = rawSongs.map(formatSongData).filter(Boolean);

      const cleanArtists = rawArtists.map((a) => ({
        id: a.id || a.artistid || a.token,
        title: cleanHtmlText(a.title || a.name || "Unknown Artist"),
        image: getHighResImage(a.image),
        type: "artist",
        subtitle: "Artist",
      }));

      const cleanPlaylists = rawPlaylists.map((p) => ({
        id: p.id || p.listid || p.token,
        title: cleanHtmlText(p.title || p.listname || "Unknown Playlist"),
        image: getHighResImage(p.image),
        type: "playlist",
        subtitle: "Playlist",
      }));

      const cleanPodcasts = rawPodcasts.map((p) => ({
        id: p.id || p.show_id,
        title: cleanHtmlText(p.title || p.show_title || "Unknown Podcast"),
        image: getHighResImage(p.image),
        type: "show",
        subtitle: cleanHtmlText(p.description || "Podcast"),
      }));

      let bestMatch = null;
      if (tabType === "all") {
        const qLower = cleanQ.toLowerCase();
        const firstArtist = cleanArtists.length > 0 ? cleanArtists[0] : null;

        if (
          firstArtist &&
          (firstArtist.title.toLowerCase().includes(qLower) ||
            qLower.includes(firstArtist.title.toLowerCase()))
        ) {
          bestMatch = firstArtist;
        } else if (cleanSongs.length > 0) {
          bestMatch = cleanSongs[0];
        } else if (cleanArtists.length > 0) {
          bestMatch = cleanArtists[0];
        } else if (cleanPodcasts.length > 0) {
          bestMatch = cleanPodcasts[0];
        } else if (cleanPlaylists.length > 0) {
          bestMatch = cleanPlaylists[0];
        }
      }

      const finalSongs =
        tabType === "all" && bestMatch && !bestMatch.type
          ? cleanSongs.filter((s) => s.id !== bestMatch.id)
          : cleanSongs;

      setResults({
        topResult: bestMatch,
        songs: finalSongs,
        artists: cleanArtists,
        playlists: cleanPlaylists,
        podcasts: cleanPodcasts,
      });
    } catch (error) {
      console.error("Search failed:", error);
      showToast("Search failed. Please check connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveTab("all");
    performSearch(query, "all");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (query.trim()) {
      performSearch(query, tabId);
    }
  };

  const handleQuickMood = (mood) => {
    setQuery(mood.query);
    setActiveTab(mood.tab);
    performSearch(mood.query, mood.tab);
  };

  const clearSearch = () => {
    setQuery("");
    setResults({
      topResult: null,
      songs: [],
      artists: [],
      playlists: [],
      podcasts: [],
    });
    setHasSearched(false);
    setActiveTab("all");
    inputRef.current?.focus();
  };

  const handleRowDownload = async (song, e) => {
    e.stopPropagation();
    if (downloadingId === song.id) return;
    setDownloadingId(song.id);

    if (downloadedIds.includes(song.id)) {
      const res = await downloadSongToDevice(song, {
        quality: settings.downloadQuality,
      });
      setDownloadingId(null);
      showToast(
        res.ok ? "Saved .m4a file to device" : "Device export failed",
        res.ok ? "default" : "error",
      );
      return;
    }

    const ok = await silentDownload(song);
    setDownloadingId(null);
    if (ok) {
      if (settings.downloadMode !== "device") {
        setDownloadedIds((prev) => [...prev, song.id]);
      }
      showToast(
        settings.downloadMode === "offline"
          ? "Saved to offline vault"
          : `Downloaded .m4a (${settings.downloadQuality})`,
      );
    } else {
      showToast("Download failed", "error");
    }
  };

  const renderPremiumSongList = (songsToRender) => (
    <div className="spotify-song-list">
      {songsToRender.map((song) => {
        const isCurrent = currentSong?.id === song.id;
        const isSavedOffline = downloadedIds.includes(song.id);
        return (
          <div
            key={song.id}
            onClick={() => playSong(song)}
            className="spotify-song-row native-tap"
          >
            <div className="song-img-wrapper">
              <img
                src={song.albumArt[1]?.url || song.albumArt[0]?.url}
                alt="cover"
                className="song-row-img"
                loading="lazy"
              />
              <div className="song-hover-play">
                <Play fill="#fff" size={18} color="#fff" />
              </div>
            </div>
            <div className="song-row-info">
              <h4
                className="song-row-title"
                style={{ color: isCurrent ? "#1DB954" : "#fff" }}
              >
                {song.title}
              </h4>
              <p className="song-row-artist">
                {song.artists?.[0]?.name || "Unknown Artist"}
                {song.duration ? ` • ${song.duration}` : ""}
              </p>
            </div>
            <div className="song-row-actions">
              {isCurrent && isPlaying && (
                <div className="eq-bars" style={{ marginRight: 4 }}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}

              {downloadingId === song.id ? (
                <div className="download-ring-container">
                  <Download
                    size={11}
                    color="#1DB954"
                    className="inner-download-icon"
                  />
                  <svg className="spotify-spinner" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#1DB954"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="45"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              ) : isSavedOffline ? (
                <button
                  className="icon-btn native-tap"
                  onClick={(e) => handleRowDownload(song, e)}
                  title="Saved offline — tap to save .m4a file"
                  style={{
                    width: 24,
                    height: 24,
                    background: "#1DB954",
                    borderRadius: "50%",
                  }}
                >
                  <HardDriveDownload size={13} color="#000" strokeWidth={2.6} />
                </button>
              ) : (
                <button
                  className="icon-btn native-tap"
                  onClick={(e) => handleRowDownload(song, e)}
                  title="Download track"
                >
                  <Download size={18} color="#a89f98" />
                </button>
              )}

              <button
                className="icon-btn native-tap"
                onClick={(e) => {
                  e.stopPropagation();
                  openSongActions(song);
                }}
                title="Track options"
              >
                <MoreHorizontal size={20} color="#b3b3b3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCards = (items, layoutClass) => (
    <div className={layoutClass}>
      {items.map((item) => {
        const isArtist = item.type === "artist";
        const imgUrl =
          item.image || item.albumArt?.[1]?.url || item.albumArt?.[0]?.url;

        return (
          <div
            key={item.id}
            className="spotify-card native-tap"
            style={layoutClass === "spotify-shelf" ? { minWidth: "160px" } : {}}
            onClick={() => navigate(`/${item.type}/${item.id}`)}
          >
            <img
              src={imgUrl}
              alt="cover"
              className={`spotify-card-img ${isArtist ? "artist-img" : ""}`}
              loading="lazy"
            />
            <h4 className="spotify-card-title">{item.title}</h4>
            <p className="spotify-card-subtitle">{item.subtitle}</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="search-page-wrapper fade-in">
      <h1 className="search-header-title">Search</h1>

      <div className="search-input-container">
        <form onSubmit={handleSearchSubmit}>
          <div className="premium-search-box">
            <SearchIcon size={21} color="#ffe5b6" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Songs, artists, podcasts, or moods... (Press /)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input-field"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="icon-btn native-tap"
                onClick={clearSearch}
              >
                <X size={20} color="#fff" />
              </button>
            )}
          </div>
        </form>
      </div>

      {hasSearched && !loading && (
        <div className="search-pills-scroll">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`search-pill native-tap ${activeTab === cat.id ? "active" : ""}`}
              onClick={() => handleTabChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <main>
        {!hasSearched && !loading && (
          <div className="fade-in">
            {recentSearches.length > 0 && (
              <div className="recent-searches-box">
                <div className="recent-header">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Clock3 size={16} color="#ffe5b6" />
                    <h2 className="section-title" style={{ margin: 0 }}>
                      Recent Searches
                    </h2>
                  </div>
                  <button
                    className="recent-clear-btn"
                    onClick={() => setRecentSearches(clearRecentSearches())}
                  >
                    Clear All
                  </button>
                </div>
                <div className="recent-chips">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="recent-chip"
                      onClick={() => {
                        setQuery(term);
                        setActiveTab("all");
                        performSearch(term, "all");
                      }}
                    >
                      <span>{term}</span>
                      <X
                        size={14}
                        color="#a89f98"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecentSearches(removeRecentSearch(term));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Sparkles size={18} color="#ffe5b6" />
              <h2 className="section-title" style={{ margin: 0 }}>
                Browse Moods & Genres
              </h2>
            </div>
            <div className="mood-grid">
              {BROWSE_MOODS.map((mood) => (
                <div
                  key={mood.label}
                  className="mood-tile native-tap"
                  style={{ background: mood.gradient }}
                  onClick={() => handleQuickMood(mood)}
                >
                  <h4>{mood.label}</h4>
                  <span>{mood.sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "60px 0",
            }}
          >
            <div className="majestic-loader"></div>
          </div>
        )}

        {!loading &&
          hasSearched &&
          results.songs.length === 0 &&
          results.artists.length === 0 &&
          results.playlists.length === 0 &&
          results.podcasts.length === 0 &&
          !results.topResult && (
            <div
              style={{
                textAlign: "center",
                paddingTop: "60px",
                color: "#a89f98",
              }}
            >
              <h3>No results found for "{query}"</h3>
              <p>Try checking your spelling or exploring a different keyword.</p>
            </div>
          )}

        {!loading && activeTab === "all" && results.topResult && (
          <>
            <div className="spotify-split-top">
              <div>
                <h2 className="section-title">Top result</h2>
                <div
                  className="top-result-card native-tap"
                  onClick={() =>
                    results.topResult.type
                      ? navigate(
                          `/${results.topResult.type}/${results.topResult.id}`,
                        )
                      : playSong(results.topResult)
                  }
                >
                  <img
                    src={
                      results.topResult.type
                        ? results.topResult.image
                        : results.topResult.albumArt?.[2]?.url ||
                          results.topResult.albumArt?.[0]?.url
                    }
                    alt="cover"
                    className={`top-result-image ${results.topResult.type === "artist" ? "artist-img" : ""}`}
                  />
                  <div className="top-result-info">
                    <h3 className="top-result-title">
                      {results.topResult.title}
                    </h3>
                    <div className="top-result-meta">
                      <span className="top-result-badge">
                        {results.topResult.type || "Song"}
                      </span>
                      <span className="top-result-subtitle">
                        {results.topResult.artists?.[0]?.name ||
                          results.topResult.subtitle ||
                          ""}
                      </span>
                    </div>
                  </div>
                  {!results.topResult.type && (
                    <div className="top-result-play">
                      <Play
                        fill="#000"
                        size={26}
                        color="#000"
                        style={{ marginLeft: "3px" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {results.songs.length > 0 && (
                <div>
                  <h2 className="section-title">Songs</h2>
                  {renderPremiumSongList(results.songs.slice(0, 4))}
                </div>
              )}
            </div>

            {results.artists.length > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <h2 className="section-title">Artists</h2>
                {renderCards(results.artists.slice(0, 6), "spotify-shelf")}
              </div>
            )}

            {results.podcasts.length > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <h2 className="section-title">Podcasts</h2>
                {renderCards(results.podcasts.slice(0, 6), "spotify-shelf")}
              </div>
            )}

            {results.playlists.length > 0 && (
              <div style={{ marginBottom: "30px" }}>
                <h2 className="section-title">Playlists</h2>
                {renderCards(results.playlists.slice(0, 6), "spotify-shelf")}
              </div>
            )}
          </>
        )}

        {!loading && activeTab === "songs" && results.songs.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <h2 className="section-title">All Songs</h2>
            {renderPremiumSongList(results.songs)}
          </div>
        )}

        {!loading && activeTab === "artists" && results.artists.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <h2 className="section-title">Artists</h2>
            {renderCards(results.artists, "spotify-card-grid")}
          </div>
        )}

        {!loading &&
          activeTab === "podcasts" &&
          results.podcasts.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h2 className="section-title">Podcasts</h2>
              {renderCards(results.podcasts, "spotify-card-grid")}
            </div>
          )}

        {!loading &&
          activeTab === "playlists" &&
          results.playlists.length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h2 className="section-title">Playlists</h2>
              {renderCards(results.playlists, "spotify-card-grid")}
            </div>
          )}
      </main>
    </div>
  );
}
