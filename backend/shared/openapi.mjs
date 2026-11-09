const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const string = { type: 'string' };
const integer = { type: 'integer', minimum: 0 };
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const array = (items) => ({ type: 'array', items });
const json = (schema) => ({ 'application/json': { schema } });
const response = (schema, description = '成功') => ({ description, content: json(schema) });
const body = (schema) => ({ required: true, content: json(schema) });
const errors = { 400: '入力不正', 401: '未認証／認証失敗', 403: '許可されていないOrigin', 404: '商品が存在しない', 409: '在庫超過／カートの商品情報が変更された', 415: 'JSON以外のリクエスト', 429: 'ログイン試行制限', 500: '内部エラー' };
const productId = { name: 'productId', in: 'path', required: true, schema: string, example: 'prd-001' };

export function createOpenAPI({ backend, cookieName }) {
  const operation = (operationId, summary, tag, schema, codes = [], authenticated = false, extra = {}) => ({
    operationId, summary, tags: [tag],
    security: authenticated ? [{ sessionCookie: [] }] : [],
    responses: { 200: response(schema), ...Object.fromEntries([...new Set([...codes, 403, 500])].map(code => [code, response(ref('Error'), errors[code])])) },
    ...extra,
  });
  const schemas = {
    Error: object({ errors: array(object({ message: string })) }),
    Category: object({ id: string, name: string, label: string }),
    Product: object({
      ...Object.fromEntries(['id', 'slug', 'name', 'subtitle', 'description', 'category', 'image', 'imageAlt', 'material', 'dimensions', 'color'].map(key => [key, string])),
      price: integer, currency: { type: 'string', enum: ['JPY'] }, stock: integer,
      featured: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' },
    }),
    ProductPage: object({ docs: array(ref('Product')), totalDocs: integer, limit: { type: 'integer', minimum: 1, maximum: 48 }, totalPages: integer, page: { type: 'integer', minimum: 1 }, hasPrevPage: { type: 'boolean' }, hasNextPage: { type: 'boolean' } }),
    User: object({ id: string, name: string, email: { type: 'string', nullable: true }, kind: { type: 'string', enum: ['guest', 'member'] } }),
    UserResponse: object({ user: ref('User') }),
    Cart: object({ items: array(object({ productId: string, quantity: integer, product: ref('Product'), lineTotal: integer })), subtotal: integer, shipping: integer, total: integer, currency: { type: 'string', enum: ['JPY'] } }),
  };
  const setCookie = { 'Set-Cookie': { description: 'HttpOnly・SameSite=Lax。セッションは8時間。ログアウトでは失効。', schema: string } };
  const sessionOperation = (id, summary, schema, codes = [], extra = {}) => {
    const op = operation(id, summary, '認証', schema, [...codes, 400, 415], false, extra);
    op.responses[200].headers = setCookie;
    return op;
  };
  return {
    openapi: '3.0.3',
    info: { title: `PULSE STORE Shop API (${backend})`, version: '1.0.0', description: '既存側とPayload検証側で共通のShop APIです。Payload標準の管理APIは対象外です。価格は税込JPY整数。送料は空カート／小計10,000円以上で0円、それ以外550円。カートは在庫を予約しません。ドキュメント画面の実行機能はGETのみです。ログインは同じ環境のショップ画面から行うとCookieが共有されます。' },
    servers: [{ url: '.', description: 'この仕様JSONを取得した環境のAPI' }],
    tags: ['稼働状態', '商品', '認証', 'カート'].map(name => ({ name })),
    paths: {
      '/health': { get: operation('getHealth', 'DB疎通とバックエンド名', '稼働状態', object({ status: { type: 'string', enum: ['ok'] }, backend: { type: 'string', enum: [backend] } })) },
      '/categories': { get: operation('listCategories', 'カテゴリー一覧', '商品', object({ docs: array(ref('Category')) })) },
      '/products': { get: operation('listProducts', '商品検索・フィルター・並び替え', '商品', ref('ProductPage'), [400], false, {
        parameters: [
          ['q', { type: 'string', maxLength: 200 }, '名前・説明・素材をNFKC正規化して部分一致検索'],
          ['category', string, 'カテゴリーID'],
          ['maxPrice', { ...integer, maximum: Number.MAX_SAFE_INTEGER }, '税込上限価格'],
          ['inStock', { type: 'boolean' }, 'trueの場合のみ在庫ありに限定'],
          ['sort', { type: 'string', enum: ['featured', 'price', '-price', '-createdAt'], default: 'featured' }, '並び順'],
          ['page', { type: 'integer', minimum: 1, maximum: 100000, default: 1 }, 'ページ番号'],
          ['limit', { type: 'integer', minimum: 1, maximum: 48, default: 12 }, '1ページの件数'],
        ].map(([name, schema, description]) => ({ name, in: 'query', schema, description })),
      }) },
      '/products/{productId}': { parameters: [productId], get: operation('getProduct', '商品詳細', '商品', ref('Product'), [404]) },
      '/session': { post: sessionOperation('createSession', '既存セッションを返す／新規ゲストセッションを作成', ref('UserResponse'), [], { requestBody: body({ type: 'object', example: {} }) }) },
      '/auth/me': { get: operation('getCurrentUser', '現在の会員またはゲスト', '認証', ref('UserResponse'), [401], true) },
      '/auth/login': { post: sessionOperation('login', '会員ログイン（ゲストカートは統合しない）', ref('UserResponse'), [401, 429], { requestBody: body(object({ email: { type: 'string', maxLength: 254, example: 'alice@example.test' }, password: { type: 'string', format: 'password', maxLength: 128, writeOnly: true } })) }) },
      '/auth/logout': { post: sessionOperation('logout', 'セッション削除とCookie失効', object({ ok: { type: 'boolean', enum: [true] } }), [], { requestBody: body({ type: 'object', example: {} }) }) },
      '/cart': { get: operation('getCart', '自分のカートと計算済み合計', 'カート', ref('Cart'), [401, 409], true) },
      '/cart/items/{productId}': {
        parameters: [productId],
        put: operation('setCartQuantity', '数量を指定（0で削除）', 'カート', ref('Cart'), [400, 401, 404, 409, 415], true, { requestBody: body({ ...object({ quantity: { ...integer, maximum: Number.MAX_SAFE_INTEGER, example: 1 } }), additionalProperties: false }), description: '絶対数量を設定します。在庫を超える数量は409。所有者や価格は送信できません。' }),
        delete: operation('deleteCartItem', '商品をカートから削除（繰り返し可能）', 'カート', ref('Cart'), [401, 409], true),
      },
    },
    components: { schemas, securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: cookieName, description: 'POST /session または /auth/loginで発行。ブラウザはHttpOnly Cookieを自動送信します。' } } },
  };
}
