const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadObsidianHelpers(fetchImpl, settings = {}) {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    fetch: fetchImpl,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval() {},
    clearInterval() {},
    IntersectionObserver: class {},
    CSS: { escape: (value) => value },
    window: { getSelection: () => null, close() {} },
    document: {
      addEventListener() {},
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null,
      createElement: () => ({ click() {} }),
    },
    chrome: {
      runtime: { onMessage: listeners, sendMessage: () => Promise.resolve({}) },
      storage: {
        local: {
          get: async () => ({ ytd_settings: settings }),
        },
      },
      windows: { getCurrent: () => Promise.resolve({ id: 1 }) },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {
      STORAGE_KEY: "ytd_settings",
      normalize: (value) => value,
      obsidianApiBaseUrl: (value) =>
        value.obsidianUseHttps
          ? "https://127.0.0.1:27124"
          : "http://127.0.0.1:27123",
    },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("sidepanel.js"), sandbox);
  return sandbox.__YTD_TRANSCRIPT_TESTING__;
}

const configuredSettings = {
  obsidianEnabled: true,
  obsidianApiKey: "local-rest-placeholder",
  obsidianUseHttps: false,
  obsidianFolder: "学习心法",
};

test("Obsidian sync falls back to HTTPS when HTTP is unavailable", async () => {
  const requests = [];
  const helpers = loadObsidianHelpers(async (url) => {
    requests.push(url);
    if (url.startsWith("http://")) throw new TypeError("Failed to fetch");
    return { ok: true, status: 204 };
  }, configuredSettings);

  const result = await helpers.syncLearningToObsidian({ sections: [] });

  assert.equal(result.endpoint, "https://127.0.0.1:27124");
  assert.deepEqual(
    requests.map((url) => new URL(url).origin),
    ["http://127.0.0.1:27123", "https://127.0.0.1:27124"],
  );
});

test("Obsidian sync reports actionable endpoint failures", async () => {
  const helpers = loadObsidianHelpers(async () => {
    throw new TypeError("Failed to fetch");
  }, configuredSettings);

  await assert.rejects(
    () => helpers.syncLearningToObsidian({ sections: [] }),
    /HTTP 27123 无法连接[\s\S]*HTTPS 27124 无法连接[\s\S]*启用/,
  );
});

test("Obsidian sync does not hide an invalid API key behind endpoint fallback", async () => {
  const requests = [];
  const helpers = loadObsidianHelpers(async (url) => {
    requests.push(url);
    return { ok: false, status: 401 };
  }, configuredSettings);

  await assert.rejects(
    () => helpers.syncLearningToObsidian({ sections: [] }),
    /HTTP 27123 的 Local REST API Key 无效（HTTP 401）/,
  );
  assert.equal(requests.length, 1);
});
