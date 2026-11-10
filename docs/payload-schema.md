# 既存DBとPayload Collectionsの対応

解析基準: `main@77ed0e99113634861391563eaec78c7ef95a0422`（2026-11-10取得）。これは仕様・実験準備であり、Figmaで作成済みという報告ではない。

## 実装構成と根拠

- [Nest package](../backend/nest/package.json): NestJS 11系・Express、Prisma 7.10.1、PostgreSQL adapter。Node要件 >=24.22.1。
- [Prisma schema](../backend/nest/prisma/schema.prisma): 下記5モデル。Prisma生成クライアントがEntity相当で、独立したEntityクラスはない。
- [Prisma config](../backend/nest/prisma.config.ts)・[baseline migration](../backend/nest/prisma/migrations/20261109000000_baseline/migration.sql): DATABASE_URL、SQLによるテーブル・索引・FK作成。`npm run migrate`は`prisma migrate deploy`。
- [Controller](../backend/nest/src/main.ts): ShopController一つ、`/api`のリクエストを共有ハンドラに委譲。独立Service/DTOクラス・ValidationPipeはない。
- [Repository](../backend/nest/src/repository.ts): Prisma CRUD、Date→ISO変換、複合キーupsert。
- [共有業務処理](../backend/shared/shop.mjs): `createShop`、`selectProducts`、`cartDTO`、`publicUser`がService・DTO・バリデーション相当。
- [既存Payload設定](../backend/payload/src/payload.config.ts)・[Repository](../backend/payload/src/repository.ts)・[package](../backend/payload/package.json): mainにはPayload 3.93.0 / Next.js 16.4.5の比較実装が既存。`buildConfig()`と自前Postgres設定なのでFigmaへ丸ごと移植しない。
- [Payload migration](../backend/payload/src/migrations/20261109_022820_baseline.ts): 自己ホスト環境用。Figma管理DBへそのまま適用しない。生成側の対応手順を確認する。

## モデル・フィールド対応

以下のCollection名はmainのPayload比較実装に基づく。Figmaでは生成された管理設定を保ちつつ業務定義を追加する。

| Prismaモデル/フィールド | 型・制約（Prisma） | Payload比較実装 | Figmaで守る契約・検証 |
|---|---|---|---|
| Category.id | String主キー | categories.externalId: unique text | APIのidはexternalId。内部IDを返さない |
| Category.name, label | 必須String | 同名required text | そのままDTO化 |
| Category.products | Product[]逆参照 | 独立フィールドなし | Product.categoryの参照を検証 |
| Product.id | String主キー | products.externalId: unique text | APIのidを維持 |
| Product.slug | 必須String unique | slug: unique text | 重複拒否 |
| Product.name, subtitle, description | 必須String | 同名required text | 欠落させない |
| Product.category | 必須String、Category.idへのFK | category: required text | 文字列カテゴリIDを返す。参照整合性は別途必要 |
| Product.price, stock | 必須Int | 同名number、min:0 | 整数制約と範囲を明示。Payload numberだけではInt同等でない |
| Product.currency | String、default JPY | required text、defaultなし | seedはJPY。Prisma自体はJPY enumではない |
| Product.image, imageAlt, material, dimensions, color | 必須String | 同名required text | imageはURL/パス文字列。upload Collectionではない |
| Product.featured | Boolean、default false | checkbox、default false | 並び順判定に使用 |
| Product.createdAt | 必須DateTime | publishedAt: required date | DTO createdAtへ変換。Payload自身のcreatedAtと混同しない |
| Product.lines | CartLine[]逆参照 | 独立フィールドなし | カート側参照を維持 |
| User.id | String主キー | shop-users.externalId: unique text | API idを維持 |
| User.email | nullable String unique | optional unique text | APIでは未設定をnullへ正規化 |
| User.name | 必須String | required text | publicUserに含む |
| User.kind | 必須String（DB enumなし） | select guest/member | 既存処理/seedはguest/member。DBとselectの制約差を記録 |
| User.passwordHash | nullable String | hidden text、read:false | 新規架空ユーザーのみ生成。APIへ返さない |
| User.sessions, lines | 逆参照 | 独立フィールドなし | 削除連動を確認 |
| Session.tokenHash | String主キー | shop-sessions.tokenHash: unique text | 生tokenでなくSHA256。内部IDは別 |
| Session.userId | User.idへのFK | required text | ユーザー参照・削除連動が必要 |
| Session.expiresAt | 必須DateTime、索引 | required date | 8時間の期限判定。明示索引の差を確認 |
| CartLine.userId, productId | User/ProductへのFK、複合主キー | cart-linesのtext＋unique key=`userId:productId` | 1ユーザー1商品1行、衝突しないID設計を確認 |
| CartLine.quantity | 必須Int | number、min:0 | Shop APIは安全な整数、0で行削除 |
| なし（管理用） | 該当業務モデルなし | admins: auth collection | Figmaが生成した管理認証を優先。shop-usersと分離 |

## 関係・制約の差

SQLではProduct→CategoryはON DELETE RESTRICT、Session→User・CartLine→User/ProductはON DELETE CASCADE（いずれもON UPDATE CASCADE）。既存Payload比較実装は参照をtextで保存し、同等のFK/cascadeを定義していない。relationshipを採用する場合も、APIでexternalId文字列へ変換し、削除動作を試験する。参照整合性を実装できない場合は「完全互換」としない。

SQLのIntには非負CHECKはない。一方Payload numberにはmin:0があるが整数validatorがない。Shop APIの数量検証とDB/管理画面の入力制約を区別する。`key=userId:productId`は既存ID体系では使われるが、任意のコロン入りIDで複合主キーと数学的に同等とは限らない。

## アクセスと架空データ

比較用PayloadのCollectionsはadminsのみCRUD可。shop-sessionsはread不可、passwordHashもread不可。サーバーのLocal APIは`overrideAccess:true`で内部操作し、公開Shop API側で認証/所有者を判定する。これをブラウザ側の権限回避として移植しない。

[seed-products.json](seed-products.json)（8商品）、[seed-categories.json](seed-categories.json)（3カテゴリ）、[seed関数](../backend/shared/seed.mjs)が架空データの根拠。架空会員はalice/bobのexample.testアドレス、パスワードは環境から受けて新規hash生成。FigmaのSecretsは正式な入力経路を使い、既存秘密値を持ち込まない。

クーポン・注文・決済・比較・お気に入り・問い合わせに対応するDBモデルは、この基準のschemaには存在しない。本実験の追加対象にしない。
