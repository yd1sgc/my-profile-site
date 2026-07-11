/* ==========================================================
   site.js — サイト全体の演出
   構成:
     0. オープニング（ローディング画面）
     1. スクロールフェードイン
     2. 現在地のナビハイライト
   ========================================================== */

/* ---------- 0. オープニング（ローディング画面） ---------- */
const loader = document.getElementById("loader");
const loaderStart = performance.now();
const LOADER_MIN_MS = 2400; // 最低でもこの時間は見せる（アニメーション1周分）

function hideLoader() {
  loader.classList.add("done");
  document.body.classList.remove("loading");
}

if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  hideLoader(); // 動きを減らす設定の人には出さない
} else {
  // ページの読み込みが終わり、かつ最低表示時間が過ぎたら閉じる
  addEventListener("load", () => {
    const wait = Math.max(0, LOADER_MIN_MS - (performance.now() - loaderStart));
    setTimeout(hideLoader, wait);
  });
  loader.addEventListener("click", hideLoader); // クリックでスキップ
}

/* ---------- 1. スクロールフェードイン ---------- */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".fade-in").forEach((el) => fadeObserver.observe(el));

/* ---------- 2. 現在見ているセクションのナビリンクをハイライト ---------- */
const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll("section");

const activeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id);
      });
    }
  });
}, { rootMargin: "-40% 0px -55% 0px" });

sections.forEach((sec) => activeObserver.observe(sec));
