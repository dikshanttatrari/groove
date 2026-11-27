import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMusic } from "../../context/MusicContext";
import { apiUrl } from "../../utils/api";
import { cleanHtmlText, formatSongData } from "../../utils/formatters";
import { isShowSaved, toggleSavedShow } from "../../utils/preferences";
import { isSongDownloaded } from "../../utils/storage";
import { downloadSongToDevice, silentDownload } from "../../utils/downloadSongs";
import {
  Play,
  ArrowLeft,
  MoreVertical,
  Heart,
  Download,
  HardDriveDownload,
  Shuffle,
} from "lucide-react";
import "./ShowDetail.css";

const extractImageUrl = (imgData) => {
  if (!imgData) return "https://c.saavncdn.com/default_album.jpg";
  if (typeof imgData === "string")
    return imgData.replace("150x150", "500x500").replace("50x50", "500x500");
  if (Array.isArray(imgData) && imgData.length > 0)
    return imgData[imgData.length - 1]?.url || imgData[0]?.url;
  return "https://c.saavncdn.com/default_album.jpg";
};

export default function ShowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    playList,
    currentSong,
    isPlaying,
    openSongActions,
    showToast,
    settings,
  } = useMusic();

  const [podcastData, setPodcastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedOverrides, setSavedOverrides] = useState({});
  const [downloadedIds, setDownloadedIds] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const savedShow = savedOverrides[id] ?? isShowSaved(id);

  useEffect(() => {
    let active = true;
    const fetchShowDetails = async () => {
      try {
        const res = await fetch(apiUrl(`/api/show/${id}`));
        const data = await res.json();

        if (data && data.episodes && Array.isArray(data.episodes)) {
          data.episodes = [...data.episodes].reverse();
        }
        if (active) setPodcastData(data);
      } catch (error) {
        console.error("Failed to load show details", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchShowDetails();
    return () => {
      active = false;
    };
  }, [id]);

  const details = useMemo(() => podcastData?.show_details || {}, [podcastData]);
  const episodesList = useMemo(
    () => podcastData?.episodes || [],
    [podcastData],
  );
  const globalShowImage =
    details.image ||
    podcastData?.seasons?.[0]?.image ||
    "https://c.saavncdn.com/default_album.jpg";

  const formattedEpisodes = useMemo(
    () =>
      episodesList
        .map((ep) =>
          formatSongData({ ...ep, image: ep.image || globalShowImage }),
        )
        .filter(Boolean),
    [episodesList, globalShowImage],
  );

  useEffect(() => {
    const syncDownloads = async () => {
      if (!formattedEpisodes.length) return;
      const checks = await Promise.all(
        formattedEpisodes.map(async (ep) => ({
          id: ep.id,
          exists: await isSongDownloaded(ep.id),
        })),
      );
      setDownloadedIds(checks.filter((c) => c.exists).map((c) => c.id));
    };
    syncDownloads();
    window.addEventListener("downloadsUpdated", syncDownloads);
    return () => window.removeEventListener("downloadsUpdated", syncDownloads);
  }, [formattedEpisodes]);

  const handlePlayEpisode = (index, shuffle = false) => {
    if (formattedEpisodes.length === 0) return;
    playList(formattedEpisodes, index, { shuffle, preventFetch: true });
  };

  const handleToggleSaveShow = () => {
    const nowSaved = toggleSavedShow({
      id,
      title: cleanHtmlText(details.title || "Podcast Show"),
      image: extractImageUrl(globalShowImage),
      subtitle: `${episodesList.length} episodes`,
    });
    setSavedOverrides((prev) => ({ ...prev, [id]: nowSaved }));
    showToast(nowSaved ? "Saved show to Library" : "Removed from Library");
  };

  const handleEpisodeDownload = async (epTrack, e) => {
    e.stopPropagation();
    if (!epTrack || downloadingId === epTrack.id) return;
    setDownloadingId(epTrack.id);

    if (downloadedIds.includes(epTrack.id)) {
      const res = await downloadSongToDevice(epTrack, {
        quality: settings.downloadQuality,
      });
      setDownloadingId(null);
      showToast(
        res.ok ? "Saved episode .m4a to device" : "Export failed",
        res.ok ? "default" : "error",
      );
      return;
    }

    const ok = await silentDownload(epTrack);
    setDownloadingId(null);
    if (ok) {
      if (settings.downloadMode !== "device") {
        setDownloadedIds((prev) => [...prev, epTrack.id]);
      }
      showToast(
        settings.downloadMode === "offline"
          ? "Episode saved offline"
          : "Episode downloaded (.m4a)",
      );
    } else {
      showToast("Episode download failed", "error");
    }
  };

  const handleBatchDownload = async () => {
    if (batchDownloading || formattedEpisodes.length === 0) return;
    setBatchDownloading(true);
    const pending = formattedEpisodes.filter(
      (ep) => !downloadedIds.includes(ep.id),
    );
    for (const ep of pending) {
      const ok = await silentDownload(ep, { mode: "offline" });
      if (ok) setDownloadedIds((prev) => [...prev, ep.id]);
    }
    setBatchDownloading(false);
    window.dispatchEvent(new Event("downloadsUpdated"));
    showToast("Episodes saved to offline vault");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#110f0d",
        }}
      >
        <div className="majestic-loader"></div>
      </div>
    );
  }

  if (!podcastData || podcastData.error) {
    return (
      <div
        className="show-detail-wrapper"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2>Show Unreachable</h2>
        <button
          onClick={() => navigate(-1)}
          className="vibe-play-circle"
          style={{
            marginTop: "20px",
            borderRadius: "100px",
            width: "auto",
            padding: "10px 24px",
            fontWeight: 700,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const allEpisodesOffline =
    formattedEpisodes.length > 0 &&
    downloadedIds.length === formattedEpisodes.length;

  return (
    <div className="show-detail-wrapper fade-in scrollable-page">
      <div className="vibe-gradient-bg">
        <img src={extractImageUrl(globalShowImage)} alt="blur bg" />
      </div>

      <header className="show-nav">
        <button
          className="show-nav-circle-btn native-tap"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </button>
      </header>

      <div className="vibe-header-block">
        <img
          src={extractImageUrl(globalShowImage)}
          alt={cleanHtmlText(details.title)}
          className="vibe-cover-art"
        />
        <div className="vibe-title-block">
          <h1>{cleanHtmlText(details.title || "Podcast Show")}</h1>
          <p className="vibe-subtitle">
            Groove Podcasts • {episodesList.length} episodes
          </p>
        </div>
      </div>

      <div className="vibe-action-bar">
        <button
          className="vibe-play-circle native-tap"
          onClick={() => handlePlayEpisode(0, false)}
        >
          <Play
            size={28}
            fill="#000"
            color="#000"
            style={{ marginLeft: "4px" }}
          />
        </button>

        <div className="vibe-secondary-actions">
          {batchDownloading ? (
            <div className="download-ring-container">
              <Download
                size={12}
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
          ) : (
            <button
              className="vibe-icon-btn native-tap"
              onClick={handleBatchDownload}
              title={
                allEpisodesOffline
                  ? "All episodes saved offline"
                  : "Save all episodes offline"
              }
            >
              <Download
                size={22}
                color={allEpisodesOffline ? "#1DB954" : "currentColor"}
              />
            </button>
          )}

          <button
            className="vibe-icon-btn native-tap"
            onClick={handleToggleSaveShow}
            title={savedShow ? "Remove saved show" : "Save show to Library"}
          >
            <Heart
              size={22}
              color={savedShow ? "#1DB954" : "currentColor"}
              fill={savedShow ? "#1DB954" : "none"}
            />
          </button>
          <button
            className="vibe-icon-btn native-tap"
            onClick={() => handlePlayEpisode(0, true)}
            title="Shuffle episodes"
          >
            <Shuffle size={22} />
          </button>
        </div>
      </div>

      <div className="vibe-tracklist">
        {formattedEpisodes.length > 0 ? (
          formattedEpisodes.map((epTrack, index) => {
            const isCurrentlyPlaying = currentSong?.id === epTrack.id;
            const epImage =
              epTrack.albumArt?.[1]?.url || extractImageUrl(globalShowImage);
            const isSaved = downloadedIds.includes(epTrack.id);

            return (
              <div
                key={epTrack.id || index}
                className={`vibe-track-row native-tap ${isCurrentlyPlaying ? "active-playing" : ""}`}
                onClick={() => handlePlayEpisode(index, false)}
              >
                <div className="vibe-track-index">
                  {isCurrentlyPlaying && isPlaying ? (
                    <div className="eq-bars" style={{ margin: "0 auto" }}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                <img src={epImage} alt="ep art" className="vibe-track-art" />

                <div className="vibe-track-info">
                  <h4 className="vibe-track-title">
                    {epTrack.title || "Untitled Episode"}
                  </h4>
                  <p className="vibe-track-subtitle">
                    {cleanHtmlText(details.title)}
                    {epTrack.duration ? ` • ${epTrack.duration}` : ""}
                  </p>
                </div>

                <div className="vibe-track-actions">
                  {downloadingId === epTrack.id ? (
                    <div
                      className="download-ring-container"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                  ) : isSaved ? (
                    <button
                      className="vibe-icon-btn native-tap"
                      onClick={(e) => handleEpisodeDownload(epTrack, e)}
                      title="Saved offline — tap to save .m4a file"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#1DB954",
                      }}
                    >
                      <HardDriveDownload
                        size={13}
                        color="#000"
                        strokeWidth={2.5}
                      />
                    </button>
                  ) : (
                    <button
                      className="vibe-icon-btn native-tap"
                      onClick={(e) => handleEpisodeDownload(epTrack, e)}
                    >
                      <Download size={18} />
                    </button>
                  )}

                  <button
                    className="vibe-icon-btn native-tap"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSongActions(epTrack);
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ color: "#666", textAlign: "center", padding: "40px 0" }}>
            No episodes found.
          </p>
        )}
      </div>
    </div>
  );
}
