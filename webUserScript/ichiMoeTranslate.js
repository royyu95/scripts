// ==UserScript==
// @name         ichi.moe Inline English to Chinese
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Translate only English inside .gloss-desc on ichi.moe, skip [tags], show translation below
// @match        https://ichi.moe/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // ---------- 配置 ----------
  const TARGET_LANG = "zh-CN";
  const SOURCE_LANG = "en";
  const MAX_BATCH_SIZE = 80;
  const MAX_CHARS_PER_BATCH = 5000;
  const REQUEST_INTERVAL_MS = 350;

  // ---------- 正则 ----------
  const reLatin = /[A-Za-z]/;
  const reJapanese = /[\u3040-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F]/;
  const reHasWordChar = /\S/;
  const reTag = /^\[[^\]]+\]$/; // 匹配 [xxx]

  const processedNode = new WeakSet();

  // ---------- 只在 .gloss-desc 内找 ----------
  function* textNodesUnderGlossDesc(root) {
    const descs = root.querySelectorAll(".gloss-desc");
    for (const desc of descs) {
      const walker = document.createTreeWalker(desc, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.nodeValue || !reHasWordChar.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
          const p = node.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (p.classList && p.classList.contains("gtx-translation")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let n;
      while ((n = walker.nextNode())) yield n;
    }
  }

  function isEnglishToTranslate(text) {
    const t = text.trim();
    if (!t) return false;
    if (reTag.test(t)) return false;      // 跳过 [pn] [prt] 等
    if (!reLatin.test(t)) return false;   // 必须有英文
    if (reJapanese.test(t)) return false; // 不含日文
    if (t.length < 2) return false;
    return true;
  }

  function insertBelow(node, translation) {
    node.nodeValue = translation + "; " + node.nodeValue.trim();
    // const span = document.createElement("div");
    // span.className = "gtx-translation";
    // span.style.color = "black";
    // span.style.fontSize = "1.0em";
    // // 拼接成 "译文；原文"
    // span.textContent = translation + "; " + node.nodeValue.trim();
    // node.parentNode.replaceChild(span, node);

    // 加在原文后面
    // span.textContent = translation;
    // const parent = node.parentNode;
    // if (parent) {
    //   parent.insertBefore(span, node.nextSibling);
    // }
  }

  // ---------- 批量队列 ----------
  class TranslateQueue {
    constructor() {
      this.queue = [];
      this.running = false;
    }

    add(text, node) {
      this.queue.push({ text, node });
      if (!this.running) {
        this.running = true;
        this.next();
      }
    }

    async next() {
      if (this.queue.length === 0) {
        this.running = false;
        return;
      }

      const batch = [];
      let charCount = 0;
      while (this.queue.length > 0 && batch.length < MAX_BATCH_SIZE) {
        const item = this.queue[0];
        const len = item.text.length;
        if (batch.length > 0 && charCount + len > MAX_CHARS_PER_BATCH) break;
        batch.push(item);
        charCount += len;
        this.queue.shift();
      }

      try {
        const translations = await translateBatch(batch.map(x => x.text));
        batch.forEach((item, i) => {
          if (item.node.isConnected) {
            insertBelow(item.node, translations[i] || "");
          }
        });
      } catch (e) {
        console.error("翻译失败", e);
      }

      setTimeout(() => this.next(), REQUEST_INTERVAL_MS);
    }
  }

  const queue = new TranslateQueue();

  // ---------- Google gtx ----------
  async function translateBatch(texts) {
    const payload = texts.join("\n");
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${SOURCE_LANG}&tl=${TARGET_LANG}&dt=t&q=${encodeURIComponent(payload)}`;
    console.log("请求翻译", texts);
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const results = [];
    let current = "";
    for (const seg of data[0]) {
      const [translated] = seg;
      current += translated;
      if (translated.endsWith("\n")) {
        results.push(current.trim());
        current = "";
      }
    }
    if (current) results.push(current.trim());
    while (results.length < texts.length) results.push("");
    return results;
  }

  // ---------- 主流程 ----------
  function collectAndTranslate() {
    for (const node of textNodesUnderGlossDesc(document.body)) {
      if (processedNode.has(node)) continue;
      if (!isEnglishToTranslate(node.nodeValue)) continue;
      processedNode.add(node);
      queue.add(node.nodeValue.trim(), node);
    }
  }

  // 初次执行
  collectAndTranslate();

  // 观察 DOM 动态变化
  const mo = new MutationObserver(() => collectAndTranslate());
  mo.observe(document.body, { childList: true, subtree: true });
})();
