# my-profile-site

瀬口雄大の自己紹介サイト。ビルド不要の静的サイト（HTML/CSS/バニラJS）。

公開URL: https://yd1sgc.github.io/my-profile-site/

## 構成

```
index.html         ページ本体
css/style.css       見た目
js/site.js          スクロールフェードイン・ナビのハイライト・オープニング演出
js/fish-game.js      背景を泳ぐ魚の誘導ゲーム（隠しページの鍵）
js/comments.js       隠しページのコメント欄（Firebase Firestore）
firestore.rules      Firestoreのセキュリティルール（Firebaseコンソールに手動で貼る）
```

## ローカルで確認する

ビルド手順は無し。任意の静的サーバーで配信するだけ。

```
python -m http.server 8720
```

その後 http://localhost:8720/ を開く。

## 公開の仕組み

`main` ブランチに push すると GitHub Pages が自動でビルド・反映する（数分かかる）。追加の設定やCIは無い。

## コメント機能のセットアップ

隠しページのコメント欄は [Firebase](https://firebase.google.com/)（Googleの無料バックエンド）を使う。以下は最初の1回だけ必要な作業。

1. [Firebaseコンソール](https://console.firebase.google.com/) にGoogleアカウントでログインし、「プロジェクトを作成」（無料プランで十分）
2. 左メニュー「Firestore Database」→「データベースの作成」→ ロケーションは `asia-northeast1`（東京）などお好みで
3. 作成直後は「テストモード」で始まるが、後述の手順4でルールを上書きするので気にしなくてよい
4. Firestore画面の「ルール」タブを開き、リポジトリの [firestore.rules](firestore.rules) の中身を丸ごと貼り付けて「公開」
5. プロジェクト設定（歯車アイコン）→「マイアプリ」→ ウェブアプリを追加（`</>` アイコン）→ アプリ名は何でもよい
6. 表示された `firebaseConfig` の値（apiKey, authDomain, projectId など）を [js/comments.js](js/comments.js) 冒頭の `firebaseConfig` にそのまま貼り付ける

これで完了。`apiKey` などは公開しても問題ない値（クライアント側で使う識別子で、実際のアクセス制御はFirestoreのルール側で行っている）。

荒らしコメントを消したいときは、Firebaseコンソールの Firestore Database → `comments` コレクションから該当ドキュメントを手動で削除する。

### 非公開メッセージについて

コメントフォームの「非公開で送る」にチェックを入れて投稿されたものは、サイト上には一切表示されない。Firebaseコンソールの Firestore Database → `private-messages` コレクションでのみ確認できる（自分だけが見られる）。
