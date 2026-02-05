import CryptoJS from "crypto-js";

/**
 * Encrypt the given API path using AES-256-CBC,
 * matching Laravel's App\Helpers\ApiEncoder implementation.
 *
 * @param {string} path - The API path (e.g., '/clients' or 'clients/5')
 * @param {string} secretKey - The shared secret key (must match Laravel)
 * @returns {string} Base64 encoded ciphertext
 */
export function encodeApiPath(path, secretKey) {
  try {
    // Derive a 256-bit key (same as hash('sha256', $secretKey, true) in PHP)
    const key = CryptoJS.SHA256(secretKey);

    // Generate a random 16-byte IV
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt the path using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(path, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Prepend IV (same approach as Laravel)
    const combined = iv.concat(encrypted.ciphertext);

    // Encode as Base64 for transmission
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error("Encoding API path failed:", error);
    return null;
  }
}

/**
 * (Optional) Decode for debugging — matches Laravel's ApiEncoder::decode()
 */
export function decodeApiPath(encoded, secretKey) {
  try {
    const rawData = CryptoJS.enc.Base64.parse(encoded);

    // Extract IV (first 16 bytes)
    const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(
      rawData.words.slice(4),
      rawData.sigBytes - 16
    );

    const key = CryptoJS.SHA256(secretKey);

    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decoding API path failed:", error);
    return null;
  }
}
