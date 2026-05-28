import { useState, useEffect } from "react";
import { useMusic } from "../context/MusicContext";
import {
  Play,
  Pause,
  ChevronDown,
  SkipForward,
  SkipBack,
  Heart,
  Shuffle,
  Repeat,
  Timer,
  ListPlus,
  MoreVertical,
} from "lucide-react";

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds)) return "0:00";
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const getImageUrl = (artArray, preferredIndex) => {
  if (!Array.isArray(artArray) || artArray.length === 0) {
    return "https://via.placeholder.com/500x500/1c1917/ffe5b6?text=🎵";
  }
  return (
    artArray[preferredIndex]?.url ||
    artArray[artArray.length - 1]?.url ||
    artArray[0]?.url
  );
};

export default function Player() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    hasError,
    progress,
    currentTime,
    duration,
    seek,
  } = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0);

  // Aggressive Theme Color switching for Android
  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      // If expanded, set to black so it blends with the bottom gradient
      metaThemeColor.setAttribute(
        "content",
        isExpanded ? "#000000" : "#110f0d",
      );
    }
  }, [isExpanded]);

  if (!currentSong) return null;

  const highResImage = getImageUrl(currentSong.albumArt, 2);
  const lowResImage = getImageUrl(currentSong.albumArt, 1);

  if (isExpanded) {
    return (
      <div className="full-player native-scroll-lock">
        {/* SPOTIFY STYLE BACKGROUND: Vibrant top, fading to pitch black bottom */}
        <div className="player-ambient-bg">
          <img src={highResImage} alt="ambient" className="ambient-blur" />
          <div className="ambient-gradient"></div>
        </div>

        <div className="full-player-content">
          {/* Header */}
          <header className="full-player-header">
            <button
              className="icon-btn native-tap"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown size={32} color="#ffffff" />
            </button>
            <span className="now-playing-label">
              {currentSong.album || "NOW PLAYING"}
            </span>
            <button className="icon-btn native-tap">
              <MoreVertical size={28} color="#ffffff" />
            </button>
          </header>

          {/* Massive Artwork */}
          <div className="art-container">
            <img
              src={highResImage}
              alt="Album Art"
              className={`premium-art ${isPlaying ? "playing" : "paused"}`}
              style={{ filter: hasError ? "grayscale(100%)" : "none" }}
            />
          </div>

          {/* Left-Aligned Info & Heart */}
          <div className="info-action-row">
            <div className="full-player-text">
              <h2 className="premium-title scroll-text">
                {hasError ? "Stream Unavailable" : currentSong.title}
              </h2>
              <h3 className="premium-artist">
                {currentSong.artists[0]?.name || "Unknown Artist"}
              </h3>
            </div>
            <button
              className="icon-btn native-tap heart-container"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart
                size={30}
                color={isLiked ? "#1DB954" : "#ffffff"}
                fill={isLiked ? "#1DB954" : "none"}
                className={isLiked ? "heart-pop" : ""}
              />
            </button>
          </div>

          {/* Precision Progress Bar */}
          <div className="premium-slider-container">
            <input
              type="range"
              className="premium-slider native-tap"
              min="0"
              max="100"
              value={progress || 0}
              onChange={(e) => seek(e.target.value)}
              disabled={hasError}
              style={{ backgroundSize: `${progress}% 100%` }}
            />
            <div className="time-display">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Playback Controls */}
          <div className="premium-controls">
            <button
              className="icon-btn native-tap"
              onClick={() => setIsShuffle(!isShuffle)}
            >
              <Shuffle
                size={24}
                color={isShuffle ? "#1DB954" : "rgba(255,255,255,0.7)"}
              />
            </button>
            <button className="icon-btn native-tap">
              <SkipBack size={40} color="#ffffff" fill="#ffffff" />
            </button>
            <button
              className="premium-play-btn native-tap"
              onClick={togglePlay}
              disabled={hasError}
            >
              {isPlaying ? (
                <Pause size={36} color="#000000" fill="#000000" />
              ) : (
                <Play
                  size={36}
                  color="#000000"
                  fill="#000000"
                  style={{ marginLeft: "4px" }}
                />
              )}
            </button>
            <button className="icon-btn native-tap">
              <SkipForward size={40} color="#ffffff" fill="#ffffff" />
            </button>
            <button
              className="icon-btn native-tap"
              onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
            >
              <Repeat
                size={24}
                color={repeatMode > 0 ? "#1DB954" : "rgba(255,255,255,0.7)"}
              />
            </button>
          </div>

          {/* Bottom Action Footer */}
          <div className="premium-footer">
            <button className="icon-btn native-tap">
              <ListPlus size={24} color="rgba(255,255,255,0.7)" />
            </button>
            <button className="icon-btn native-tap">
              <Timer size={24} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MINIMIZED PLAYER
  return (
    <div
      className="mini-player-wrapper fade-in native-tap"
      onClick={() => setIsExpanded(true)}
    >
      <div className="mini-progress-bar">
        <div
          className="mini-progress-fill"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="mini-player">
        <img
          src={lowResImage}
          alt="cover"
          className={`mini-img ${isPlaying ? "playing" : "paused"}`}
          style={{ filter: hasError ? "grayscale(100%)" : "none" }}
        />
        <div className="mini-info">
          <span className="mini-title">
            {hasError ? "Unavailable" : currentSong.title}
          </span>
          <span className="mini-artist">
            {currentSong.artists[0]?.name || "Unknown Artist"}
          </span>
        </div>

        <button
          className="icon-btn native-tap"
          style={{ marginRight: "15px" }}
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
        >
          <Heart
            size={24}
            color={isLiked ? "#1DB954" : "#ffffff"}
            fill={isLiked ? "#1DB954" : "none"}
          />
        </button>

        <button
          className="icon-btn native-tap"
          disabled={hasError}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          {isPlaying ? (
            <Pause size={30} color="#ffffff" fill="#ffffff" />
          ) : (
            <Play size={30} color="#ffffff" fill="#ffffff" />
          )}
        </button>
      </div>
    </div>
  );
}
