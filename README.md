# PULSE STORE

React 18 + Vite 6 + Tailwind 3 + TypeScriptの独立したECデモ。npmパッケージ `@mnoritake-figma/ds` のコンポーネントとCSSを利用しています。

## フロントだけ起動（APIモック）

Node.js 20.19以降（推奨22）、npmが必要です。

```sh
npm ci
npm run dev
```

表示されたローカルURL（通常 http://127.0.0.1:5173 ）を開きます。追加のAPIキー・Figmaトークン・DBは不要。初期状態はAPIモックです。Service Workerが必要なのでlocalhostまたはHTTPSで起動してください。index.htmlを直接開く方法には対応していません。

## 機能

- 8商品の一覧・検索、カテゴリー／価格／在庫フィルター、並び替え
- 商品詳細、在庫切れ・商品不明・空状態・通信失敗
- カート追加／数量変更／削除、税込価格・送料・合計、再読み込み後の保持
- PC／スマートフォン対応

比較・お気に入り・お問い合わせは、次のデモで追加するため**未実装**です。決済・注文作成はありません。Docker版ではゲストセッションと会員ログインに対応します。

## フォルダー

```text
src/
  features/catalog/   商品一覧・商品カード・詳細
  features/cart/      カート状態・画面
  api/client.ts       HTTP境界（画面はseedを参照しない）
  domain/models.ts    共通DTO
  mocks/              ダミーデータ・API処理・モックルーター
public/products/      ローカル保存したデモ写真
public/mockServiceWorker.js
```

## 検証

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

[品質検証](docs/QA.md) / [DS調査と再利用の制約](docs/DESIGN-SYSTEM.md) / [API・Payload移行](docs/API.md) / [デモ手順と追加機能の境界](docs/DEMO-GUIDE.md)

## Dockerでローカル起動（フロント・バックエンド・DB）

### 事前準備

- Docker Desktopをインストールして起動します（Docker Composeを使用）。
- GitとNode.jsを用意します。Node.jsは認証情報の初期化に使用し、24.22.1以降を推奨します。
- GitHubの非公開リポジトリ `mnoritake-twigma/demo-shopping` を取得できるアカウントで認証します。
- ポート8080・8081・3001・3002が空いていることを確認します。

フロント・API・PostgreSQLはコンテナ内で動きます。ホストへのPostgreSQLのインストールや、起動前の `npm ci` は不要です。

### 初回起動

Docker構成は `codex/dual-backend` ブランチにあります。新しく取得する場合:

```sh
git clone --branch codex/dual-backend https://github.com/mnoritake-twigma/demo-shopping.git
cd demo-shopping
```

すでにこのブランチのフォルダーを開いている場合は取得を省略し、`compose.yaml` があるリポジトリ直下で実行します。

```sh
# ローカル専用の認証情報を生成（既存ファイルは上書きしない）
node scripts/init-docker.mjs

# 既存側とPayload検証側をまとめてビルド・起動
docker compose --env-file .env.docker --profile payload up -d --build --wait --wait-timeout 180
```

初回はイメージ・依存パッケージの取得に数分かかります。DBのマイグレーションと架空の商品・会員データの投入は自動で実行されます。通常の再起動では既存データを上書きしません。

| 用途 | URL |
| --- | --- |
| 既存サイト：React＋NestJS＋Prisma＋PostgreSQL | [http://localhost:8080](http://localhost:8080) |
| 検証サイト：同じReact＋Payload＋独立PostgreSQL | [http://localhost:8081](http://localhost:8081) |
| Payload管理画面 | [http://localhost:3002/admin](http://localhost:3002/admin) |

### ログイン情報

生成された `.env.docker` をローカルのエディタで確認します。このファイルはGit管理対象外です。

- ショップ会員：`alice@example.test` または `bob@example.test`。パスワードは `DEMO_PASSWORD` の値。
- Payload管理者：`PAYLOAD_ADMIN_EMAIL` と `PAYLOAD_ADMIN_PASSWORD` の値。
- ゲストでも商品閲覧・カート操作ができます。会員ごとのカート、既存側とPayload側のDBはそれぞれ独立しています。

### 停止・再起動・更新

```sh
# 停止（DBの保存内容は残す）
docker compose --env-file .env.docker --profile payload down

# 次回の起動
docker compose --env-file .env.docker --profile payload up -d --wait --wait-timeout 180

# コードを更新した後は再ビルドして起動
docker compose --env-file .env.docker --profile payload up -d --build --wait --wait-timeout 180
```

`down -v` はDBの保存内容も削除するため、通常の停止には使用しません。

### 片方の環境だけ起動

```sh
# 既存側だけ（localhost:8080）
docker compose --env-file .env.docker up -d --build --wait --wait-timeout 180

# Payload検証側だけ（localhost:8081、管理画面localhost:3002）
docker compose --env-file .env.docker --profile payload up -d --build --wait --wait-timeout 180 payload-web
```

すでに両方が起動中の場合、上記コマンドはもう片方を停止しません。片方だけに切り替える場合は先に両環境を `down` してください。

### 起動できないとき

```sh
# コンテナの状態を確認
docker compose --env-file .env.docker --profile payload ps

# APIの直近のログを確認
docker compose --env-file .env.docker --profile payload logs --tail 80 native-api payload-api
```

Dockerに接続できない場合はDocker Desktopの起動を確認します。環境変数不足の場合は `node scripts/init-docker.mjs` を実行し、`.env.docker` があることを確認してください。ポート使用中の場合は競合するアプリを停止します。

データのリセット、テスト、Figma／Make接続の範囲は [BACKENDS.md](docs/BACKENDS.md) を参照してください。新しいリポジトリは不要です。公開済みSitesデモはAPIモック版で、このローカルDBには接続しません。

## GitHubへの配置

GitHubリポジトリ: **[mnoritake-twigma/demo-shopping](https://github.com/mnoritake-twigma/demo-shopping)**。DSのリポジトリは変更していません。

このフォルダーはローカルGitとして用意されています。Sitesのプレビュー配布用remoteとGitHubを区別するため、GitHubは`github`というremote名にします。既存チェックアウトには `github` remoteを設定済みです。別のチェックアウトから接続する場合:

```sh
git remote add github https://github.com/mnoritake-twigma/demo-shopping.git
git push -u github main
git push -u github codex/ec-baseline
```

初期ベースのブランチ: `codex/ec-baseline`。後続機能はこのベースから別ブランチで作業できます。ローカルフォルダーを新しいPCへコピーした場合、`.git`を含めない配布ZIPにはGit履歴がないので `git init -b main` → `git add .` → `git commit -m "Add EC baseline"` → `git branch codex/ec-baseline` を先に実行してください。

Sitesの公開設定は`.openai/hosting.json`に入っています。別のSiteとして展開する場合、元のSiteへ上書きしないよう、新規Site登録時にIDを発行してください。

## 素材・ライセンス

DS: `@mnoritake-figma/ds@0.1.0`。元ソース: [mnoritake-ds](https://github.com/mnoritake-twigma/mnoritake-ds)、固定コミット `957761d94b42e9b2b8887e357b12d6e23518efba`、元MITライセンス保持。写真出典は[ASSETS.md](docs/ASSETS.md)。商品情報はデモ用の架空データです。
