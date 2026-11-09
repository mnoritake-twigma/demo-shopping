# PULSE STORE

商品検索・詳細・カート・ゲスト／会員ログインを備えたECデモです。**フロント・バックエンド・DBをすべてDockerで動かします。** ホスト側での `npm ci` や `npm run dev` は不要です。

## ローカルで使う

Docker Desktopを起動し、このプロジェクトのディレクトリで操作します。

```sh
cd /Users/mnoritake/Documents/ChatGPT/demo-shopping
```

この作業環境はセットアップ済みです。既存の認証情報 `.env.docker` を引き継いでいるため、認証情報の生成やリポジトリの再取得は不要です。

### 1. 起動する

```sh
docker compose --env-file .env.docker --profile payload up -d --wait --wait-timeout 180
```

既存側とPayload検証側の計6サービスをまとめて起動します。すでに起動している場合は、そのまま次のURLを開けます。

### 2. ブラウザで開く

| 用途 | URL |
| --- | --- |
| 既存サイト：React＋NestJS＋Prisma＋PostgreSQL | [http://localhost:8080](http://localhost:8080) |
| 検証サイト：同じReact＋Payload＋独立PostgreSQL | [http://localhost:8081](http://localhost:8081) |
| Payload管理画面 | [http://localhost:3002/admin](http://localhost:3002/admin) |

ゲストでも商品閲覧・カート操作ができます。会員ごとのカートと、既存側・検証側のDBはそれぞれ独立しています。

ログイン情報は `.env.docker` をローカルのエディタで確認してください。

- ショップ会員：`alice@example.test` または `bob@example.test`。パスワードは `DEMO_PASSWORD`。
- Payload管理者：`PAYLOAD_ADMIN_EMAIL` と `PAYLOAD_ADMIN_PASSWORD`。

`.env.docker` はGit管理対象外です。内容を公開・コミットしないでください。既存DBと対応するため、作り直さずに使います。

### 3. 使い終わったら停止する

```sh
docker compose --env-file .env.docker --profile payload down
```

DBの保存内容は残ります。次回は「1. 起動する」のコマンドで再開します。**`down -v` はDBの保存内容を削除するため使用しないでください。**

## 初回起動で入るテストデータ

Docker起動時に **DBマイグレーション → seed → API起動** を自動実行します。手動でseedコマンドを実行する必要はありません。

| データ | 既存側 | Payload検証側 |
| --- | --- | --- |
| 架空の商品 | 8件 | 同じ8件 |
| カテゴリー | 3件 | 同じ3件 |
| ショップ会員 | Alice・Bobの2名 | 同じ2名 |
| Payload管理者 | なし | `.env.docker` の管理者1名 |
| カート・セッション | 初期データなし。利用時に作成 | 初期データなし。利用時に作成 |

商品とカテゴリーの元データは `docs/seed-products.json` と `docs/seed-categories.json`、会員の定義は `backend/shared/seed.mjs` です。ログイン情報は上の「ブラウザで開く」を参照してください。

seedは起動のたびに不足している初期レコードだけを追加します。既存の商品編集・在庫・会員パスワード・カートは上書きしません。初期商品を削除した場合は、次回起動で再作成されます。両環境は独立したDBへ投入するため、その後の編集は相互に反映されません。

## APIドキュメントを見る

Docker起動後、Swagger UIでエンドポイント・入力・応答・認証条件を確認できます。

| 環境 | ドキュメント | OpenAPI JSON |
| --- | --- | --- |
| 既存側 | [Swagger UI](http://localhost:8080/api-docs/) | [openapi.json](http://localhost:8080/api/openapi.json) |
| Payload検証側 | [Swagger UI](http://localhost:8081/api-docs/) | [openapi.json](http://localhost:8081/api/openapi.json) |

「Try it out」はGETのみ実行できます。認証が必要なGETは、同じ環境のショップ画面でログインしてから試してください。POST・PUT・DELETEは仕様の閲覧のみです。Payload標準の管理APIは対象外です。

## コードの変更を反映する

フロント・バックエンドを編集した後は、再ビルドして起動します。

```sh
docker compose --env-file .env.docker --profile payload up -d --build --wait --wait-timeout 180
```

コンテナ内で依存パッケージのインストールとビルドが実行されます。DBの保存内容は維持されます。現在の構成では、ソースを保存するだけで画面へ自動反映はされません。

Composeプロジェクト名は `pulse-shopping` です。このディレクトリから既存のコンテナとDBボリュームを管理します。旧作業フォルダーから別途起動したり、プロジェクト名を変えて重複起動したりする必要はありません。

## 起動できないとき

まずDocker Desktopが起動していることを確認します。

```sh
# コンテナの状態
docker compose --env-file .env.docker --profile payload ps

# APIの直近のログ
docker compose --env-file .env.docker --profile payload logs --tail 80 native-api payload-api
```

- `.env.docker` がない場合：既存DBを使う環境では、元のファイルを復元してください。
- ポートが使用中の場合：8080・8081・3001・3002を使っている別のアプリを確認してください。

## 別のPCに新規セットアップする場合のみ

普段の起動ではこの手順は不要です。Docker DesktopとGitを用意し、非公開リポジトリへアクセスできるアカウントで取得します。

```sh
git clone --branch codex/dual-backend https://github.com/mnoritake-twigma/demo-shopping.git
cd demo-shopping
```

既存DBを引き継ぐ場合は、そのDBで使用していた `.env.docker` も安全に引き継いでください。**DBも認証情報も新しく作る場合だけ**、次のコマンドで初期化します。Node.jsはDocker内で実行するため、ホストへのインストールは不要です。

```sh
docker run --rm --mount "type=bind,source=$PWD,target=/app" -w /app node:24-alpine node scripts/init-docker.mjs
```

続けてビルド・起動します。

```sh
docker compose --env-file .env.docker --profile payload up -d --build --wait --wait-timeout 180
```

初回はイメージや依存パッケージの取得に数分かかります。DBのマイグレーションと架空の商品・会員データの投入は自動です。通常の起動では既存データを上書きしません。

## 実装範囲と開発資料

- 8商品の一覧・検索、カテゴリー／価格／在庫フィルター、並び替え
- 商品詳細、カート追加／数量変更／削除、税込価格・送料・合計、DB保存
- ゲストセッション・会員ログイン、PC／スマートフォン対応

比較・お気に入り・お問い合わせ・決済・注文は未実装です。公開済みSitesデモはAPIモック版で、このDocker環境には接続していません。

フロントはReact 18＋Vite 6＋Tailwind 3＋TypeScript、UI部品は `@mnoritake-figma/ds@0.1.0` を使用しています。

| 場所 | 内容 |
| --- | --- |
| `src/` | Reactフロント、APIクライアント |
| `backend/nest/` | 既存側のNestJS＋Prisma |
| `backend/payload/` | 検証側のPayload |
| `backend/shared/` | 共通のAPI・認証・価格・在庫・送料ルール |
| `compose.yaml`, `docker/` | Dockerの起動・ビルド設定 |

[バックエンド構成・開発者向けテスト手順](docs/BACKENDS.md) / [API契約](docs/API.md) / [品質検証記録](docs/QA.md) / [デモ手順](docs/DEMO-GUIDE.md) / [DS利用ルール](docs/DESIGN-SYSTEM.md)

リンク先のnpmコマンドは開発者向けのテスト用です。通常の起動に実行する必要はありません。

## 素材・ライセンス

DS: `@mnoritake-figma/ds@0.1.0`。元ソース: [mnoritake-ds](https://github.com/mnoritake-twigma/mnoritake-ds)、固定コミット `957761d94b42e9b2b8887e357b12d6e23518efba`、元MITライセンス保持。写真出典は[ASSETS.md](docs/ASSETS.md)。商品情報はデモ用の架空データです。
