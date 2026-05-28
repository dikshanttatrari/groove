import { getDownloadLinks } from "./decrypt";

/**
 * Cleans and formats raw JioSaavn song data into a predictable UI-ready object.
 */
export const formatSongData = (rawSong) => {
  if (!rawSong) return null;

  // 1. Clean HTML entities (JioSaavn often sends &quot; instead of ")
  const cleanText = (str) => {
    if (!str) return "Unknown";
    return str.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  };

  // 2. High-Quality Image Extraction (The Chef's Kiss)
  // JioSaavn usually defaults to 150x150. We swap the URL string to grab all sizes.
  const baseImage = rawSong.image || "";
  const albumArt = [
    { quality: "50x50", url: baseImage.replace("150x150", "50x50") },
    { quality: "150x150", url: baseImage.replace("500x500", "150x150") }, // Catch-all
    { quality: "500x500", url: baseImage.replace("150x150", "500x500") },
  ];

  // 3. Extract Artists & Artist Images
  // The search API gives flat strings, but the Details API gives rich objects. This handles both.
  let formattedArtists = [];
  if (
    typeof rawSong.artistMap === "object" &&
    !Array.isArray(rawSong.artistMap)
  ) {
    // Basic search payload (like the one you pasted)
    formattedArtists = (rawSong.primary_artists || "")
      .split(", ")
      .map((name) => ({
        id: rawSong.artistMap[name] || name,
        name: cleanText(name),
        image: null, // The lightweight search API doesn't provide artist faces
      }));
  } else if (rawSong.more_info?.artistMap?.primary_artists) {
    // Rich details payload (contains high-res artist faces)
    formattedArtists = rawSong.more_info.artistMap.primary_artists.map(
      (artist) => ({
        id: artist.id,
        name: cleanText(artist.name),
        image: artist.image ? artist.image.replace("50x50", "500x500") : null,
      }),
    );
  }

  // 4. Decrypt Audio (and provide safe fallbacks for DRM tracks)
  const isDRM =
    rawSong.is_drm === 1 || rawSong.is_drm === "1" || rawSong.is_drm === true;
  const rawEncryptedUrl =
    rawSong.encrypted_media_url || rawSong.more_info?.encrypted_media_url;

  const downloadLinks = getDownloadLinks(rawEncryptedUrl);
  const highestQualityAudio = downloadLinks[4]?.url || downloadLinks[0]?.url;

  // 5. Hunt for Video (Sometimes hidden in more_info for popular tracks)
  const videoUrl = rawSong.v_url || rawSong.more_info?.v_url || null;

  return {
    id: rawSong.id,
    title: cleanText(rawSong.song || rawSong.title),
    subtitle: cleanText(rawSong.subtitle || rawSong.album),
    album: cleanText(rawSong.album),
    year: rawSong.year,
    language: rawSong.language,
    albumArt: albumArt,
    artists: formattedArtists,
    audioUrl: highestQualityAudio,
    previewUrl: rawSong.media_preview_url || rawSong.vlink, // Crucial fallback for DRM tracks!
    isDRM: isDRM,
    hasLyrics: rawSong.has_lyrics === "true" || rawSong.has_lyrics === true,
    durationSeconds: parseInt(rawSong.duration, 10),
    videoUrl: videoUrl, // The Chef's kiss 🤌
    permaUrl: rawSong.perma_url,
  };
};
