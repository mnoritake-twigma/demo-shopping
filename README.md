# PULSE STORE

React 18 + Vite 6 + Tailwind 3 + TypeScriptの独立したECデモ。npmパッケージ `@mnoritake-figma/ds` のコンポーネントとCSSを利用しています。

## 起動

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

比較・お気に入り・お問い合わせは、次のデモで追加するため**未実装**です。決済・注文作成・認証もありません。

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

## Payloadへ切り替える

`.env.example`を参考に`.env.local`を作り、`VITE_API_MODE=remote` と `VITE_API_BASE_URL` を設定して再起動／再ビルドします。Payload標準RESTとはクエリとカートの契約が異なるため、[API.md](docs/API.md)に従ってcustom endpointまたはアダプターを実装してください。実環境への接続は本タスクの検証対象外です。

## GitHubへの配置

推奨リポジトリ: **mnoritake-twigma/pulse-store-demo**（未作成）。DSのリポジトリは変更していません。

このフォルダーはローカルGitとして用意されています。Sitesのプレビュー配布用remoteとGitHubを区別するため、GitHubは`github`というremote名にします。GitHubでREADMEなしの空リポジトリを作成後:

```sh
git remote add github https://github.com/mnoritake-twigma/pulse-store-demo.git
git push -u github main
git push -u github codex/ec-baseline
```

初期ベースのブランチ: `codex/ec-baseline`。後続機能はこのベースから別ブランチで作業できます。ローカルフォルダーを新しいPCへコピーした場合、`.git`を含めない配布ZIPにはGit履歴がないので `git init -b main` → `git add .` → `git commit -m "Add EC baseline"` → `git branch codex/ec-baseline` を先に実行してください。

Sitesの公開設定は`.openai/hosting.json`に入っています。別のSiteとして展開する場合、元のSiteへ上書きしないよう、新規Site登録時にIDを発行してください。

## 素材・ライセンス

DS: `@mnoritake-figma/ds@0.1.0`。元ソース: [mnoritake-ds](https://github.com/mnoritake-twigma/mnoritake-ds)、固定コミット `957761d94b42e9b2b8887e357b12d6e23518efba`、元MITライセンス保持。写真出典は[ASSETS.md](docs/ASSETS.md)。商品情報はデモ用の架空データです。
