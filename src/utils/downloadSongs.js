import { apiUrl } from "./api";
import { getAudioUrlByQuality } from "./formatters";
import { getAppSettings } from "./preferences";
import { getSongBlob, saveSongBlob } from "./storage";
import { buildZipBlob } from "./zipBuilder";

export const sanitizeFilename = (name) => {
  const withoutControl = Array.from(String(name || "Groove Track"))
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("");
  return (
    withoutControl
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Groove Track"
  );
};

export const buildTrackFilename = (song, quality = "320kbps", ext = "m4a") => {
  const title = sanitizeFilename(song?.title || "Unknown Title");
  const artist = sanitizeFilename(
    song?.artists?.[0]?.name || song?.artist || "",
  );
  const base = artist ? `${title} - ${artist}` : title;
  return quality ? `${base} [${quality}].${ext}` : `${base}.${ext}`;
};

export const triggerBrowserDownload = (blob, filename) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
};

async function fetchAudioBlobWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Audio fetch failed with status ${response.status}`);
  }

  const total = parseInt(response.headers.get("content-length") || "0", 10);
  if (!response.body || !response.body.getReader) {
    const blob = await response.blob();
    onProgress?.(100);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) {
      onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
    }
  }

  onProgress?.(100);
  const contentType = response.headers.get("content-type") || "audio/mp4";
  return new Blob(chunks, { type: contentType });
}

/**
 * Fetches audio via direct CDN (with progress) and falls back to backend /api/download proxy if CORS blocks it.
 */
export async function fetchSongAudioBlob(song, quality, onProgress) {
  const targetUrl = getAudioUrlByQuality(song, quality);
  if (!targetUrl) throw new Error("No downloadable audio URL available");

  try {
    return await fetchAudioBlobWithProgress(targetUrl, onProgress);
  } catch (directError) {
    const title = sanitizeFilename(song?.title || "track");
    const proxyUrl = apiUrl(
      `/api/download?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`,
    );
    return await fetchAudioBlobWithProgress(proxyUrl, onProgress);
  }
}

/**
 * Saves track into IndexedDB offline vault only.
 */
export const saveOfflineSong = async (song, options = {}) => {
  const settings = getAppSettings();
  const quality = options.quality || settings.downloadQuality || "320kbps";
  const onProgress =
    typeof options === "function" ? options : options.onProgress;

  try {
    const blob = await fetchSongAudioBlob(song, quality, onProgress);
    await saveSongBlob(song, blob, { quality });
    window.dispatchEvent(new CustomEvent("downloadsUpdated"));
    return { ok: true, quality, sizeBytes: blob.size };
  } catch (err) {
    console.error("Offline save failed:", err);
    return { ok: false, error: err.message };
  }
};

/**
 * Downloads the real audio file (.m4a) to the user's device storage.
 * Uses cached IndexedDB blob instantaneously when already saved offline.
 */
export const downloadSongToDevice = async (song, options = {}) => {
  const settings = getAppSettings();
  const quality = options.quality || settings.downloadQuality || "320kbps";
  const alsoSaveOffline = options.alsoSaveOffline ?? false;
  const onProgress = options.onProgress;

  try {
    const cached = await getSongBlob(song.id);
    if (cached?.blob && (!options.quality || cached.quality === quality)) {
      onProgress?.(100);
      const filename = buildTrackFilename(
        song,
        cached.quality || quality,
        "m4a",
      );
      triggerBrowserDownload(cached.blob, filename);
      return { ok: true, fromCache: true, filename };
    }

    const blob = await fetchSongAudioBlob(song, quality, onProgress);
    if (alsoSaveOffline) {
      await saveSongBlob(song, blob, { quality });
      window.dispatchEvent(new CustomEvent("downloadsUpdated"));
    }

    const filename = buildTrackFilename(song, quality, "m4a");
    triggerBrowserDownload(blob, filename);
    return { ok: true, fromCache: false, filename, sizeBytes: blob.size };
  } catch (err) {
    console.error("Device download failed, trying direct proxy link:", err);
    try {
      const targetUrl = getAudioUrlByQuality(song, quality);
      if (!targetUrl) return { ok: false, error: err.message };
      const title = sanitizeFilename(
        `${song.title}${song.artists?.[0]?.name ? ` - ${song.artists[0].name}` : ""}`,
      );
      const link = document.createElement("a");
      link.href = apiUrl(
        `/api/download?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`,
      );
      link.download = `${title}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { ok: true, viaProxyRedirect: true };
    } catch (fallbackErr) {
      return { ok: false, error: fallbackErr.message };
    }
  }
};

/**
 * Primary download handler respecting user's configured Download Mode:
 * - "both": saves offline in IndexedDB AND downloads .m4a file to device
 * - "device": downloads .m4a file to device only
 * - "offline": saves offline in IndexedDB only
 */
export const silentDownload = async (song, onProgressOrOptions) => {
  const settings = getAppSettings();
  const options =
    typeof onProgressOrOptions === "function"
      ? { onProgress: onProgressOrOptions }
      : onProgressOrOptions || {};
  const mode = options.mode || settings.downloadMode || "both";
  const quality = options.quality || settings.downloadQuality || "320kbps";

  if (mode === "offline") {
    const res = await saveOfflineSong(song, {
      quality,
      onProgress: options.onProgress,
    });
    return res.ok;
  }

  if (mode === "device") {
    const res = await downloadSongToDevice(song, {
      quality,
      alsoSaveOffline: false,
      onProgress: options.onProgress,
    });
    return res.ok;
  }

  // Default "both": save to IndexedDB + trigger real .m4a file download to device
  const res = await downloadSongToDevice(song, {
    quality,
    alsoSaveOffline: true,
    onProgress: options.onProgress,
  });
  return res.ok;
};

/**
 * Exports a list of songs (either already-cached records or remote songs) into a single .zip file.
 */
export const exportSongsAsZip = async (
  songsOrEntries,
  zipTitle = "Groove-Downloads",
  onProgress,
) => {
  const settings = getAppSettings();
  const quality = settings.downloadQuality || "320kbps";
  const files = [];

  for (let i = 0; i < songsOrEntries.length; i++) {
    const item = songsOrEntries[i];
    const song = item.song || item;
    let blob = item.blob;
    let trackQuality = item.quality || quality;

    if (!blob) {
      const cached = await getSongBlob(song.id);
      if (cached?.blob) {
        blob = cached.blob;
        trackQuality = cached.quality || quality;
      } else {
        blob = await fetchSongAudioBlob(song, quality, (pct) => {
          const overall = Math.round(
            ((i + pct / 100) / songsOrEntries.length) * 85,
          );
          onProgress?.(overall, i + 1, songsOrEntries.length);
        });
        await saveSongBlob(song, blob, { quality });
        window.dispatchEvent(new CustomEvent("downloadsUpdated"));
      }
    }

    files.push({
      name: buildTrackFilename(song, trackQuality, "m4a"),
      blob,
    });

    onProgress?.(
      Math.round(((i + 1) / songsOrEntries.length) * 85),
      i + 1,
      songsOrEntries.length,
    );
  }

  if (files.length === 0) {
    throw new Error("No songs available to export");
  }

  const zipBlob = await buildZipBlob(files, (zipPct) => {
    onProgress?.(85 + Math.round(zipPct * 0.15), files.length, files.length);
  });

  const cleanZipName = `${sanitizeFilename(zipTitle)}.zip`;
  triggerBrowserDownload(zipBlob, cleanZipName);
  return { count: files.length, filename: cleanZipName, sizeBytes: zipBlob.size };
};
