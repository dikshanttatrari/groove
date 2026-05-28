import CryptoJS from "crypto-js";

/**
 * Decrypts JioSaavn's encrypted media URL and returns an array of streamable links.
 * * @param {string} encryptedUrl - The raw encrypted_media_url string from JioSaavn.
 * @returns {Array<{quality: string, url: string}>} - Array of qualities and direct mp4 links.
 */
export const getDownloadLinks = (encryptedUrl) => {
  // 1. Guard Clause: If the URL is missing or invalid, fail silently and safely.
  if (!encryptedUrl || typeof encryptedUrl !== "string") {
    console.warn("Decryption skipped: No valid encrypted URL provided.");
    return [];
  }

  try {
    // 2. The static master key used by JioSaavn's DES encryption
    const JIOSAAVN_KEY = CryptoJS.enc.Utf8.parse("38346591");

    // 3. Decrypt the DES-ECB payload
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      JIOSAAVN_KEY,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      },
    );

    // 4. Convert decrypted bytes to standard string (This yields the base URL)
    const baseUrl = decrypted.toString(CryptoJS.enc.Utf8);
    console.log("Decrypted base URL:", baseUrl);

    // Fail-safe if decryption results in an empty string (e.g., algorithm mismatch)
    if (!baseUrl) {
      throw new Error("Decryption resulted in an empty string.");
    }

    // 5. Map out the standard bitrates offered by JioSaavn's CDN
    const bitrates = [
      { quality: "12kbps", suffix: "_12.mp4" },
      { quality: "48kbps", suffix: "_48.mp4" },
      { quality: "96kbps", suffix: "_96.mp4" },
      { quality: "160kbps", suffix: "_160.mp4" },
      { quality: "320kbps", suffix: "_320.mp4" },
    ];

    // 6. Generate the array using a Regex that catches ANY bitrate number
    // This ensures it works whether the base URL ends in _96.mp4, _160.mp4, etc.
    return bitrates.map((bitrate) => ({
      quality: bitrate.quality,
      url: baseUrl.replace(/_\d+\.mp4$/, bitrate.suffix),
    }));
  } catch (error) {
    console.error("Failed to decrypt JioSaavn media URL:", error);
    // Return an empty array so the UI doesn't crash map functions
    return [];
  }
};
