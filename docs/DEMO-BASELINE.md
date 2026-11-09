# demo-baseline-v1 — 改修前の状態

確認日: 2026-11-09。お気に入り・クーポン・お問い合わせの追加前を固定する。新機能・大規模リファクタリングは含まない。Gitタグはソースと手順を保存し、DBの内容や資格情報は保存しない。

## 画面と既存機能

| 画面 / URL | 既存機能 | モック / 実API |
| --- | --- | --- |
| トップ・一覧 `/#/` | ヒーロー、8商品、検索、カテゴリー・価格・在庫フィルター、並び替え、条件クリア、0件・読込・失敗表示 | 両方 |
| 商品詳細 `/#/products/prd-003` | 写真・価格・素材・サイズ・色・在庫、数量選択、カート追加、配送・手入れアコーディオン、不明商品・在庫切れ | 両方 |
| カート `/#/cart` | 数量増減・削除、税込小計・送料・合計、空状態、再読み込み後の保存 | モック: localStorage / 実API: DB |
| アカウント `/#/account` | ゲスト、Alice/Bobログイン・ログアウト、ユーザーごとのカート分離 | 実APIのみ。モックでは非表示・この経路は404 |
| 不明な画面 | 一覧へ戻る導線 | 両方 |
| `/api-docs/` | OpenAPI 3.0.3、Shop API全11操作、GET試行 | Docker版のみ |
| Payload `:3002/admin` | 管理者ログイン、商品等の編集 | Payloadのみ |

共通: ヘッダー・カート件数・サービス案内・フッター、PC/モバイル対応。送料は空カートまたは小計10,000円以上で0円、それ以外550円。カートは在庫を予約しない。ゲストカートと会員カートは統合しない。

未実装: お気に入り・クーポン・お問い合わせ（今後のデモ候補）、比較・決済・注文・会員登録・パスワード再設定。これらを実装済みとして説明しない。

## 技術スタック（lockファイル基準）

| 層 | 構成 |
| --- | --- |
| フロント | React 18.3.1、Vite 6.4.5、TypeScript 5.9.3、Tailwind 3.4.19、ハッシュルーティング |
| UI | 公開npm `@mnoritake-figma/ds@0.1.0`、DS CSSとsemantic token |
| モック | MSW Service Worker、架空seed、localStorage |
| 既存API | NestJS 11.2.8、Prisma 7.10.1、PostgreSQL 17 |
| 検証API/管理 | Payload 3.93.0、Next 16.4.5、React 19.3.1、独立PostgreSQL 17 |
| 共通API | `backend/shared/shop.mjs`（認証・価格・在庫・送料）、`openapi.mjs`（仕様） |
| 配信 | Docker Compose、Nginx、Node 24コンテナ |
| 検証 | Vitest、Playwright/Chromium、axe、Node test runner |

PayloadのReact 19は独立した管理画面用。ショップのReact 18と同じ依存ツリーには混ぜない。

## 起動方法と環境変数

### 通常の実システムデモ

READMEのDockerコマンドでフロント・API・DBをまとめて起動する。ホストのnpm操作は不要。Nest側は8080、Payload側は8081、管理画面は3002。既存の `.env.docker` を使う。初回はmigration→seed→API、再起動は既存データを保持する。

### Code Layers向けフロント単体

リポジトリルートでNode 24.22.1以上（今回の確認環境）とnpmを使用:

```sh
npm ci
npm run dev:figma
```

`PORT` があればそのポート、未指定なら5173で起動する。0.0.0.0で待ち受け、モックモードと `/api` を明示する。バックエンド・DB・認証情報は不要。通常の `npm run dev` は127.0.0.1:5173用で、Figmaの指定ポートには追従しないため使い分ける。

### 環境変数一覧（値は機密ファイルを参照）

| 変数 | 対象・用途 | 必要性 / 既定 |
| --- | --- | --- |
| `VITE_API_MODE` | フロントの接続方式 | 未指定でmock。Dockerビルドはremote、dev:figmaはmock固定 |
| `VITE_API_BASE_URL` | フロントのAPIベース | `/api`。モックhandlersも `/api` 前提 |
| `PORT` | Figma用Viteの待受ポート / Nestのポート | dev:figmaは5173、Nestは3001。Payloadはnpmスクリプトで3002 |
| `NATIVE_DB_PASSWORD` | Composeから既存DB・APIへ渡す | Docker必須 |
| `PAYLOAD_DB_PASSWORD` | Composeから検証DB・APIへ渡す | Payload起動時必須 |
| `DEMO_PASSWORD` | 初期会員2名のパスワード | seed必須、12文字以上 |
| `PAYLOAD_SECRET` | Payloadの認証用secret | Payload必須 |
| `PAYLOAD_ADMIN_EMAIL`, `PAYLOAD_ADMIN_PASSWORD` | 初期管理者 | Payload seed必須、パスワード12文字以上 |
| `DATABASE_URL` | 各バックエンドのDB接続文字列 | API必須。Composeが上記DBパスワードから構成 |
| `ALLOWED_ORIGINS` | APIの許可Origin、カンマ区切り | Composeに各localhost Originを定義。外部接続では別途設定 |
| `SECURE_COOKIES` | HTTPSでSecure Cookieを使用 | 未指定false。外部HTTPS運用ではtrueが必要 |
| `SEED_DIR` | seed JSONの場所 | Dockerは `/app/docs`、ホストはAPIディレクトリから `../../docs` |

`VITE_*` はブラウザへ公開される。DB・会員・管理者の秘密値を入れない。フロント環境変数はビルド時に固定されるため、Docker起動後に値を変えるだけでは接続先は変わらない。ホストでAPIを直接起動する場合はNode 24.22.1以上と別途PostgreSQLが必要で、今回はDocker運用を標準とする。

## DSコンポーネントの利用箇所

| ファイル | 利用部品 |
| --- | --- |
| `src/main.tsx` | DS `styles.css` をアプリCSSより先に読み込み |
| `src/App.tsx` | Button、カート・アカウント・配送等のアイコン |
| `src/features/catalog/Catalog.tsx` | Button、InputField、CheckboxField、SelectField/SelectItem、矢印・フィルターアイコン |
| `src/features/catalog/ProductCard.tsx` | Tag、矢印アイコン |
| `src/features/catalog/ProductDetail.tsx` | Button、Tag、SelectField/SelectItem、Accordion/AccordionItem、配送等のアイコン |
| `src/features/cart/CartPage.tsx` | Button、数量増減・削除・カート等のアイコン |
| `src/features/account/AccountPage.tsx` | Button、InputField |

DS未使用/未対応部分: ヘッダー・ヒーロー・商品カード・カート行・合計欄・フッターはサイト固有のHTML/CSSによる構成。通常リンクはHTMLのa要素、状態メッセージやレイアウトも独自。DSのcompositionsや商品providerには依存していない。Payload管理画面とSwagger UIは各製品の標準UIでDSを適用していない。EC用Code Connectマッピングの追加・公開、Figmaライブラリとの自動同期は未実施。これは部品の流用範囲の報告であり、今回置換はしない。[詳しい利用制約](DESIGN-SYSTEM.md)。

## 検証結果

2026-11-09に本チェックアウトで再実行。

| 検証 | 結果 |
| --- | --- |
| `npm ci` | 成功、ルート依存監査0件 |
| `npm run build` / `npx tsc --noEmit` | 成功 |
| 両APIのDocker build / コンテナ内 `npx tsc --noEmit`（Payloadは `--tsBuildInfoFile /tmp/pulse-baseline.tsbuildinfo` 併用） | 成功（Dockerビルドの再利用可能な層はキャッシュ使用） |
| `npm run lint` | 実行不可: script・ESLint設定が存在しない。Lint合格ではない |
| `npm test` | 15件成功 |
| `node --test backend/tests/openapi.test.mjs` | 2件成功 |
| `npm run test:e2e` | 10件成功、PC/モバイル・axe含む |
| 実API契約・認証・DB/API再起動 | 11件成功（親3＋子8） |
| 実APIブラウザ | 6件成功、Nestに存在しないPayload管理画面の2枠はskip |
| `PORT=5188 npm run dev:figma` | 起動・商品8件・詳細・カート追加/再読み込み保存成功 |
| 公開npmのDS取得 | 認証なしで0.1.0取得成功 |
| Figma Code Layers内の実行 | 未実施。ローカル検証と公式要件からの適合性確認まで |

Payloadの型チェックは最初にtsbuildinfoの書込権限で失敗したため、キャッシュ保存先を `/tmp` に変更して再実行した。アプリコードの変更は不要。

本番用Lintルールの追加、実機Safari、外部HTTPS、Figma iframe内のService Worker互換性は未検証。今回のベースラインに新しいLintルールやUI修正は含めない。

実APIテストは `pulse-baseline-check` という一時Composeプロジェクト・独立DB・別ポートで実行し、既存 `pulse-shopping` のDBを変更しない。テストは会員カートを消去するため、デモ中の環境を対象にしない。

再実行例（既存イメージを先にビルド）:

```sh
docker compose --env-file .env.docker --profile payload build
export COMPOSE_PROJECT_NAME=pulse-baseline-check
export COMPOSE_FILE="$PWD/compose.yaml:$PWD/docker/compose.test.yaml"
docker compose --env-file .env.docker --profile payload up -d --no-build --wait --wait-timeout 180
NATIVE_TEST_URL=http://localhost:18080/api PAYLOAD_TEST_URL=http://localhost:18081/api PAYLOAD_ADMIN_TEST_URL=http://localhost:13002/api RESTART_TEST=1 node --env-file=.env.docker --test backend/tests/contract.test.mjs
NATIVE_BROWSER_URL=http://localhost:18080 PAYLOAD_BROWSER_URL=http://localhost:18081 PAYLOAD_ADMIN_BROWSER_URL=http://localhost:13002 node --env-file=.env.docker node_modules/@playwright/test/cli.js test -c playwright.backend.config.ts
# テスト用コンテナのみ停止。DBボリュームは保持する。
docker compose --env-file .env.docker --profile payload down
unset COMPOSE_PROJECT_NAME COMPOSE_FILE
```

## Figma Code Layersへの取り込み

判断: **フロント単体のモック版は取り込み候補として準備済み。実システム全体をそのまま取り込んで起動できると確認したものではない。** アカウントのCode Layers有効化はMCPで確認済み。実際の取り込み先ファイル・GitHub Appのリポジトリ許可はまだ確認していない。

1. Figma組織のGitHub連携で、非公開 `mnoritake-twigma/demo-shopping` のcloneを許可し、自分のGitHubアカウントも認証する。
2. DesignでCode（B）→ Clone repository → このリポジトリを選択。固定した準備ブランチ `codex/demo-baseline-v1` を選ぶ。正本はGitタグ `demo-baseline-v1`。以後の変更は別ブランチで行う。
3. セットアップ対象はルートの `package.json` と `index.html`。`backend/payload` をアプリの入口にしない。依存導入は `npm ci`、起動は `npm run dev:figma`、ビルドは `npm run build`、出力は `dist`。Node 24.22.1以上を指定する。
4. Figmaが生成する `.figma/make/dev` に上記起動コマンドを使用するよう伝える。`PORT` はFigmaから受け取る。`.env.docker` をアップロードしない。
5. Playで一覧8件→検索→商品詳細→カート追加/数量変更→再読み込み保存を確認する。モックでは会員ログインやPayload管理画面は表示しない。

FigmaのGitHub clone要件・操作・生成設定ファイルは[公式Git連携ガイド](https://help.figma.com/hc/en-us/articles/44220165255063-Use-Git-with-Figma-Make-and-code-layers)を参照。初回セットアップで構成ファイルが追加される場合がある。実際に生成された内容を確認してからGitHubへ戻す。

### 技術的制約

- ルートにはWebアプリの入口・buildがあり、追跡ファイルは約6.1MB。公開npmのDSを使用し、プライベートnpm認証は不要。インストール時にはnpmレジストリへの通信が必要。
- モックはHTTPSまたはlocalhostのService WorkerとlocalStorageに依存する。Figmaの埋め込みプレビューで登録やストレージが制限されると起動/保存に失敗し得る。`/mockServiceWorker.js` が同一originのルートから200で返ることを確認する。現在フォールバックはない。
- `/products/*` 画像、MSW、`/api` はルート絶対パス。サブパス配信や別originへの分離はそのままでは対応しない。商品画像・フォント表示のための外部CDNは不要。
- NestJS/Payload/PostgreSQL/Dockerはモック起動に不要。実APIモードはローカルNginxの `/api` proxyが前提で、Figma上には自動的に用意されない。
- Figmaから実APIにつなぐ場合は到達可能なHTTPS APIまたは同一origin proxyを別途用意する。localhostは開発者PCのAPI接続先として共有できない。許可Origin、HTTPS、CookieのSameSite/第三者Cookie制限を検討する。現状SameSite=Laxのため、別サイト間の会員認証はURL変更だけでは成立しない。
- `/api-docs/` はDockerでSwagger資産をコピーしてAPIへ接続する構成。通常のViteモック起動・Figmaプレビューでは対象外。
- Code Layersに移すとFigmaファイルの共有範囲によってソースが閲覧可能になるため、非公開GitHubのアクセス権と同じとみなさない。資格情報はGitにもFigmaにも含めない。

[Code Layers公式概要](https://help.figma.com/hc/en-us/articles/44193259600535-Code-layers-in-Figma-Design)。本調査ではFigmaへの実インポート・新規ファイル作成・外部API配備は行っていない。
