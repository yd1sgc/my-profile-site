/* ==========================================================
   site.js — サイト全体の演出
   構成:
     1. スクロールフェードイン
     2. 現在地のナビハイライト
   ========================================================== */

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
