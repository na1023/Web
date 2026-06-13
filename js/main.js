/* =========================================================
   studio°mono  —  main.js
   GSAP演出 + News(ローカル永続保存) + FAQ + Contact
   ========================================================= */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const STORE_KEY = "studio_mono_news"; // localStorage に追加記事を永久保存

  /* ---------- Header: スクロールで縮む / モバイルメニュー ---------- */
  const header = document.getElementById("header");
  const nav = document.querySelector(".nav");
  const navToggle = document.getElementById("navToggle");
  const progress = document.getElementById("progress");

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
    if (progress) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  navToggle?.addEventListener("click", () => nav.classList.toggle("is-open"));
  nav?.addEventListener("click", (e) => {
    if (e.target.tagName === "A") nav.classList.remove("is-open");
  });

  /* ---------- GSAP: スクロール連動アニメーション ---------- */
  function initAnimations() {
    if (!hasGSAP || prefersReduced) {
      document.querySelectorAll("[data-reveal],[data-fade]").forEach((el) => {
        el.style.opacity = 1; el.style.transform = "none";
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Hero: タイトル行を順にスライドイン → リード/ボタンをフェード
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from("[data-hero-line]", { yPercent: 120, opacity: 0, duration: 1.0, stagger: 0.14 })
      .from("[data-fade]", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12 }, "-=0.45");

    // セクション見出し: 番号→タイトル→サブを少しずつ
    gsap.utils.toArray(".section__head").forEach((head) => {
      gsap.from(head.children, {
        y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: head, start: "top 85%" }
      });
    });

    // 汎用 reveal: フェード＋少しスケール
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
      });
    });

    // プロフィール各行を順番に
    gsap.from(".profile__row", {
      x: -20, opacity: 0, duration: 0.6, stagger: 0.12, ease: "power2.out",
      scrollTrigger: { trigger: ".profile__list", start: "top 85%" }
    });

    // FAQ 各項目をスタッガー
    gsap.from(".acc__item", {
      y: 24, opacity: 0, duration: 0.6, stagger: 0.1, ease: "power2.out",
      scrollTrigger: { trigger: ".accordion", start: "top 85%" }
    });

    // 背景blobをスクロールで緩やかにパララックス
    gsap.to(".blob--blue", { yPercent: 40, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".blob--pink", { yPercent: -25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    // セクション見出しの番号をゆっくり浮かせる（奥行き）
    gsap.utils.toArray(".section__num").forEach((el) => {
      gsap.to(el, { y: -20, ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* =========================================================
     News : data.json(公開ベース) + localStorage(追加記事) を合成
     投稿は localStorage に保存されるので、再読み込みしても消えない。
     ========================================================= */
  const newsList = document.getElementById("newsList");
  let baseNews = [];   // data.json 由来（全員に公開済み）
  let localNews = [];  // このブラウザで追加（永続保存）

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      localNews = Array.isArray(arr) ? arr : [];
    } catch { localNews = []; }
  }
  function saveLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(localNews)); } catch {}
  }

  function mergedNews() {
    // id で重複排除（local を優先）。新しい日付順。
    const map = new Map();
    [...baseNews, ...localNews].forEach((n) => map.set(String(n.id), n));
    return [...map.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  async function loadNews() {
    if (!newsList) return;
    loadLocal();
    try {
      const res = await fetch("data/data.json");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      baseNews = Array.isArray(data.news) ? data.news : [];
    } catch {
      baseNews = []; // 取得できなくてもローカル分は表示
    }
    renderNews();
  }

  function renderNews() {
    const items = mergedNews();
    if (!items.length) {
      newsList.innerHTML = `<li class="news__empty">まだ記事がありません。</li>`;
      return;
    }
    newsList.innerHTML = items.map((n) => `
      <li class="news__item">
        <span class="news__date">${escapeHTML(n.date || "")}</span>
        <span class="news__cat">${escapeHTML(n.category || "お知らせ")}</span>
        <span class="news__title">${escapeHTML(n.title || "")}</span>
        <span class="news__body">${escapeHTML(n.body || "")}</span>
      </li>`).join("");

    if (hasGSAP && !prefersReduced) {
      gsap.from(".news__item", { opacity: 0, y: 20, duration: 0.5, stagger: 0.07, ease: "power2.out" });
    }
  }

  /* ---------- News: 記事エディタ ----------
     追加 → localStorage に永久保存 → 一覧へ即反映（再読込でも残る）。
     「data.json をダウンロード」で全員公開用のファイルも書き出せる。 */
  const postForm = document.getElementById("postForm");
  const postMsg = document.getElementById("postMsg");
  const jsonOut = document.getElementById("jsonOut");
  const downloadBtn = document.getElementById("downloadJson");

  postForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const title = (fd.get("title") || "").toString().trim().slice(0, 60);
    const body = (fd.get("body") || "").toString().trim().slice(0, 400);
    const category = (fd.get("category") || "お知らせ").toString();
    if (!title || !body) return;

    const item = { id: Date.now(), date: new Date().toISOString().slice(0, 10), category, title, body };
    localNews.unshift(item);
    saveLocal();          // ← 永続保存
    renderNews();
    if (jsonOut) jsonOut.value = JSON.stringify({ news: mergedNews() }, null, 4);
    setMsg(postMsg, "保存しました（このブラウザに永久保存）。再読み込みしても残ります。", "is-ok");
    postForm.reset();
  });

  downloadBtn?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ news: mergedNews() }, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setMsg(postMsg, "data.json を書き出しました。data/ のファイルを差し替えて push すると全員に公開されます。", "is-ok");
  });

  /* ---------- FAQ アコーディオン ---------- */
  document.querySelectorAll(".acc__q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      const panel = btn.nextElementSibling;
      btn.setAttribute("aria-expanded", String(!open));

      if (hasGSAP && !prefersReduced) {
        gsap.to(panel, {
          height: open ? 0 : panel.scrollHeight,
          duration: 0.45, ease: "power2.inOut",
          onComplete: () => { if (!open) panel.style.height = "auto"; }
        });
      } else {
        panel.style.height = open ? "0" : "auto";
      }
    });
  });

  /* ---------- Contact (デモ送信。サーバー送信なし) ---------- */
  const contactForm = document.getElementById("contactForm");
  const contactMsg = document.getElementById("contactMsg");
  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!contactForm.checkValidity()) return;
    setMsg(contactMsg, "送信ありがとうございます！（プロトタイプのため実送信は行いません）", "is-ok");
    contactForm.reset();
  });

  /* ---------- utils ---------- */
  function setMsg(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className = (el.classList.contains("post-form__msg") ? "post-form__msg " : "contact-form__msg ") + cls;
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    onScroll();
    initAnimations();
    loadNews();
  });
})();
