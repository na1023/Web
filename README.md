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

## News の保存と公開（2段構え）

**① ブラウザに永久保存（個人用・消えない）**
News →「＋ 記事を追加する」で投稿すると、`localStorage` に保存されます。
**再読み込みしても消えません。** サーバーには一切送信されないため安全です。
※ localStorage はそのブラウザ内に保存される仕組みのため、他の人や別端末には表示されません。

**② 全員に公開する（任意）**
公開したいときは「data.json をダウンロード」を押し、書き出された `data.json` を
`data/data.json` に置き換えてコミット＆プッシュします。これで GitHub Pages 上の
全訪問者に表示されます（`data.json` 由来の記事は誰の画面にも出ます）。

> 表示は「`data.json`（公開分）＋ localStorage（自分の追加分）」を id で重複排除して
> 新しい順にマージしています。①で追加した記事を②で `data.json` に載せれば、重複せず公開へ移行できます。

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
