# my-profile-site

瀬口雄大の自己紹介サイト。ビルド不要の静的サイト（HTML/CSS/バニラJS）。

公開URL: https://yd1sgc.github.io/my-profile-site/

## 構成

```
index.html       ページ本体
css/style.css    見た目
js/site.js       スクロールフェードイン・ナビのハイライト
js/fish-game.js  背景を泳ぐ魚の誘導ゲーム（隠しページの鍵）
```

## ローカルで確認する

ビルド手順は無し。任意の静的サーバーで配信するだけ。

```
python -m http.server 8720
```

その後 http://localhost:8720/ を開く。

## 公開の仕組み

`main` ブランチに push すると GitHub Pages が自動でビルド・反映する（数分かかる）。追加の設定やCIは無い。
