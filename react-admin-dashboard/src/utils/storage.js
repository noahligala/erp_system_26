import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.REACT_APP_SECRET_KEY || "ligcosync@2025";

export const secureStore = {
  /**
   * Save data securely.
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {boolean} persistent - true: localStorage, false: sessionStorage
   */
  set: (key, value, persistent = true) => {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(value),
        SECRET_KEY
      ).toString();

      if (persistent) localStorage.setItem(key, encrypted);
      else sessionStorage.setItem(key, encrypted);

      return true;
    } catch (err) {
      console.error("Error storing data:", err);
      return false;
    }
  },

  /**
   * Retrieve data from sessionStorage first, fallback to localStorage
   * @param {string} key
   * @returns {*|null}
   */
  get: (key) => {
    try {
      const encrypted =
        sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!encrypted) return null;

      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) return null;

      return JSON.parse(decrypted);
    } catch (err) {
      console.error("Decryption error for key", key, ":", err);
      return null;
    }
  },

  /**
   * Remove data from both storages
   */
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error("Error removing data:", err);
      return false;
    }
  },

  /**
   * Clear all data from both storages
   */
  clear: () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      return true;
    } catch (err) {
      console.error("Error clearing storage:", err);
      return false;
    }
  },
};
