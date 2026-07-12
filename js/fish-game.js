/* ==========================================================
   fish-game.js — 魚の誘導ゲーム
   構成:
     1. 設定（CONFIG）… 調整したい数値はぜんぶここ
     2. 隠しページの開閉
     3. キャンバスの準備
     4. 魚の生成とサークルの配置
     5. マウス・タッチ入力
     6. 魚の動き（毎フレームの更新）
     7. 魚の描画
     8. メインループ（サークル・エフェクト・クリア演出）
   ========================================================== */
(() => {

  /* ---------- 1. 設定 ---------- */
  const CONFIG = {
    // 魚のリスト（s=大きさ / sec=誘導先セクションのid / side=円の左右位置 0〜1）
    fish: [
      { s: 12, sec: "home",    side: 0.16 },
      { s: 9,  sec: "about",   side: 0.84 },
      { s: 7,  sec: "works",   side: 0.16 },
      { s: 5,  sec: "contact", side: 0.84 },
    ],

    // 色（RGBの配列）
    colorNormal:   [250, 250, 250], // ふだんの魚（白）
    colorCaptured: [185, 167, 242], // 捕獲後（紫）

    // 動き
    wanderForce:  0.12, // ふらふら泳ぐ力
    cruiseMax:    2.3,  // ふだんの最高速度（大きいほど速い）
    fleeMax:      3.0,  // 逃げるときの最高速度
    minSpeed:     0.5,  // 最低速度（止まらないように）
    fleeRadius:   160,  // カーソルに気づく距離(px)
    clickBonus:   120,  // クリック時、気づく距離に足される距離(px)
    cautionForce: 0.08, // 警戒心（追われていないとき円を避ける力）

    // ゲーム
    dwellFrames: 25,    // 円の中にとどまる必要フレーム数（60 ≒ 1秒）
    zonePerSize: 5,     // 円の半径 = s × zonePerSize + zoneBase
    zoneBase:    24,
  };

  /* ---------- 2. 隠しページの開閉 ---------- */
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const counter = document.getElementById("fish-counter");
  const secretLink = document.getElementById("secret-link");
  const overlay = document.getElementById("secret-overlay");

  secretLink.addEventListener("click", (e) => {
    e.preventDefault();
    overlay.classList.add("open");
  });
  document.getElementById("secret-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.classList.remove("open");
  });

  // デバッグ用：コンソールで __openSecret() と打つと、ゲームを解かずに隠しページを開ける
  window.__openSecret = () => overlay.classList.add("open");

  // クリアしたらナビに「???」リンクをふわっと出す
  function revealLink() {
    if (!secretLink.hidden) return;
    secretLink.hidden = false;
    secretLink.style.opacity = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => { secretLink.style.opacity = "1"; }));
  }

  // 動きを減らす設定の人にはゲームを出さない
  if (reduceMotion) {
    counter.style.display = "none";
    return;
  }

  /* ---------- 3. キャンバスの準備 ---------- */
  const cv = document.getElementById("fish-canvas");
  const ctx = cv.getContext("2d");
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = cv.clientWidth, H = cv.clientHeight;

  /* ---------- 4. 魚の生成とサークルの配置 ---------- */
  const SEG = 10; // 背骨の節数（描画のなめらかさ）

  const fishes = CONFIG.fish.map((d) => {
    const x = 100 + Math.random() * Math.max(200, W - 200);
    const y = 120 + Math.random() * Math.max(100, H - 200);
    const spine = [];
    for (let i = 0; i < SEG; i++) spine.push({ x: x - i * d.s * 0.55, y });
    return {
      s: d.s, sec: d.sec, side: d.side,
      x, y,                                   // 頭の位置
      vx: Math.random() - 0.5, vy: Math.random() - 0.5, // 速度
      spine,                                  // 背骨（頭から尾への点の列）
      wt: Math.random() * 6.28,               // 尾を振る位相
      zone: { x: 0, y: 0, docY: 0, r: d.s * CONFIG.zonePerSize + CONFIG.zoneBase },
      captured: false, dwell: 0, orbit: 0, mix: 0,
    };
  });
  window.__fish = fishes; // デバッグ用（コンソールから覗ける）

  // 各サークルを担当セクションの高さの中央に置く
  function placeZones() {
    fishes.forEach((f) => {
      const el = document.getElementById(f.sec);
      f.zone.docY = el.offsetTop + el.offsetHeight / 2;
      f.zone.x = Math.max(f.zone.r + 14, Math.min(W * f.side, W - f.zone.r - 14));
    });
  }

  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    placeZones();
    fishes.forEach((f) => {
      f.x = Math.max(10, Math.min(W - 10, f.x));
      f.y = Math.max(70, Math.min(H - 10, f.y));
    });
  }
  addEventListener("resize", resize);
  addEventListener("load", placeZones);
  resize();

  /* ---------- 5. マウス・タッチ入力 ---------- */
  let mx = -9999, my = -9999; // カーソル位置（画面外=反応しない）
  let pulse = 0;              // クリック直後の「散らす」強さ（1→0へ減衰）

  addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });
  addEventListener("mouseout", (e) => { if (!e.relatedTarget) { mx = -9999; my = -9999; } });
  addEventListener("click", (e) => { mx = e.clientX; my = e.clientY; pulse = 1; });
  addEventListener("touchstart", (e) => { mx = e.touches[0].clientX; my = e.touches[0].clientY; pulse = 1; }, { passive: true });
  addEventListener("touchmove", (e) => { mx = e.touches[0].clientX; my = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", () => { mx = -9999; my = -9999; }, { passive: true });

  /* ---------- 6. 魚の動き（毎フレームの更新） ---------- */
  const lerp = (a, b, k) => a + (b - a) * k;
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const mixCol = (m) => CONFIG.colorNormal.map((w, i) => Math.round(lerp(w, CONFIG.colorCaptured[i], m)));

  function step(f) {
    const prevX = f.x, prevY = f.y;

    if (f.captured) {
      // 定着後はサークル内をゆっくり周回
      f.orbit += 0.012 + 0.06 / f.s;
      const orbR = f.zone.r * 0.62;
      f.x = lerp(f.x, f.zone.x + Math.cos(f.orbit) * orbR, 0.06);
      f.y = lerp(f.y, f.zone.y + Math.sin(f.orbit) * orbR, 0.06);
      f.mix = Math.min(1, f.mix + 0.03); // 白→紫へ徐々に変化
    } else {
      // ふらふら遊泳
      f.vx += (Math.random() - 0.5) * CONFIG.wanderForce;
      f.vy += (Math.random() - 0.5) * CONFIG.wanderForce;

      // カーソルから逃げる（小さい魚ほど俊敏）
      const dx = f.x - mx, dy = f.y - my, d = Math.hypot(dx, dy);
      const fleeR = CONFIG.fleeRadius + pulse * CONFIG.clickBonus;
      const fleeing = d < fleeR;
      if (fleeing && d > 0.1) {
        const k = (1 - d / fleeR) * (1.0 + pulse * 1.4) * (13 / (f.s + 5));
        f.vx += (dx / d) * k;
        f.vy += (dy / d) * k;
      }

      // 警戒心：追われていないときは自分の円に近づかない
      const zdx = f.x - f.zone.x, zdy = f.y - f.zone.y, zdd = Math.hypot(zdx, zdy);
      if (!fleeing && zdd < f.zone.r * 1.15 && zdd > 0.1) {
        f.vx += (zdx / zdd) * CONFIG.cautionForce;
        f.vy += (zdy / zdd) * CONFIG.cautionForce;
      }

      // 画面端で内側へ（上端はナビ分あける）
      if (f.x < 40) f.vx += 0.12;
      if (f.x > W - 40) f.vx -= 0.12;
      if (f.y < 90) f.vy += 0.12;
      if (f.y > H - 40) f.vy -= 0.12;

      // 速度を落ち着かせて、上限・下限におさめる
      f.vx *= 0.99;
      f.vy *= 0.99;
      const sp = Math.hypot(f.vx, f.vy);
      const maxS = (fleeing ? CONFIG.fleeMax : CONFIG.cruiseMax) * (11 / (f.s + 4));
      if (sp > maxS) { f.vx *= maxS / sp; f.vy *= maxS / sp; }
      if (sp < CONFIG.minSpeed && sp > 0.01) { f.vx *= CONFIG.minSpeed / sp; f.vy *= CONFIG.minSpeed / sp; }
      f.x += f.vx;
      f.y += f.vy;
      f.x = Math.max(10, Math.min(W - 10, f.x));
      f.y = Math.max(70, Math.min(H - 10, f.y));

      // 自分のサークル内に一定時間とどまると定着
      const zd = Math.hypot(f.x - f.zone.x, f.y - f.zone.y);
      if (zd < f.zone.r * 0.6) {
        f.dwell++;
        if (f.dwell > CONFIG.dwellFrames) {
          f.captured = true;
          f.orbit = Math.atan2(f.y - f.zone.y, f.x - f.zone.x);
          fx.push({ z: f.zone, t0: t });
          updateCounter();
        }
      } else {
        f.dwell = Math.max(0, f.dwell - 2);
      }
    }

    // 泳ぎの位相（速いほど尾が速く振れる）
    const spd = Math.hypot(f.x - prevX, f.y - prevY);
    f.wt += 0.12 + spd * 0.06;

    // 背骨：頭にうねりを与え、後続の節が追従する
    const a = Math.atan2(f.y - prevY || f.vy, f.x - prevX || f.vx);
    const wig = Math.sin(f.wt) * f.s * 0.12;
    f.spine[0].x = f.x + Math.cos(a + Math.PI / 2) * wig;
    f.spine[0].y = f.y + Math.sin(a + Math.PI / 2) * wig;
    const gap = f.s * 0.55;
    for (let i = 1; i < SEG; i++) {
      const p = f.spine[i], q = f.spine[i - 1];
      const ddx = p.x - q.x, ddy = p.y - q.y;
      const dd = Math.hypot(ddx, ddy) || 1;
      p.x = q.x + (ddx / dd) * gap;
      p.y = q.y + (ddy / dd) * gap;
    }
  }

  /* ---------- 7. 魚の描画 ---------- */
  // 体の幅の割合（頭側→尾側）。合計10個 = 背骨の節数
  const BODY_W = [0.6, 0.92, 1, 0.98, 0.92, 0.8, 0.62, 0.4, 0.23, 0.1];

  // 形の調整用パラメータ（頻繁にいじる数値はここに集約）
  const SHAPE = {
    bodyScale:  0.8,  // BODY_W × s に掛ける全体スケール（体の太さ）
    tailLength: 1.6,  // 尾びれの長さ（s倍）
    tailWobble: 0.3,  // 尾びれの振れ幅（s倍）
    finSeg:     2,    // 胸びれを付ける背骨の節番号
  };

  function drawFish(f) {
    const s = f.s, sp = f.spine;
    const col = mixCol(f.mix);

    // 各節の向き（前後の節から求める）
    const angs = [];
    for (let i = 0; i < SEG; i++) {
      const q0 = sp[Math.max(i - 1, 0)], q1 = sp[Math.min(i + 1, SEG - 1)];
      angs.push(Math.atan2(q0.y - q1.y, q0.x - q1.x));
    }

    // 尾びれ：外へ大きく広がる二叉。先端はとがらせ、間に切れ込み
    const aT = angs[SEG - 1] + Math.PI;              // 尾の向き
    const tb = sp[SEG - 1];                          // 尾の付け根
    const pxT = Math.cos(aT + Math.PI / 2), pyT = Math.sin(aT + Math.PI / 2);
    const dxT = Math.cos(aT), dyT = Math.sin(aT);
    const sw = Math.sin(f.wt + 2.5) * s * SHAPE.tailWobble; // 尾の振り
    const fl = s * SHAPE.tailLength;                        // 尾びれの長さ
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath();
    ctx.moveTo(tb.x, tb.y);
    ctx.quadraticCurveTo( // 外側の縁（上）：外へふくらむ
      tb.x + dxT * fl * 0.35 + pxT * (sw * 0.5 + s * 0.6), tb.y + dyT * fl * 0.35 + pyT * (sw * 0.5 + s * 0.6),
      tb.x + dxT * fl + pxT * (sw + s * 0.85), tb.y + dyT * fl + pyT * (sw + s * 0.85)
    );
    ctx.quadraticCurveTo( // 内側の縁（上）：切れ込みへ
      tb.x + dxT * fl * 0.75 + pxT * (sw + s * 0.35), tb.y + dyT * fl * 0.75 + pyT * (sw + s * 0.35),
      tb.x + dxT * fl * 0.45 + pxT * sw * 0.5, tb.y + dyT * fl * 0.45 + pyT * sw * 0.5
    );
    ctx.quadraticCurveTo( // 内側の縁（下）
      tb.x + dxT * fl * 0.75 + pxT * (sw - s * 0.35), tb.y + dyT * fl * 0.75 + pyT * (sw - s * 0.35),
      tb.x + dxT * fl + pxT * (sw - s * 0.85), tb.y + dyT * fl + pyT * (sw - s * 0.85)
    );
    ctx.quadraticCurveTo( // 外側の縁（下）
      tb.x + dxT * fl * 0.35 + pxT * (sw * 0.5 - s * 0.6), tb.y + dyT * fl * 0.35 + pyT * (sw * 0.5 - s * 0.6),
      tb.x, tb.y
    );
    ctx.closePath();
    ctx.fill();

    // 胸びれ：体側の小さなとがり
    const finSeg = SHAPE.finSeg;
    const a2 = angs[finSeg];
    const flap = Math.sin(f.wt * 0.7 + f.s) * 0.15;
    ctx.fillStyle = rgba(col, 1);
    for (const sgn of [1, -1]) {
      const bw = BODY_W[finSeg] * s * SHAPE.bodyScale;
      const bx = sp[finSeg].x + Math.cos(a2 + sgn * Math.PI / 2) * bw * 0.85;
      const by = sp[finSeg].y + Math.sin(a2 + sgn * Math.PI / 2) * bw * 0.85;
      const fa = a2 + sgn * (2.35 + flap);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(
        bx + Math.cos(fa - sgn * 0.3) * s * 0.6, by + Math.sin(fa - sgn * 0.3) * s * 0.6,
        bx + Math.cos(fa) * s * 0.85, by + Math.sin(fa) * s * 0.85
      );
      ctx.quadraticCurveTo(
        bx + Math.cos(a2 + Math.PI) * s * 0.6, by + Math.sin(a2 + Math.PI) * s * 0.6,
        sp[finSeg + 1].x + Math.cos(a2 + sgn * Math.PI / 2) * bw * 0.55, sp[finSeg + 1].y + Math.sin(a2 + sgn * Math.PI / 2) * bw * 0.55
      );
      ctx.closePath();
      ctx.fill();
    }

    // 胴体：ふっくらした涙滴形（頭は円弧キャップとして輪郭に一体化、継ぎ目なし）
    const L = [], R = [];
    for (let i = 0; i < SEG; i++) {
      const w = BODY_W[i] * s * SHAPE.bodyScale;
      L.push({ x: sp[i].x + Math.cos(angs[i] + Math.PI / 2) * w, y: sp[i].y + Math.sin(angs[i] + Math.PI / 2) * w });
      R.push({ x: sp[i].x + Math.cos(angs[i] - Math.PI / 2) * w, y: sp[i].y + Math.sin(angs[i] - Math.PI / 2) * w });
    }
    const hw = BODY_W[0] * s * SHAPE.bodyScale;
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath();
    ctx.moveTo(R[0].x, R[0].y);
    // 鼻先：中心を背骨の先端に合わせた半円。R[0]→L[0]と半径が一致するので継ぎ目ができない
    ctx.arc(sp[0].x, sp[0].y, hw, angs[0] - Math.PI / 2, angs[0] + Math.PI / 2);
    for (let i = 1; i < SEG; i++) {
      ctx.quadraticCurveTo(L[i - 1].x, L[i - 1].y, (L[i - 1].x + L[i].x) / 2, (L[i - 1].y + L[i].y) / 2);
    }
    ctx.quadraticCurveTo(L[SEG - 1].x, L[SEG - 1].y, sp[SEG - 1].x, sp[SEG - 1].y);
    for (let i = SEG - 1; i >= 1; i--) {
      ctx.quadraticCurveTo(R[i].x, R[i].y, (R[i].x + R[i - 1].x) / 2, (R[i].y + R[i - 1].y) / 2);
    }
    ctx.lineTo(R[0].x, R[0].y);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- 8. メインループ ---------- */
  const fx = [];  // 捕獲した瞬間に広がるリング
  let t = 0;      // フレームカウンタ
  let cleared = false, clearAt = 0;

  // タブが非表示の間はループを止める（バッテリー・CPUの無駄遣いを防ぐ）
  let visible = !document.hidden;
  document.addEventListener("visibilitychange", () => {
    const resuming = document.hidden === false && !visible;
    visible = !document.hidden;
    if (resuming) requestAnimationFrame(loop);
  });

  function updateCounter() {
    const n = fishes.filter((f) => f.captured).length;
    counter.textContent = `🐟 ${n} / ${fishes.length}`;
    if (n === fishes.length) counter.classList.add("done");
  }

  function loop() {
    t++;
    pulse = Math.max(0, pulse - 0.03);
    ctx.clearRect(0, 0, W, H);

    // サークルの画面上の位置（スクロールに追従）
    const sy = scrollY;
    fishes.forEach((f) => { f.zone.y = f.zone.docY - sy; });

    // 誘導先サークルを描く
    fishes.forEach((f) => {
      const z = f.zone;
      if (z.y < -z.r - 20 || z.y > H + z.r + 20) return; // 画面外なら描かない
      ctx.setLineDash(f.captured ? [] : [6, 8]);
      ctx.lineDashOffset = f.captured ? 0 : -t * 0.15;   // 破線をゆっくり回す
      ctx.strokeStyle = f.captured ? rgba(CONFIG.colorCaptured, 0.7) : "#4a4a4a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, 6.29);
      ctx.stroke();
      ctx.lineDashOffset = 0;
      if (f.captured) {
        ctx.fillStyle = rgba(CONFIG.colorCaptured, 0.06);
        ctx.fill();
      } else if (f.dwell > 0) {
        // とどまり進捗のゲージ（円弧）
        ctx.setLineDash([]);
        ctx.strokeStyle = rgba(CONFIG.colorCaptured, 0.8);
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, -Math.PI / 2, -Math.PI / 2 + (f.dwell / CONFIG.dwellFrames) * 6.28);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);

    // 捕獲リングエフェクト
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i], age = t - e.t0;
      if (age > 50) { fx.splice(i, 1); continue; }
      ctx.strokeStyle = rgba(CONFIG.colorCaptured, 0.6 * (1 - age / 50));
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.z.x, e.z.y, e.z.r + age * 1.6, 0, 6.29);
      ctx.stroke();
    }

    // 魚の更新と描画
    fishes.forEach(step);
    fishes.forEach(drawFish);

    // クリア判定と演出（画面全体に紫の波紋）
    if (!cleared && fishes.every((f) => f.captured)) {
      cleared = true;
      clearAt = t;
      setTimeout(revealLink, 900);
    }
    if (cleared && t - clearAt < 120) {
      const age = t - clearAt;
      for (let i = 0; i < 3; i++) {
        const a = (age - i * 15) / 90;
        if (a < 0 || a > 1) continue;
        ctx.strokeStyle = rgba(CONFIG.colorCaptured, 0.5 * (1 - a));
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, a * Math.max(W, H) * 0.7, 0, 6.29);
        ctx.stroke();
      }
    }

    if (visible) requestAnimationFrame(loop);
  }
  loop();
})();
