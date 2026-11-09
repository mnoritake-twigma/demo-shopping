# API契約とPayload移行

## 層の境界

`features/* → api/client.ts → HTTP /api/* → mocks/handlers.ts → mocks/service.ts → mocks/seed.ts`

UIはseedをimportしない。API_MODE=mockではMSWのService WorkerがHTTPを処理する。モックは別の実サーバーではなくブラウザ内で動く。商品は8件、3カテゴリー。カートの保存先は同一ブラウザ／同一originのlocalStorage（`pulse-store.cart.v1`）。複数タブ／複数ユーザー間の同時更新やサーバー永続化は対象外。

## エンドポイント

| method | path | 入出力 |
| --- | --- | --- |
| GET | `/api/categories` | `{docs: Category[]}` |
| GET | `/api/products` | `q, category, maxPrice, inStock, sort, page, limit` → ページ形式 |
| GET | `/api/products/:id` | `Product`。不明IDは404 |
| GET | `/api/cart` | 計算済み `Cart` |
| PUT | `/api/cart/items/:productId` | `{quantity: integer}` → 更新後Cart。絶対数量なので同じ要求の再試行で増殖しない |
| DELETE | `/api/cart/items/:productId` | 削除後Cart。繰り返し削除可 |

商品一覧は `docs,totalDocs,limit,totalPages,page,hasPrevPage,hasNextPage`。sortは `featured`, `price`, `-price`, `-createdAt`。検索は名前・説明・素材に対するNFKC正規化後の部分一致。正規表現を実行しない。limitは1〜48、初期画面は全8件を表示する。

エラー: `{errors:[{message:string}]}`。400=不正な数量、404=商品不明、409=在庫超過。クライアントは10秒でタイムアウト。変更失敗時は以前のカートを維持する。

価格はJPY整数（税込）、クライアントから価格は送らない。送料は小計10,000円以上または空カートで0円、その他550円。カート追加は在庫の予約・減算ではない。最大数量はstock。決済／注文作成は実装しない。

## モデル

- Product: `id`, `slug`（一意）, `name`, `subtitle`, `description`, `category`, `price`, `currency`, `stock`, `image`, `imageAlt`, `material`, `dimensions`, `color`, `featured`, `createdAt`
- Category: `id`, `name`, `label`
- CartLine（保存）: `productId`, `quantity`
- Cart（応答）: `items`（商品展開・行小計付き）, `subtotal`, `shipping`, `total`, `currency`

固定ID `prd-001` 等はデモ用の外部商品ID。PayloadのDBが自動採番するIDにそのまま置き換えると、保存済みカート参照が壊れる。`externalId` 一意フィールドを設け、APIアダプターで変換する。

## Payload接続手順（本タスクでは未接続）

1. 検証環境にcategories/products/cartsを作る。`payload-blueprint.json` がフィールド定義の移行用資料、`seed-products.json` が商品データ。blueprintはPayload実行設定ではない。
2. カテゴリー→商品→画像の順に登録。カテゴリーはrelationship、画像はmedia uploadへ変換する。seedの相対URLを利用する場合はこのpublic/productsの写真を同じホストへ置く。
3. custom endpointまたはBFFで上表の契約を実装する。**Payload標準RESTにURLを差し替えるだけでは動かない**。q/categoryはPayloadのwhere、category/mediaの展開値はこのProduct型に変換し、cartの価格再計算・在庫検証はサーバー側へ移す。
4. カート所有者はサーバーがセッションから決定。リクエストで渡されたuserIdを信用しない。認証Cookie、CORS（フロントのoriginを限定）、CSRF、アクセス制御、入力検証を構成する。APIキー／管理者秘密情報をVITE変数に入れない。
5. `.env.local` に `VITE_API_MODE=remote` と `VITE_API_BASE_URL=https://your-payload.example/api` を設定して再起動／再ビルド。自動fallbackはしないため、接続失敗をUIで確認できる。
6. 同じシナリオで検索、404、409、数量変更、所有者分離、再読み込み、通信失敗を検証。追加時・注文確定時の在庫検証とトランザクションは本番化時に必要。

Payloadの公式RESTはコレクションのCRUDとcustom endpointを提供する。ここでは互換DTOを挟んでEC画面を維持する設計を選択した。
参照: https://payloadcms.com/docs/rest-api/overview / https://payloadcms.com/docs/configuration/collections

## 将来の拡張点（初期状態には存在しない）

比較: `features/comparison` を追加し、ProductCardに選択操作を追加。
お気に入り: `features/favorites` と所有者付きAPI／永続化を追加。
お問い合わせ: `features/contact` と入力検証／送信APIを追加。
いずれも現状は画面、ボタン、API、保存領域を実装していない。
