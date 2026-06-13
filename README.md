# studio°mono — スクロール連動型サイト（静的・GitHub Pages対応）

「かっこよさ（モノトーン）」と「かわいらしさ（パステル＋角丸＋バウンド）」を両立させた
スクロール連動のシングルページサイト。**完全な静的サイト**で、サーバー処理を一切持たないため
GitHub Pages にそのまま公開でき、攻撃対象になりうる動的処理がありません。

## ディレクトリ構成

```
Web/
├── index.html          … 全セクション（TOP / Profile / News / FAQ / Contact）
├── css/style.css       … デザインテーマ（CSS変数で配色・角丸・バウンドを管理）
├── js/main.js          … GSAP演出 / News読込 / 記事エディタ / FAQ / Contact
├── vendor/             … GSAP本体（自己ホスト。外部CDN不使用）
│   ├── gsap.min.js
│   └── ScrollTrigger.min.js
├── data/data.json      … News データ（読み取り専用で表示）
├── .nojekyll           … GitHub Pages の Jekyll 処理を無効化
└── README.md
```

## セキュリティ方針（静的＝攻撃面ゼロ）

- **サーバーサイド処理なし**: PHP等を排除。書き込み口が存在しないため、投稿の悪用・改ざんが原理的に不可能。
- **外部リクエストなし**: GSAP は `vendor/` に自己ホスト、フォントはシステムフォント。
  第三者サーバーへの接続が一切なく、トラッキングや供給元改ざんのリスクを排除。
- **Content-Security-Policy**: `default-src 'none'` を基本に、スクリプト/接続を同一オリジンに限定。
  インラインスクリプト禁止、`frame-ancestors 'none'`（クリックジャッキング防止）、`form-action 'none'`。
- **出力エスケープ**: News描画は `escapeHTML` を通すため、JSON由来のXSSを防止。
- GitHub Pages は HTTPS 配信。`referrer: no-referrer` で参照元も漏らさない。

## News の更新方法（静的なので“ビルド時更新”）

公開サイトには書き込みません。記事は `data/data.json` を編集して push します。

サイト内の **News →「＋ 記事を追加する」** で記事を書くと、
- その場でプレビューに反映され、
- 更新後の `data.json` を生成して**ダウンロード**できます。

ダウンロードした `data.json` を `data/data.json` に置き換えてコミット＆プッシュすれば、
GitHub Pages 上の News に反映されます（ブラウザ操作だけで本文は外部に送信されません）。

## ローカルで確認する

`fetch` で data.json を読むため、`file://` 直開きではなく簡易サーバー経由で開きます。

```powershell
cd "C:\Users\n_kibe\Desktop\Web"
python -m http.server 8000
```

→ http://localhost:8000 を開く。

## GitHub Pages へ公開する

1. このフォルダを GitHub リポジトリにpush（`Web/` の中身をリポジトリ直下に置くのが簡単）。
2. リポジトリの **Settings → Pages** で、Source を `main` ブランチ（`/root`）に設定。
3. 数分後に `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

> サブディレクトリ配信でもすべて相対パス（`css/…` `js/…` `vendor/…` `data/…`）なので、
> パスの書き換えは不要です。
