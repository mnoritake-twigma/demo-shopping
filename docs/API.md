# API契約（MSW / NestJS / Payload）

## 層の境界

`features/* → api/client.ts → HTTP /api/* → mocks/handlers.ts → mocks/service.ts → mocks/seed.ts`

UIはseedをimportしない。API_MODE=mockではMSWのService WorkerがHTTPを処理する。モックは別の実サーバーではなくブラウザ内で動く。商品は8件、3カテゴリー。カートの保存先は同一ブラウザ／同一originのlocalStorage（`pulse-store.cart.v1`）。これはモックモードだけの制約です。Docker版ではNestJS/PrismaとPayloadの独立したPostgreSQLに保存します。起動手順は [BACKENDS.md](BACKENDS.md) を参照してください。

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

## 実APIの認証とPayload接続

両バックエンドで同じエンドポイントを使用します。Dockerのフロントからは `/api`、Payloadへ直接接続する場合は `/shop-api` がベースURLです。Payload標準の `/api` は管理者用で、Shop APIと別です。

| method | path（ベースURL相対） | 入出力 |
| --- | --- | --- |
| GET | `/health` | DB疎通とbackend名 |
| POST | `/session` | `{}` → 既存セッションまたは新規ゲスト、HttpOnly Cookie |
| GET | `/auth/me` | `{user:{id,name,email,kind}}` |
| POST | `/auth/login` | `{email,password}` → 会員と新しいCookie |
| POST | `/auth/logout` | `{}` → セッション削除とCookie失効 |

商品閲覧は認証不要。カートにはセッションが必要で、未認証は401。所有者はCookieから決定し、quantity以外の書き込みフィールドを拒否します。Originは許可リスト方式（不正originは403）、POST/PUTはJSONのみ（415）。ログイン試行は同一接続元で15分10回（429）。商品は固定外部IDで共通化し、Payload内部IDをDTOに露出しません。サーバー側で価格・送料・在庫を検証します。

既存Cookieは `pulse_native`、検証Cookieは `pulse_payload`。ショップ会員とPayload管理者は別コレクションです。ゲストカートの会員への統合はありません。カートは在庫を予約せず、同一商品の同時更新は最後の数量が有効です。認証トークン・管理者パスワード・DB接続文字列をVITE変数に入れないでください。

`payload-blueprint.json` は初期設計資料です。**実行設定の正本は `backend/payload/src/payload.config.ts` とコミット済みmigration**です。

## 将来の拡張点（初期状態には存在しない）

比較: `features/comparison` を追加し、ProductCardに選択操作を追加。
お気に入り: `features/favorites` と所有者付きAPI／永続化を追加。
お問い合わせ: `features/contact` と入力検証／送信APIを追加。
いずれも現状は画面、ボタン、API、保存領域を実装していない。
