/* =========================================================
   studio°mono  —  main.js
   GSAP ScrollTrigger 演出 + News読込/投稿 + FAQ + Contact
   ========================================================= */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  /* ---------- Header: スクロールで縮む / モバイルメニュー ---------- */
  const header = document.getElementById("header");
  const nav = document.querySelector(".nav");
  const navToggle = document.getElementById("navToggle");

  window.addEventListener("scroll", () => {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }, { passive: true });

  navToggle?.addEventListener("click", () => nav.classList.toggle("is-open"));
  nav?.addEventListener("click", (e) => {
    if (e.target.tagName === "A") nav.classList.remove("is-open");
  });

  /* ---------- GSAP: スクロール連動アニメーション ---------- */
  function initAnimations() {
    if (!hasGSAP || prefersReduced) {
      // フォールバック: 全要素を即表示
      document.querySelectorAll("[data-reveal],[data-fade]").forEach((el) => {
        el.style.opacity = 1; el.style.transform = "none";
      });
      document.querySelectorAll(".skill__bar i").forEach((bar) => {
        bar.style.width = bar.closest(".skill").dataset.skill + "%";
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Hero: 初期演出（タイトル行を順にスライドイン）
    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .from("[data-hero-line]", { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.12 })
      .from("[data-fade]", { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 }, "-=0.4");

    // 各セクションの reveal 要素: スクロールでフェード＆スライドイン
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
      });
    });

    // スキルバー: ビューに入ったら幅をアニメーション
    gsap.utils.toArray(".skill").forEach((skill) => {
      const bar = skill.querySelector(".skill__bar i");
      gsap.to(bar, {
        width: skill.dataset.skill + "%", duration: 1.2, ease: "power2.out",
        scrollTrigger: { trigger: skill, start: "top 88%" }
      });
    });

    // 背景blobをスクロールで緩やかにパララックス
    gsap.to(".blob--blue", {
      yPercent: 30, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
  }

  /* ---------- News: data.json を読込んで描画 ---------- */
  const newsList = document.getElementById("newsList");
  let newsData = []; // 現在表示中の記事（エディタの追加もここに反映）

  async function loadNews() {
    if (!newsList) return;
    try {
      const res = await fetch("data/data.json");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      newsData = Array.isArray(data.news) ? data.news : [];
      renderNews(newsData);
    } catch (err) {
      newsList.innerHTML = `<li class="news__empty">記事を読み込めませんでした。</li>`;
    }
  }

  function renderNews(items) {
    if (!items.length) {
      newsList.innerHTML = `<li class="news__empty">まだ記事がありません。</li>`;
      return;
    }
    // 新しい順
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    newsList.innerHTML = items.map((n) => `
      <li class="news__item">
        <span class="news__date">${escapeHTML(n.date || "")}</span>
        <span class="news__cat">${escapeHTML(n.category || "お知らせ")}</span>
        <span class="news__title">${escapeHTML(n.title || "")}</span>
        <span class="news__body">${escapeHTML(n.body || "")}</span>
      </li>`).join("");

    // 追加された行をふわっと表示
    if (hasGSAP && !prefersReduced) {
      gsap.from(".news__item", { opacity: 0, y: 20, duration: 0.6, stagger: 0.08, ease: "power2.out" });
    }
  }

  /* ---------- News: 記事エディタ（クライアント側のみ・送信なし） ----------
     追加するとプレビューに反映し、更新後の data.json を生成。
     ダウンロードして data/data.json を差し替え、git push で公開する。 */
  const postForm = document.getElementById("postForm");
  const postMsg = document.getElementById("postMsg");
  const jsonOut = document.getElementById("jsonOut");
  const downloadBtn = document.getElementById("downloadJson");

  function currentJson() {
    return JSON.stringify({ news: newsData }, null, 4);
  }

  postForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const title = (fd.get("title") || "").toString().trim().slice(0, 60);
    const body = (fd.get("body") || "").toString().trim().slice(0, 400);
    const category = (fd.get("category") || "お知らせ").toString();
    if (!title || !body) return;

    const nextId = newsData.reduce((m, n) => Math.max(m, Number(n.id) || 0), 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    newsData.unshift({ id: nextId, date: today, category, title, body });

    renderNews(newsData);
    if (jsonOut) jsonOut.value = currentJson();
    setMsg(postMsg, "プレビューに追加しました。「data.json をダウンロード」で保存できます。", "is-ok");
    postForm.reset();
  });

  downloadBtn?.addEventListener("click", () => {
    const blob = new Blob([currentJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setMsg(postMsg, "data.json をダウンロードしました。data/ 内のファイルを差し替えてください。", "is-ok");
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

  /* ---------- Contact (デモ送信。API禁止のためローカル完結) ---------- */
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
    initAnimations();
    loadNews();
  });
})();
