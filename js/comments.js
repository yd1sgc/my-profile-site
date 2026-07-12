/* ==========================================================
   comments.js — 隠しページのコメント欄
   Firebase Firestore を使って投稿・表示する（サーバー自作なし）。
   構成:
     1. Firebase設定（★ここに自分のプロジェクトの値を入れる）
     2. 初期化
     3. コメント一覧の表示（リアルタイム更新）
     4. 投稿フォームの処理（公開コメント／非公開メッセージ）
   ========================================================== */

/* ---------- 1. Firebase設定 ---------- */
// Firebaseコンソール（https://console.firebase.google.com/）で
// プロジェクトを作り、ウェブアプリを追加すると発行される値をここに貼り付ける。
// セットアップ手順は README.md の「コメント機能のセットアップ」を参照。
const firebaseConfig = {
  apiKey: "AIzaSyAJyCm9N9w1_wKDKXdmOfW0NstldIRKhpk",
  authDomain: "my-profile-site-559b4.firebaseapp.com",
  projectId: "my-profile-site-559b4",
  storageBucket: "my-profile-site-559b4.firebasestorage.app",
  messagingSenderId: "535073961181",
  appId: "1:535073961181:web:aa1014c7826149caaa9734",
};

const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

/* ---------- 2. 初期化 ---------- */
const listEl = document.getElementById("comment-list");
const form = document.getElementById("comment-form");
const nameInput = document.getElementById("comment-name");
const textInput = document.getElementById("comment-text");
const websiteInput = document.getElementById("comment-website"); // ハニーポット
const privateCheckbox = document.getElementById("comment-private");
const countEl = document.getElementById("comment-count");
const submitBtn = document.getElementById("comment-submit");
const statusEl = document.getElementById("comment-status");

const MAX_LEN = 300;
textInput.addEventListener("input", () => {
  countEl.textContent = `${textInput.value.length} / ${MAX_LEN}`;
});

if (!isConfigured) {
  // Firebaseが未設定でもサイト自体は壊れないようにする
  listEl.innerHTML = '<p class="comment-empty">コメント機能は準備中です。</p>';
  submitBtn.disabled = true;
} else {
  init();
}

async function init() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  const {
    getFirestore, collection, addDoc, serverTimestamp,
    query, orderBy, limit, onSnapshot,
  } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const commentsRef = collection(db, "comments");
  // 非公開メッセージの保存先。サイトからは絶対に読み込まない
  // （下の「投稿フォームの処理」でのみ書き込みに使う）。
  // Firebaseコンソール → Firestore Database → private-messages で確認する。
  const privateRef = collection(db, "private-messages");

  /* ---------- 3. コメント一覧の表示（リアルタイム更新） ---------- */
  const recentQuery = query(commentsRef, orderBy("createdAt", "desc"), limit(50));

  onSnapshot(recentQuery, (snapshot) => {
    if (snapshot.empty) {
      listEl.innerHTML = '<p class="comment-empty">まだコメントはありません。最初の1件をどうぞ。</p>';
      return;
    }
    listEl.innerHTML = "";
    snapshot.forEach((doc) => {
      listEl.appendChild(renderComment(doc.data()));
    });
  }, () => {
    listEl.innerHTML = '<p class="comment-empty">コメントを読み込めませんでした。</p>';
  });

  function renderComment(data) {
    const item = document.createElement("div");
    item.className = "comment-item";

    const head = document.createElement("div");
    head.className = "comment-item-head";

    const name = document.createElement("span");
    name.className = "comment-name";
    name.textContent = data.name || "名無し";

    const time = document.createElement("span");
    time.className = "comment-time";
    time.textContent = formatTime(data.createdAt);

    head.append(name, time);

    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = data.text || "";

    item.append(head, text);
    return item;
  }

  function formatTime(ts) {
    if (!ts) return "たった今"; // 送信直後、サーバー側の時刻がまだ付いていない
    const d = ts.toDate();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /* ---------- 4. 投稿フォームの処理 ---------- */
  let lastSubmitAt = 0;
  const SUBMIT_COOLDOWN_MS = 8000; // 連投防止

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (websiteInput.value.trim() !== "") return; // ハニーポットに入力があればボット扱いで無視

    const text = textInput.value.trim();
    if (!text) return;

    const now = Date.now();
    if (now - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
      statusEl.textContent = "少し間を空けてから投稿してください。";
      return;
    }

    const isPrivate = privateCheckbox.checked;
    const targetRef = isPrivate ? privateRef : commentsRef;

    submitBtn.disabled = true;
    statusEl.textContent = "送信中…";

    try {
      await addDoc(targetRef, {
        name: nameInput.value.trim().slice(0, 30),
        text: text.slice(0, MAX_LEN),
        createdAt: serverTimestamp(),
      });
      lastSubmitAt = now;
      textInput.value = "";
      countEl.textContent = `0 / ${MAX_LEN}`;
      privateCheckbox.checked = false; // 次回はうっかり非公開のままにならないよう戻す
      statusEl.textContent = isPrivate ? "非公開で送信しました。" : "投稿しました。";
      setTimeout(() => { statusEl.textContent = ""; }, 3000);
    } catch (err) {
      statusEl.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
    } finally {
      submitBtn.disabled = false;
    }
  });
}
