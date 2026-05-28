import { createContext, useContext, useState, useRef, useEffect } from "react";

const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

export function MusicProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  // New States for the Slider
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef(null);

  // ==========================================
  // Media Session API (The Lock Screen Fix)
  // ==========================================
  useEffect(() => {
    if (currentSong && "mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artists[0]?.name || "Unknown Artist",
        album: currentSong.album || "",
        artwork: [
          {
            src: currentSong.albumArt[0]?.url,
            sizes: "50x50",
            type: "image/jpeg",
          },
          {
            src: currentSong.albumArt[1]?.url,
            sizes: "150x150",
            type: "image/jpeg",
          },
          {
            src: currentSong.albumArt[2]?.url,
            sizes: "500x500",
            type: "image/jpeg",
          }, // High-res for lock screen
        ],
      });

      // Let users pause/play directly from their lock screen or headphones!
      navigator.mediaSession.setActionHandler("play", () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
    }
  }, [currentSong]);

  const playSong = (song) => {
    setHasError(false);
    const streamUrl = song.audioUrl || song.previewUrl;

    setCurrentSong({ ...song, streamUrl });
    setIsPlaying(true);

    // No more setTimeout needed! The audio ref is always there now.
    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay blocked:", err);
        setIsPlaying(false);
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => console.warn(e));
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (percentage) => {
    if (audioRef.current) {
      const newTime = (percentage / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(percentage);
    }
  };

  const value = {
    currentSong,
    isPlaying,
    hasError,
    progress,
    currentTime,
    duration,
    seek,
    togglePlay,
    playSong,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      {/* RENDER ALWAYS: Fixes the double-tap bug! */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          setHasError(true);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setProgress(
              (audioRef.current.currentTime / audioRef.current.duration) *
                100 || 0,
            );
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
      />
    </MusicContext.Provider>
  );
}
