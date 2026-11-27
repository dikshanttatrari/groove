import { getDownloadLinks } from "./decrypt.js";

export const cleanHtmlText = (str) => {
  if (!str) return "Unknown";
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

export const formatDuration = (seconds) => {
  const num = parseInt(seconds, 10);
  if (!Number.isFinite(num) || num <= 0) return "";
  const hours = Math.floor(num / 3600);
  const mins = Math.floor((num % 3600) / 60);
  const secs = num % 60;
  if (hours > 0) {
    return `${hours}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const getAudioUrlByQuality = (song, preferredQuality = "320kbps") => {
  if (!song) return "";
  if (Array.isArray(song.audioLinks) && song.audioLinks.length > 0) {
    const exact = song.audioLinks.find(
      (item) => item.quality === preferredQuality,
    );
    if (exact?.url) return exact.url;
    return (
      song.audioLinks[song.audioLinks.length - 1]?.url ||
      song.audioLinks[0]?.url ||
      song.audioUrl ||
      song.url ||
      ""
    );
  }
  const baseUrl = song.audioUrl || song.previewUrl || song.url || "";
  if (!baseUrl) return "";
  const suffixMap = {
    "12kbps": "_12.mp4",
    "48kbps": "_48.mp4",
    "96kbps": "_96.mp4",
    "160kbps": "_160.mp4",
    "320kbps": "_320.mp4",
  };
  if (suffixMap[preferredQuality] && /_\d+\.mp4$/i.test(baseUrl)) {
    return baseUrl.replace(/_\d+\.mp4$/i, suffixMap[preferredQuality]);
  }
  return baseUrl;
};

export const formatSongData = (rawSong) => {
  if (!rawSong) return null;

  const baseImage = rawSong.image || "";
  const albumArt = [
    { quality: "50x50", url: baseImage.replace("150x150", "50x50") },
    {
      quality: "150x150",
      url: baseImage.replace("500x500", "150x150").replace("50x50", "150x150"),
    },
    {
      quality: "500x500",
      url: baseImage.replace("150x150", "500x500").replace("50x50", "500x500"),
    },
  ];

  let formattedArtists = [];
  if (
    typeof rawSong.artistMap === "object" &&
    rawSong.artistMap !== null &&
    !Array.isArray(rawSong.artistMap)
  ) {
    formattedArtists = (rawSong.primary_artists || "")
      .split(", ")
      .filter(Boolean)
      .map((name) => ({
        id: rawSong.artistMap[name] || name,
        name: cleanHtmlText(name),
        image: null,
      }));
  } else if (rawSong.more_info?.artistMap?.primary_artists) {
    formattedArtists = rawSong.more_info.artistMap.primary_artists.map(
      (artist) => ({
        id: artist.id,
        name: cleanHtmlText(artist.name),
        image: artist.image ? artist.image.replace("50x50", "500x500") : null,
      }),
    );
  } else if (rawSong.primary_artists) {
    formattedArtists = String(rawSong.primary_artists)
      .split(", ")
      .filter(Boolean)
      .map((name) => ({
        id: null,
        name: cleanHtmlText(name),
        image: null,
      }));
  } else if (rawSong.more_info?.artistMap?.artists?.length) {
    formattedArtists = rawSong.more_info.artistMap.artists.map((artist) => ({
      id: artist.id,
      name: cleanHtmlText(artist.name),
      image: artist.image ? artist.image.replace("50x50", "500x500") : null,
    }));
  }

  const isDRM =
    rawSong.is_drm === 1 || rawSong.is_drm === "1" || rawSong.is_drm === true;
  const rawEncryptedUrl =
    rawSong.encrypted_media_url || rawSong.more_info?.encrypted_media_url;

  const downloadLinks = getDownloadLinks(rawEncryptedUrl);
  const highestQualityAudio =
    downloadLinks[4]?.url ||
    downloadLinks[downloadLinks.length - 1]?.url ||
    downloadLinks[0]?.url ||
    rawSong.media_url ||
    rawSong.url ||
    "";
  const videoUrl = rawSong.v_url || rawSong.more_info?.v_url || null;
  const durationSeconds = parseInt(rawSong.duration, 10) || 0;

  return {
    id: rawSong.id,
    title: cleanHtmlText(rawSong.song || rawSong.title),
    subtitle: cleanHtmlText(rawSong.subtitle || rawSong.album || ""),
    album: cleanHtmlText(rawSong.album || rawSong.more_info?.album || ""),
    year: rawSong.year,
    language: rawSong.language,
    albumArt,
    artists: formattedArtists,
    audioLinks: downloadLinks,
    audioUrl: highestQualityAudio,
    previewUrl: rawSong.media_preview_url || rawSong.vlink,
    isDRM,
    hasLyrics: rawSong.has_lyrics === "true" || rawSong.has_lyrics === true,
    durationSeconds,
    duration: formatDuration(durationSeconds),
    videoUrl,
    permaUrl: rawSong.perma_url,
  };
};
