/**
 * Shared, non-secret configuration helpers.
 *
 * API keys are stored in chrome.storage.local by options.js. This file contains
 * defaults and validation only, so it is safe to publish.
 */
var YTD_SETTINGS = (() => {
  const STORAGE_KEY = "ytd_settings";
  const DEFAULTS = Object.freeze({
    provider: "deepseek",
    aiApiKey: "",
    aiBaseUrl: "https://api.deepseek.com",
    aiModel: "deepseek-v4-flash",
    supadataApiKey: "",
    obsidianEnabled: false,
    obsidianApiKey: "",
    obsidianUseHttps: false,
    obsidianFolder: "学习心法",
  });

  function isLegacyCustom(input) {
    return !!input && input.provider === "custom";
  }

  function normalize(input = {}) {
    return {
      provider: DEFAULTS.provider,
      aiApiKey: isLegacyCustom(input)
        ? ""
        : typeof input.aiApiKey === "string"
          ? input.aiApiKey.trim()
          : "",
      aiBaseUrl: DEFAULTS.aiBaseUrl,
      aiModel: DEFAULTS.aiModel,
      supadataApiKey:
        typeof input.supadataApiKey === "string"
          ? input.supadataApiKey.trim()
          : "",
      obsidianEnabled: input.obsidianEnabled === true,
      obsidianApiKey:
        typeof input.obsidianApiKey === "string"
          ? input.obsidianApiKey.trim()
          : "",
      obsidianUseHttps: input.obsidianUseHttps === true,
      obsidianFolder:
        typeof input.obsidianFolder === "string" && input.obsidianFolder.trim()
          ? input.obsidianFolder.trim().replace(/^\/+|\/+$/g, "")
          : DEFAULTS.obsidianFolder,
    };
  }

  function migrateLegacyCustom(input = {}) {
    return {
      settings: normalize(input),
      migrated: isLegacyCustom(input),
    };
  }

  function chatCompletionsUrl() {
    return `${DEFAULTS.aiBaseUrl}/chat/completions`;
  }

  function obsidianApiBaseUrl(input = {}) {
    return input.obsidianUseHttps === true
      ? "https://127.0.0.1:27124"
      : "http://127.0.0.1:27123";
  }

  function canonicalYouTubeUrl(videoId) {
    const normalized = String(videoId || "").trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(normalized)) {
      throw new Error("Invalid YouTube video ID.");
    }
    return `https://www.youtube.com/watch?v=${normalized}`;
  }

  return {
    STORAGE_KEY,
    DEFAULTS,
    isLegacyCustom,
    normalize,
    migrateLegacyCustom,
    chatCompletionsUrl,
    obsidianApiBaseUrl,
    canonicalYouTubeUrl,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = YTD_SETTINGS;
}
