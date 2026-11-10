# 既存Shop REST APIとPayloadの互換契約

基準: `main@77ed0e99113634861391563eaec78c7ef95a0422`。根拠は[shared/shop.mjs](../backend/shared/shop.mjs)、[OpenAPI生成](../backend/shared/openapi.mjs)、[Nest Controller](../backend/nest/src/main.ts)、[Payload route](../backend/payload/src/app/shop-api/[[...path]]/route.ts)、[フロント型](../src/domain/models.ts)。Figma実測結果はまだない。

## 接続方法

既存Nestのbaseは`/api`、既存Payload比較実装は`/shop-api`。Dockerでは[Nginx](../docker/nginx.conf.template)・[compose](../compose.yaml)によりフロントの`/api/`を各backendへ転送する。Payload標準CRUDの`/api`とは別物。

[client.ts](../src/api/client.ts)は`VITE_API_BASE_URL`（default `/api`）＋各path、`credentials:include`、JSON、10秒timeout。[main.tsx](../src/main.tsx)は`VITE_API_MODE`がmock/defaultならMSW起動、remoteなら自分のmock workerを解除する。Figma検証時はmockを無効化し、Networkで実backendへの通信を証明する。Next.js化する場合はViteのimport.meta.envやエントリポイントを調整する必要がある。生成されたproxy/origin設定を確認するまで同一origin・Cookie送信成功を仮定しない。

## エンドポイント対応

下記pathはbaseからの相対。全成功レスポンスは200。Figma側はこの契約を満たす業務APIが必要であり、実際のURLは生成後に記録する。

| method/path | 入力 | 認証 | 成功body | Payload比較側の対応 |
|---|---|---|---|---|
| GET /health | なし | 不要 | `{status:"ok",backend}` | backend識別はpayload（Nestはnestjs-prisma） |
| GET /openapi.json | なし | 不要 | OpenAPI 3.0.3 | 同じ生成関数、Cookie名/backend識別に差 |
| GET /categories | なし | 不要 | `{docs:Category[]}` | categoriesからexternalId変換 |
| GET /products | 下記query | 不要 | Page<Product> | products→DTO→共有検索 |
| GET /products/:id | 外部商品ID（slugではない） | 不要 | Product単体 | externalId検索、未発見404 |
| POST /session | フロントは`{}` | 不要 | `{user:ShopUser}`＋Cookie | guest作成。有効sessionがあれば既存userを返す |
| GET /auth/me | なし | 有効session | `{user:ShopUser}` | shop-users/session参照 |
| POST /auth/login | `{email,password}` | 事前session不要 | `{user:ShopUser}`＋Cookie | 旧session削除、新session発行 |
| POST /auth/logout | フロントは`{}` | 不要 | `{ok:true}`＋失効Cookie | session削除。カートは残る |
| GET /cart | なし | 有効session（guest含む） | Cart | CookieのuserIdに属する行のみ |
| PUT /cart/items/:productId | `{quantity:integer}`のみ | 有効session | 更新後Cart | 数量置換、0は削除 |
| DELETE /cart/items/:productId | なし | 有効session | 更新後Cart | 存在しない行でも削除操作は冪等 |

OpenAPIが列挙するShop操作は11（仕様取得 `/openapi.json` 自身を除く）。

## レスポンス形状

- Category: `{id,name,label}`。id/name/labelはstring。
- Product: `{id,slug,name,subtitle,description,category,price,currency,stock,image,imageAlt,material,dimensions,color,featured,createdAt}`。price/stockは数値、featuredはboolean、createdAtはISO日時文字列、他はstring。フロント型のcurrencyはJPY。内部Payload ID/更新日時等を追加露出しない。
- Page: `{docs,totalDocs,limit,totalPages,page,hasPrevPage,hasNextPage}`。空集合totalPages=0、hasPrevPageはpage>1だけで判定。
- ShopUser: `{id,name,email,kind}`。email未設定はnull。passwordHash/tokenHashは含めない。
- Cart: `{items:[{productId,quantity,product,lineTotal}],subtotal,shipping,total,currency:"JPY"}`。itemsはproductId順。
- Shop共通エラー: `{errors:[{message:string}]}`。フロントはerrors[0].messageを表示。frameworkで先に拒否される場合は別形状になり得る。

## 商品・カートの業務仕様

- qはNFKC→trim→小文字、正規化後200文字以内。name/description/materialを連結した文字列への部分一致。
- categoryは完全一致。maxPriceは0以上のsafe integer（default MAX_SAFE_INTEGER）。limit=1..48/default12、page=1..100000/default1。空文字や不正数値は400。
- inStockはtrue/false文字列のみ、trueはstock>0、falseは全件。sortはfeatured(default)、price、-price、-createdAt。並び同値はid昇順。
- quantityはsafe integer>=0、追加キー（price/userId等）は400。存在しない商品PUTは404、stock超過は409。PUTは加算ではなく置換。在庫引当/在庫減算はしない。
- 単価はサーバーの商品情報から再計算。subtotal=単価×数量の合計、送料はsubtotal=0または>=10000なら0、それ以外550。total=subtotal+送料。
- カート内商品が見つからない場合409。ログインでguestカートを会員へ移す処理はない。注文/決済/割引処理はない。

## 認証・バリデーション

session tokenは32 random bytesのhex、DBにはSHA256、8時間有効。CookieはNest=`pulse_native`、比較Payload=`pulse_payload`、Path=/、HttpOnly、SameSite=Lax、Max-Age=28800、SecureはSECURE_COOKIES=true時のみ。Figma管理認証の設定は置き換えず、業務sessionを実現できる拡張点を検証する。

passwordはsalt付きscrypt。loginはemail/passwordがstringでそれぞれ254/128文字以内、emailをtrim/lowercaseして検索。メール形式validatorはない。login試行はIPごと15分で10回（成功も加算）、メモリ内Mapのため再起動・複数instance間で共有しない。失敗401、制限429。カート所有者はCookieから導出し、クライアント指定userIdを受け取らない。

Originがあればallowlist照合（不許可403）。POST/PUT/DELETEでsec-fetch-site=cross-siteかつOriginなしは403。POST/PUTはapplication/json必須（415）。共通処理の想定外例外は500、未定義pathは404。各adapterの事前パースやCORS判定は別途差分試験する。

## 標準Payload CRUDとの違い・未解消点

[Payload repository](../backend/payload/src/repository.ts)は内部ID→externalId、publishedAt→createdAt、最小DTOへの変換を実施。標準`/api/products`は内部ID・独自query/CRUD仕様であり、Shop検索・cart・sessionの代替にならない。管理CRUDはadmins制限、公開Shopは業務ハンドラ経由。

ソース上、Payload routeはGET/POST/PUT/DELETE/OPTIONSだけexportし、OPTIONSは独自204/403。Nestは@AllとExpressを使用する。未対応method・HEAD・壊れたJSONのstatus/bodyはframeworkを含めて比較する必要がある。Payloadはraw文字列長>16384を413、Nginxは16kのbody制限、Nest Controller自体には同じ長さ検証がない。直接APIとproxy経由の差を別に記録する。既存PayloadのFK/整数制約差は[payload-schema.md](payload-schema.md)参照。

## 互換性の判定基準

[既存contract test](../backend/tests/contract.test.mjs)・[OpenAPI test](../backend/tests/openapi.test.mjs)・[browser test](../backend/tests/browser/shop.spec.ts)を仕様の補助資料とする。contract testはlocalhostと管理認証を固定しており、Figmaへ無編集で実行できるとは限らない。Figma向けには独立したtest runnerでbase URLと架空資格情報を注入し、破壊的な管理操作は専用fixtureに限定する。

通常DTOは期待値で比較し、Cookie名/backend識別・動的guest ID/session tokenだけを明示的に正規化する。整数・参照制約、未知method、エラー形状、CORS/Cookie、所有者分離の差は隠さず結果に残す。共有ロジック同士の比較だけでは仕様の正しさを証明しない。
