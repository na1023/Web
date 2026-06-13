# studio°mono — スクロール連動型サイト（静的・GitHub Pages対応）

「かっこよさ（モノトーン）」と「かわいらしさ（パステル＋角丸＋バウンド）」を両立させた
スクロール連動のシングルページサイト。**完全な静的サイト**で、サーバー処理を持たないため
GitHub Pages にそのまま公開できます。Profile / News / FAQ は管理モードで編集できます。

## ディレクトリ構成

```
Web/
├── index.html          … 全セクション（TOP / Profile / News / FAQ / Contact）
├── css/style.css       … デザインテーマ（CSS変数で配色・角丸・バウンドを管理）
├── js/main.js          … 管理モード / 各セクション編集 / GSAP演出 / Contact
├── vendor/
│   ├── gsap.min.js / ScrollTrigger.min.js   … GSAP（自己ホスト）
│   └── fonts/          … Outfit（英字）/ Zen Maru Gothic（日本語）woff2
├── data/data.json      … profile / news / faq のデータ
├── .nojekyll
└── README.md
```

## 管理モード（投稿・編集・削除）

画面右端のサイドバーの **「ADMIN」** を押し、パスワードを入力すると管理モードになります。

- **既定パスワード: `edamame1023`** （※必ず変更してください。下記参照）
- ログイン中だけ、Profile編集フォーム・News/FAQの追加フォーム・各項目の「編集/削除」ボタン・
  画面下の管理バーが表示されます。通常の訪問者には一切見えません。
- 編集内容は **このブラウザに永久保存（localStorage）** され、再読み込みしても残ります。

### ⚠️ セキュリティの正直な注意（重要）
静的サイトには「本物のログイン認証」は作れません（サーバーが無く、JS は誰でも閲覧できるため）。
このパスワードは**“編集UIを一般訪問者から隠す”ためのもの**です。
**本当の防御は「公開サイトを書き換えられるのは `data.json` を git push できる人＝あなただけ」**という点にあります。
誰かが手元のブラウザで投稿・編集しても、それはその人の画面（localStorage）に留まり、公開サイトや他人には反映されません。

### パスワードの変更方法
1. ローカルで起動し、ADMIN から**新しいパスワード**を入力してログインを試す。
2. ブラウザの開発者ツール → Console に `このパスワードのSHA-256: xxxx` が出力される。
3. その値を `js/main.js` の `CONFIG.adminHash` に貼り替えて push。

## 公開して全員に反映する

管理モードで編集 → 画面下の **「data.json を書き出して公開」** で `data.json` をダウンロード →
`data/data.json` を差し替えてコミット＆プッシュ。これで全訪問者に反映されます。
（「編集を破棄」で localStorage を消し、公開中の `data.json` を読み直せます。）

## Contact

メールアドレス欄はありません。送信すると **`n.04.10.23.00@gmail.com` 宛**に、
お使いのメールアプリが「宛先・件名・本文入り」で起動します。そのまま送信すれば届きます。
（外部サービス／APIを使わずメールを送る、静的サイトで唯一安全な方法です。）

## セキュリティ方針

- サーバー処理なし（書き込み口が存在しない）
- 外部リクエストなし（GSAP・フォントを自己ホスト）→ トラッキング/供給元改ざんのリスクを排除
- 厳格な CSP（`default-src 'none'`、スクリプト/接続は同一オリジン限定、`frame-ancestors 'none'`）
- 出力は `escapeHTML` を通すため XSS を防止
- HTTPS 配信（GitHub Pages）＋ `referrer: no-referrer`

## ローカルで確認する

`fetch` と Web Crypto（ログイン）を使うため、`file://` 直開きではなく
`http://localhost` 経由で開きます。

```powershell
cd "C:\Users\n_kibe\Desktop\Web"
python -m http.server 8000
```
→ http://localhost:8000

## GitHub Pages へ公開する

1. `Web/` の中身をリポジトリ直下に push
2. Settings → Pages で Source を `main` ブランチ（`/root`）に設定
3. `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開

> すべて相対パスのため、サブディレクトリ配信でもパス書き換えは不要です。
