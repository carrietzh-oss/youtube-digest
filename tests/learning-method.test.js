const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadLearningHelpers() {
  const listeners = { addListener() {} };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
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
      storage: { local: { get: async () => ({}), set: async () => {} } },
      windows: { getCurrent: () => Promise.resolve({ id: 1 }) },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("sidepanel.js"), sandbox);
  return sandbox.__YTD_TRANSCRIPT_TESTING__;
}

test("learning method page exposes copy and download actions", () => {
  const html = read("sidepanel.html");
  const js = read("sidepanel.js");
  assert.match(html, /id="copyLearningBtn"[^>]*>复制<\/button>/);
  assert.match(html, /id="downloadLearningBtn"[^>]*>下载<\/button>/);
  assert.match(js, /copyLearningBtn[\s\S]*copyLearningMethod/);
  assert.match(js, /downloadLearningBtn[\s\S]*downloadLearningMethod/);
});

test("learning method is saved and restored with the per-video digest cache", () => {
  const js = read("sidepanel.js");
  assert.match(js, /learning:\s*currentLearning/);
  assert.match(js, /currentLearning\s*=\s*cached\.learning\s*\|\|\s*null/);
  assert.match(js, /if \(currentLearning\) \{[\s\S]*renderLearningMethod\(currentLearning\)/);
  assert.match(js, /renderLearningMethod\(currentLearning\);[\s\S]*await saveToCache\(requestedVideoId\)/);
});

test("learning method exports a complete Markdown study guide", () => {
  const { learningMethodToMarkdown } = loadLearningHelpers();
  const markdown = learningMethodToMarkdown({
    learningGoals: ["理解缓存"],
    framework: "生成一次，按视频复用。",
    sections: [{
      title: "持久缓存",
      concept: "保存结果",
      plainExplanation: "回来时直接读取",
      example: "重新打开同一视频",
      application: "减少重复请求",
      misconceptions: ["缓存等于重新生成"],
    }],
    caseStudy: "先生成，再返回。",
    quiz: [{
      question: "返回时会发生什么？",
      options: ["重新生成", "读取缓存"],
      answerIndex: 1,
      explanation: "学习心法已经保存在本地。",
    }],
    reviewPath: ["生成", "返回查看"],
    finalMindset: "复用胜于重复。",
  }, "测试视频", "abc123");

  assert.match(markdown, /^# 测试视频/);
  assert.match(markdown, /视频：https:\/\/www\.youtube\.com\/watch\?v=abc123/);
  assert.match(markdown, /## 持久缓存/);
  assert.match(markdown, /\*\*答案：\*\* B/);
  assert.match(markdown, /## 最终心法[\s\S]*复用胜于重复。/);
});
