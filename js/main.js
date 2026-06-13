/* =========================================================
   studio°mono  —  main.js
   管理モード(クライアント認証) + Profile/News/FAQ 編集 + Contact(mailto)
   ---------------------------------------------------------
   ※ 静的サイトのため「本物の認証」は作れません。この管理モードは
     “パスワードを知る人だけに編集UIを見せる”ためのものです。
     公開サイトを実際に書き換えられるのは data.json を push できる人だけ。
   ========================================================= */
(() => {
  "use strict";

  /* ====== 設定（必要に応じて変更） ====== */
  const CONFIG = {
    // 管理者パスワードの SHA-256 ハッシュ。
    // 既定パスワード: "edamame1023"  ← 変更推奨。
    // 変更方法: 管理ログイン画面で新パスワードを入力 → コンソールに出る
    //          ハッシュをこの値に貼り替えて push。
    adminHash: "5d0467d1eecd47ad62eaa7565b89e6dad7dd01124f71ffc652a6281573f32872",
    mailTo: "n.04.10.23.00@gmail.com",
  };

  const STORE_DATA = "studio_mono_data";   // 編集中データ（localStorageに永続保存）
  const STORE_AUTH = "studio_mono_admin";  // 管理モードフラグ（セッション）

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";

  let state = { profile: { name: "", tagline: "", bio: "", facts: [] }, news: [], faq: [] };

  /* ====== 小物 ====== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  function setMsg(el, text, cls = "") {
    if (!el) return;
    const base = el.className.split(" ")[0];
    el.textContent = text;
    el.className = base + " " + cls;
  }
  async function sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function saveState() {
    try { localStorage.setItem(STORE_DATA, JSON.stringify(state)); } catch {}
    if (hasGSAP && !prefersReduced) ScrollTrigger.refresh();
  }

  /* =========================================================
     データ読み込み（data.json = 公開ベース / localStorage = 編集中）
     ========================================================= */
  async function loadData() {
    let fetched = null;
    try {
      const res = await fetch("data/data.json");
      if (res.ok) fetched = await res.json();
    } catch {}
    let local = null;
    try { local = JSON.parse(localStorage.getItem(STORE_DATA) || "null"); } catch {}

    const src = local || fetched || {};
    state = {
      profile: Object.assign({ name: "", tagline: "", bio: "", facts: [] }, src.profile || {}),
      news: Array.isArray(src.news) ? src.news : [],
      faq: Array.isArray(src.faq) ? src.faq : [],
    };
    renderProfile();
    renderNews();
    renderFaq();
  }

  /* =========================================================
     Profile
     ========================================================= */
  const profileCard = $("#profileCard");

  function renderProfile() {
    if (!profileCard) return;
    const p = state.profile;
    profileCard.innerHTML = `
      <div class="avatar" aria-hidden="true">🐾</div>
      <h3>${escapeHTML(p.name)}</h3>
      ${p.tagline ? `<p class="profile__tagline">${escapeHTML(p.tagline)}</p>` : ""}
      ${p.bio ? `<p class="profile__bio">${escapeHTML(p.bio)}</p>` : ""}
      <dl class="profile__list">
        ${(p.facts || []).map((f) => `
          <div class="profile__row">
            <dt>${escapeHTML(f.label)}</dt>
            <dd>${escapeHTML(f.value)}</dd>
          </div>`).join("")}
      </dl>`;
    if (hasGSAP && !prefersReduced) {
      gsap.from(profileCard.querySelectorAll(".profile__row"),
        { x: -16, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" });
    }
  }

  // 編集フォーム
  const profileForm = $("#profileForm");
  const factRows = $("#factRows");
  const profileMsg = $("#profileMsg");

  function factRowHTML(label = "", value = "") {
    return `<div class="fact-row">
      <input type="text" class="fact-label" placeholder="項目名" value="${escapeHTML(label)}" maxlength="20" />
      <input type="text" class="fact-value" placeholder="内容" value="${escapeHTML(value)}" maxlength="60" />
      <button type="button" class="item-del fact-del" title="削除">×</button>
    </div>`;
  }
  function fillProfileForm() {
    if (!profileForm) return;
    const el = profileForm.elements;
    el.name.value = state.profile.name || "";
    el.tagline.value = state.profile.tagline || "";
    el.bio.value = state.profile.bio || "";
    factRows.innerHTML = (state.profile.facts || []).map((f) => factRowHTML(f.label, f.value)).join("");
  }
  $("#addFact")?.addEventListener("click", () => factRows.insertAdjacentHTML("beforeend", factRowHTML()));
  factRows?.addEventListener("click", (e) => {
    if (e.target.classList.contains("fact-del")) e.target.closest(".fact-row").remove();
  });
  profileForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const facts = $$(".fact-row", factRows).map((row) => ({
      label: row.querySelector(".fact-label").value.trim(),
      value: row.querySelector(".fact-value").value.trim(),
    })).filter((f) => f.label || f.value);
    const el = profileForm.elements;
    state.profile = {
      name: el.name.value.trim(),
      tagline: el.tagline.value.trim(),
      bio: el.bio.value.trim(),
      facts,
    };
    saveState();
    renderProfile();
    setMsg(profileMsg, "プロフィールを保存しました。", "is-ok");
  });

  /* =========================================================
     News（追加 / 編集 / 削除）
     ========================================================= */
  const newsList = $("#newsList");
  const postForm = $("#postForm");
  const postMsg = $("#postMsg");
  const newsFormTitle = $("#newsFormTitle");
  const newsSubmit = $("#newsSubmit");
  const newsCancel = $("#newsCancel");

  function renderNews() {
    if (!newsList) return;
    const items = [...state.news].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (!items.length) { newsList.innerHTML = `<li class="news__empty">まだ記事がありません。</li>`; return; }
    newsList.innerHTML = items.map((n) => `
      <li class="news__item" data-id="${escapeHTML(n.id)}">
        <span class="news__date">${escapeHTML(n.date)}</span>
        <span class="news__cat">${escapeHTML(n.category || "お知らせ")}</span>
        <span class="news__title">${escapeHTML(n.title)}</span>
        <span class="news__body">${escapeHTML(n.body)}</span>
        <div class="item__admin admin-only">
          <button class="item-edit" data-id="${escapeHTML(n.id)}">編集</button>
          <button class="item-del" data-id="${escapeHTML(n.id)}">削除</button>
        </div>
      </li>`).join("");
    if (hasGSAP && !prefersReduced) {
      gsap.from(".news__item", { opacity: 0, y: 18, duration: 0.5, stagger: 0.06, ease: "power2.out" });
    }
  }

  function resetNewsForm() {
    postForm.reset();
    postForm.elements.id.value = "";
    newsFormTitle.textContent = "記事を追加";
    newsSubmit.textContent = "追加する";
    newsCancel.hidden = true;
  }
  newsCancel?.addEventListener("click", () => { resetNewsForm(); setMsg(postMsg, ""); });

  postForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(postForm);
    const id = fd.get("id");
    const data = {
      category: (fd.get("category") || "お知らせ").toString(),
      title: (fd.get("title") || "").toString().trim().slice(0, 60),
      body: (fd.get("body") || "").toString().trim().slice(0, 400),
    };
    if (!data.title || !data.body) return;

    if (id) { // 編集
      const item = state.news.find((n) => String(n.id) === String(id));
      if (item) Object.assign(item, data);
      setMsg(postMsg, "記事を更新しました。", "is-ok");
    } else {  // 追加
      state.news.unshift(Object.assign({ id: Date.now(), date: new Date().toISOString().slice(0, 10) }, data));
      setMsg(postMsg, "記事を追加しました（ブラウザに永久保存）。", "is-ok");
    }
    saveState();
    renderNews();
    resetNewsForm();
  });

  newsList?.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".item-edit");
    const delBtn = e.target.closest(".item-del");
    if (editBtn) {
      const n = state.news.find((x) => String(x.id) === editBtn.dataset.id);
      if (!n) return;
      const el = postForm.elements;
      el.id.value = n.id;
      el.category.value = n.category || "お知らせ";
      el.title.value = n.title || "";
      el.body.value = n.body || "";
      newsFormTitle.textContent = "記事を編集";
      newsSubmit.textContent = "更新する";
      newsCancel.hidden = false;
      $("#news").scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (delBtn) {
      if (!confirm("この記事を削除しますか？")) return;
      state.news = state.news.filter((x) => String(x.id) !== delBtn.dataset.id);
      saveState();
      renderNews();
    }
  });

  /* =========================================================
     FAQ（追加 / 編集 / 削除 + アコーディオン）
     ========================================================= */
  const accordion = $("#accordion");
  const faqForm = $("#faqForm");
  const faqMsg = $("#faqMsg");
  const faqFormTitle = $("#faqFormTitle");
  const faqSubmit = $("#faqSubmit");
  const faqCancel = $("#faqCancel");

  function renderFaq() {
    if (!accordion) return;
    if (!state.faq.length) { accordion.innerHTML = `<p class="news__empty">質問がありません。</p>`; return; }
    accordion.innerHTML = state.faq.map((f) => `
      <div class="acc__item" data-id="${escapeHTML(f.id)}">
        <button class="acc__q" aria-expanded="false">${escapeHTML(f.q)}<i></i></button>
        <div class="acc__a"><p>${escapeHTML(f.a)}</p></div>
        <div class="item__admin admin-only">
          <button class="item-edit" data-id="${escapeHTML(f.id)}">編集</button>
          <button class="item-del" data-id="${escapeHTML(f.id)}">削除</button>
        </div>
      </div>`).join("");
    if (hasGSAP && !prefersReduced) {
      gsap.from(".acc__item", { opacity: 0, y: 18, duration: 0.5, stagger: 0.08, ease: "power2.out" });
    }
  }

  function resetFaqForm() {
    faqForm.reset(); faqForm.elements.id.value = "";
    faqFormTitle.textContent = "質問を追加";
    faqSubmit.textContent = "追加する";
    faqCancel.hidden = true;
  }
  faqCancel?.addEventListener("click", () => { resetFaqForm(); setMsg(faqMsg, ""); });

  faqForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(faqForm);
    const id = fd.get("id");
    const q = (fd.get("q") || "").toString().trim().slice(0, 80);
    const a = (fd.get("a") || "").toString().trim().slice(0, 400);
    if (!q || !a) return;
    if (id) {
      const item = state.faq.find((f) => String(f.id) === String(id));
      if (item) { item.q = q; item.a = a; }
      setMsg(faqMsg, "質問を更新しました。", "is-ok");
    } else {
      state.faq.push({ id: Date.now(), q, a });
      setMsg(faqMsg, "質問を追加しました。", "is-ok");
    }
    saveState(); renderFaq(); resetFaqForm();
  });

  accordion?.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".item-edit");
    const delBtn = e.target.closest(".item-del");
    const q = e.target.closest(".acc__q");

    if (editBtn) {
      const f = state.faq.find((x) => String(x.id) === editBtn.dataset.id);
      if (!f) return;
      const el = faqForm.elements;
      el.id.value = f.id; el.q.value = f.q; el.a.value = f.a;
      faqFormTitle.textContent = "質問を編集";
      faqSubmit.textContent = "更新する";
      faqCancel.hidden = false;
      $("#faq").scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (delBtn) {
      if (!confirm("この質問を削除しますか？")) return;
      state.faq = state.faq.filter((x) => String(x.id) !== delBtn.dataset.id);
      saveState(); renderFaq();
    } else if (q) {
      const open = q.getAttribute("aria-expanded") === "true";
      const panel = q.nextElementSibling;
      q.setAttribute("aria-expanded", String(!open));
      if (hasGSAP && !prefersReduced) {
        gsap.to(panel, { height: open ? 0 : panel.scrollHeight, duration: 0.45, ease: "power2.inOut",
          onComplete: () => { if (!open) panel.style.height = "auto"; } });
      } else { panel.style.height = open ? "0" : "auto"; }
    }
  });

  /* =========================================================
     管理者ログイン
     ========================================================= */
  const loginModal = $("#loginModal");
  const loginForm = $("#loginForm");
  const loginPass = $("#loginPass");
  const loginMsg = $("#loginMsg");

  function setAdmin(on) {
    document.body.classList.toggle("is-admin", on);
    $("#adminToggle").textContent = on ? "ADMIN ✓" : "ADMIN";
    if (on) { fillProfileForm(); sessionStorage.setItem(STORE_AUTH, "1"); }
    else sessionStorage.removeItem(STORE_AUTH);
    if (hasGSAP && !prefersReduced) ScrollTrigger.refresh();
  }
  function openLogin() { loginModal.hidden = false; setTimeout(() => loginPass.focus(), 50); }
  function closeLogin() { loginModal.hidden = true; loginForm.reset(); setMsg(loginMsg, ""); }

  $("#adminToggle")?.addEventListener("click", openLogin);
  $("#loginClose")?.addEventListener("click", closeLogin);
  $("#loginOverlay")?.addEventListener("click", closeLogin);
  $("#adminLogout")?.addEventListener("click", () => setAdmin(false));

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = loginPass.value;
    if (!pass) return;
    let hash;
    try { hash = await sha256(pass); }
    catch { setMsg(loginMsg, "この環境では暗号化が使えません（https/localhostで開いてください）。", "is-err"); return; }
    // パスワード変更用: 入力値のハッシュをコンソールに出す
    console.info("[studio°mono] このパスワードのSHA-256:", hash);
    if (hash === CONFIG.adminHash) { setAdmin(true); closeLogin(); }
    else setMsg(loginMsg, "パスワードが違います。", "is-err");
  });

  /* =========================================================
     公開用 data.json の書き出し
     ========================================================= */
  $("#downloadJson")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // ローカル編集を破棄して、公開中の data.json を読み込み直す
  $("#adminReset")?.addEventListener("click", async () => {
    if (!confirm("このブラウザの編集内容を破棄し、公開中の data.json を読み込み直しますか？")) return;
    localStorage.removeItem(STORE_DATA);
    await loadData();
    fillProfileForm();
  });

  /* =========================================================
     Contact（メールアドレス欄なし / mailto で指定アドレスへ）
     ========================================================= */
  const contactForm = $("#contactForm");
  const contactMsg = $("#contactMsg");
  contactForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!contactForm.checkValidity()) return;
    const name = contactForm.elements.name.value.trim();
    const message = contactForm.elements.message.value.trim();
    const subject = `お問い合わせ（${name} 様）`;
    const body = `お名前: ${name}\n\n${message}`;
    window.location.href =
      `mailto:${CONFIG.mailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMsg(contactMsg, "メールアプリを起動しました。開いた画面でそのまま送信してください。", "is-ok");
    contactForm.reset();
  });

  /* =========================================================
     ヘッダー / ナビ / スクロール進捗
     ========================================================= */
  const header = $("#header");
  const nav = $(".nav");
  const progress = $("#progress");
  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 20);
    if (progress) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  $("#navToggle")?.addEventListener("click", () => nav.classList.toggle("is-open"));
  nav?.addEventListener("click", (e) => { if (e.target.tagName === "A") nav.classList.remove("is-open"); });

  /* =========================================================
     GSAP スクロール演出
     ========================================================= */
  function initAnimations() {
    if (!hasGSAP || prefersReduced) {
      $$("[data-reveal],[data-fade]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from("[data-hero-line]", { yPercent: 120, opacity: 0, duration: 1.0, stagger: 0.14 })
      .from("[data-fade]", { y: 26, opacity: 0, duration: 0.7, stagger: 0.12 }, "-=0.45");

    gsap.utils.toArray(".section__head").forEach((head) => {
      gsap.from(head.children, { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: head, start: "top 85%" } });
    });
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" } });
    });
    gsap.to(".blob--blue", { yPercent: 40, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".blob--pink", { yPercent: -25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ====== init ====== */
  document.addEventListener("DOMContentLoaded", async () => {
    onScroll();
    await loadData();
    if (sessionStorage.getItem(STORE_AUTH) === "1") setAdmin(true);
    initAnimations();
  });
})();
