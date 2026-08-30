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

function loadLearningBackgroundHelpers() {
  const listeners = { addListener() {} };
  const localStorage = {
    ytd_settings: {
      provider: "deepseek",
      aiApiKey: "test-key",
      aiBaseUrl: "https://api.deepseek.com",
      aiModel: "deepseek-v4-flash",
    },
  };
  const sandbox = {
    console,
    URL,
    TextDecoder,
    TextEncoder,
    fetch,
    AbortController,
    setTimeout: () => 0,
    clearTimeout() {},
    importScripts() {},
    chrome: {
      storage: {
        local: {
          setAccessLevel: () => Promise.resolve(),
          get: async (key) => ({ [key]: localStorage[key] }),
          set: async (values) => Object.assign(localStorage, values),
        },
      },
      action: { onClicked: listeners },
      sidePanel: { setPanelBehavior() {}, setOptions: () => Promise.resolve() },
      runtime: {
        onInstalled: listeners,
        onMessage: listeners,
        getURL: (value) => value,
        sendMessage: () => Promise.resolve(),
        openOptionsPage() {},
      },
      tabs: { onUpdated: listeners, onActivated: listeners },
    },
    YTD_SETTINGS: {
      STORAGE_KEY: "ytd_settings",
      normalize: (value) => value,
      chatCompletionsUrl: () => "https://api.deepseek.com/chat/completions",
      canonicalYouTubeUrl: (videoId) =>
        `https://www.youtube.com/watch?v=${videoId}`,
    },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read("background.js"), sandbox);
  return sandbox.__YTD_TRANSLATION_TESTING__;
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
    frameworkSteps: ["生成", "保存", "恢复"],
    diagrams: [{
      title: "缓存流程",
      type: "flow",
      sectionIndex: 0,
      caption: "从左向右看",
      takeaway: "保存后直接恢复",
      nodes: [
        { label: "生成", detail: "创建教程" },
        { label: "保存", detail: "写入缓存" },
        { label: "恢复", detail: "无需重算" },
      ],
    }],
    sections: [{
      title: "持久缓存",
      overview: "缓存让结果可以复用。",
      whyItMatters: "避免重复请求。",
      subtopics: [{
        title: "按视频保存",
        term: "Persistent Cache（持久缓存）",
        definition: "保存结果",
        why: "重复生成会浪费时间和额度",
        mechanism: "回来时直接读取",
        analogy: "像把笔记放进书架",
        analogyBoundary: "缓存仍可能按策略过期",
        example: "重新打开同一视频",
        application: "减少重复请求",
        misconceptions: ["缓存等于重新生成"],
        limitations: ["缓存有容量限制"],
      }],
      summary: "按视频复用结果。",
    }],
    caseStudy: {
      title: "返回视频",
      scenario: "先生成，再离开。",
      steps: ["生成", "返回"],
      conclusion: "直接恢复。",
    },
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
  assert.match(markdown, /\[观看原视频\]\(https:\/\/www\.youtube\.com\/watch\?v=abc123\)/);
  assert.match(markdown, /## 目录[\s\S]*\[持久缓存\]\(#chapter-1\)/);
  assert.match(markdown, /```mermaid[\s\S]*d1_1.*-->.*d1_2/);
  assert.match(markdown, /\*\*为什么会出现：\*\* 重复生成会浪费时间和额度/);
  assert.match(markdown, /\*\*类比边界：\*\* 缓存仍可能按策略过期/);
  assert.match(markdown, /\*\*答案：\*\* B/);
  assert.match(markdown, /## 最终心法[\s\S]*复用胜于重复。/);
});

test("learning tutorial normalization requires detailed chapters", () => {
  const { normalizeLearningTutorial } = loadLearningBackgroundHelpers();
  const makeSection = (index) => ({
    title: `章节 ${index}`,
    subtopics: [{
      title: `知识点 ${index}`,
      definition: "定义",
      mechanism: "机制",
      misconceptions: ["误区"],
      limitations: ["边界"],
    }],
  });
  const tutorial = normalizeLearningTutorial({
    learningGoals: ["目标"],
    framework: "主线",
    sections: [makeSection(1), makeSection(2), makeSection(3)],
    caseStudy: { title: "案例", steps: ["一步"] },
  });

  assert.equal(tutorial.schemaVersion, 2);
  assert.equal(tutorial.sections.length, 3);
  assert.equal(tutorial.sections[0].subtopics[0].limitations[0], "边界");
  assert.deepEqual(
    JSON.parse(JSON.stringify(tutorial.toc)),
    [
      { title: "章节 1", anchor: "chapter-1" },
      { title: "章节 2", anchor: "chapter-2" },
      { title: "章节 3", anchor: "chapter-3" },
    ],
  );
  assert.throws(
    () => normalizeLearningTutorial({ sections: [makeSection(1)] }),
    /enough detailed tutorial chapters/,
  );
});

test("learning extras require concept diagrams and ten valid questions", () => {
  const { normalizeLearningExtras } = loadLearningBackgroundHelpers();
  const question = (index) => ({
    question: `问题 ${index}`,
    options: ["A", "B", "C", "D"],
    answerIndex: index % 4,
    explanation: "解析",
    misconception: "易错点",
  });
  const diagrams = [1, 2].map((index) => ({
    title: `图 ${index}`,
    type: index === 1 ? "cycle" : "flow",
    sectionIndex: index - 1,
    nodes: [
      { label: "开始", detail: "第一步" },
      { label: "结束", detail: "第二步" },
    ],
  }));
  const extras = normalizeLearningExtras({
    diagrams,
    quiz: Array.from({ length: 10 }, (_, index) => question(index)),
  });

  assert.equal(extras.diagrams.length, 2);
  assert.equal(extras.quiz.length, 10);
  assert.throws(
    () => normalizeLearningExtras({ diagrams, quiz: [question(1)] }),
    /exactly 10 valid questions/,
  );
});
