import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export class ShopError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, stored) {
  try {
    const [salt, hex] = stored.split(":");
    const expected = Buffer.from(hex, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export const normalize = (value) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();
export function selectProducts(products, query) {
  const q = normalize(query.get("q") ?? "");
  if (q.length > 200)
    throw new ShopError(400, "検索文字列は200文字以内にしてください。");
  const number = (key, fallback, min, max) => {
    if (!query.has(key)) return fallback;
    const raw = query.get(key);
    const n = Number(raw);
    if (raw === "" || !Number.isSafeInteger(n) || n < min || n > max)
      throw new ShopError(400, `${key}が不正です。`);
    return n;
  };
  const limit = number("limit", 12, 1, 48),
    page = number("page", 1, 1, 100000),
    maxPrice = number(
      "maxPrice",
      Number.MAX_SAFE_INTEGER,
      0,
      Number.MAX_SAFE_INTEGER,
    );
  const sort = query.get("sort") ?? "featured";
  if (!["featured", "price", "-price", "-createdAt"].includes(sort))
    throw new ShopError(400, "並び順が不正です。");
  const stock = query.get("inStock");
  if (stock !== null && !["true", "false"].includes(stock))
    throw new ShopError(400, "在庫フィルターが不正です。");
  const category = query.get("category") ?? "";
  const docs = products.filter(
    (p) =>
      (!q ||
        normalize(`${p.name} ${p.description} ${p.material}`).includes(q)) &&
      (!category || p.category === category) &&
      p.price <= maxPrice &&
      (stock !== "true" || p.stock > 0),
  );
  docs.sort(
    (a, b) =>
      (sort === "price"
        ? a.price - b.price
        : sort === "-price"
          ? b.price - a.price
          : sort === "-createdAt"
            ? b.createdAt.localeCompare(a.createdAt)
            : Number(b.featured) - Number(a.featured)) ||
      a.id.localeCompare(b.id),
  );
  return {
    docs: docs.slice((page - 1) * limit, page * limit),
    totalDocs: docs.length,
    limit,
    totalPages: Math.ceil(docs.length / limit),
    page,
    hasPrevPage: page > 1,
    hasNextPage: page * limit < docs.length,
  };
}
export function cartDTO(lines, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = lines
    .map((line) => {
      const product = byId.get(line.productId);
      if (!product)
        throw new ShopError(409, "カートの商品情報が変更されました。");
      return { ...line, product, lineTotal: product.price * line.quantity };
    })
    .sort((a, b) => a.productId.localeCompare(b.productId));
  const subtotal = items.reduce((sum, l) => sum + l.lineTotal, 0),
    shipping = subtotal === 0 || subtotal >= 10000 ? 0 : 550;
  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    currency: "JPY",
  };
}
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email ?? null,
  kind: user.kind,
});
export function createShop(repository, options = {}) {
  const cookieName = options.cookieName ?? "pulse_session";
  const allowedOrigins = (options.allowedOrigins ?? "")
    .split(",")
    .filter(Boolean);
  const secure = options.secureCookies === true;
  const cookie = (token, age = 28800) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const attempts = new Map();
  function rateLimit(ip) {
    const now = Date.now(),
      current = attempts.get(ip);
    if (current && current.until > now && current.count >= 10)
      throw new ShopError(
        429,
        "ログイン試行が多すぎます。15分後にお試しください。",
      );
    attempts.set(
      ip,
      current && current.until > now
        ? { ...current, count: current.count + 1 }
        : { count: 1, until: now + 900000 },
    );
    if (attempts.size > 10000)
      for (const [key, value] of attempts)
        if (value.until < now) attempts.delete(key);
  }
  async function handle({ method, url, headers = {}, body, ip = "unknown" }) {
    try {
      const parsed = new URL(url, "http://internal"),
        path = parsed.pathname;
      const origin = headers.origin;
      if (origin && !allowedOrigins.includes(origin))
        throw new ShopError(403, "このアクセス元は許可されていません。");
      if (
        ["POST", "PUT", "DELETE"].includes(method) &&
        headers["sec-fetch-site"] === "cross-site" &&
        !origin
      )
        throw new ShopError(403, "アクセス元を確認できません。");
      if (
        ["POST", "PUT"].includes(method) &&
        !headers["content-type"]?.startsWith("application/json")
      )
        throw new ShopError(415, "JSON形式で送信してください。");
      const rawCookie = (headers.cookie ?? "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(cookieName + "="))
        ?.slice(cookieName.length + 1);
      const token =
        rawCookie && /^[a-f0-9]{64}$/.test(rawCookie) ? rawCookie : null;
      const session = token ? await repository.session(tokenHash(token)) : null;
      const user =
        session && new Date(session.expiresAt) > new Date()
          ? await repository.user(session.userId)
          : null;
      const requireUser = () => {
        if (!user) throw new ShopError(401, "ログイン状態を確認してください。");
        return user;
      };
      const startSession = async (u) => {
        const value = randomBytes(32).toString("hex");
        await repository.createSession(
          tokenHash(value),
          u.id,
          new Date(Date.now() + 28800000),
        );
        return {
          status: 200,
          body: { user: publicUser(u) },
          cookie: cookie(value),
        };
      };
      if (method === "GET" && path === "/health") {
        await repository.health();
        return {
          status: 200,
          body: { status: "ok", backend: options.backend },
        };
      }
      if (method === "POST" && path === "/session") {
        if (user) return { status: 200, body: { user: publicUser(user) } };
        const id = "guest-" + randomBytes(16).toString("hex");
        return startSession(await repository.createGuest(id));
      }
      if (method === "GET" && path === "/auth/me")
        return { status: 200, body: { user: publicUser(requireUser()) } };
      if (method === "POST" && path === "/auth/login") {
        if (
          !body ||
          typeof body.email !== "string" ||
          typeof body.password !== "string" ||
          body.email.length > 254 ||
          body.password.length > 128
        )
          throw new ShopError(
            400,
            "メールアドレスとパスワードを入力してください。",
          );
        rateLimit(ip);
        const target = await repository.userByEmail(
          body.email.trim().toLowerCase(),
        );
        if (
          !target?.passwordHash ||
          !verifyPassword(body.password, target.passwordHash)
        )
          throw new ShopError(
            401,
            "メールアドレスまたはパスワードが正しくありません。",
          );
        if (token) await repository.deleteSession(tokenHash(token));
        return startSession(target);
      }
      if (method === "POST" && path === "/auth/logout") {
        if (token) await repository.deleteSession(tokenHash(token));
        return { status: 200, body: { ok: true }, cookie: cookie("", 0) };
      }
      if (method === "GET" && path === "/categories")
        return { status: 200, body: { docs: await repository.categories() } };
      if (method === "GET" && path === "/products")
        return {
          status: 200,
          body: selectProducts(
            await repository.products(),
            parsed.searchParams,
          ),
        };
      const productMatch = path.match(/^\/products\/([^/]+)$/);
      if (method === "GET" && productMatch) {
        const p = await repository.product(decodeURIComponent(productMatch[1]));
        if (!p) throw new ShopError(404, "商品が見つかりません。");
        return { status: 200, body: p };
      }
      if (method === "GET" && path === "/cart")
        return {
          status: 200,
          body: cartDTO(
            await repository.lines(requireUser().id),
            await repository.products(),
          ),
        };
      const line = path.match(/^\/cart\/items\/([^/]+)$/);
      if (line && ["PUT", "DELETE"].includes(method)) {
        const owner = requireUser().id,
          id = decodeURIComponent(line[1]);
        if (method === "DELETE") await repository.deleteLine(owner, id);
        else {
          if (
            !body ||
            Object.keys(body).some((k) => k !== "quantity") ||
            !Number.isSafeInteger(body.quantity) ||
            body.quantity < 0
          )
            throw new ShopError(400, "数量は0以上の整数のみ指定してください。");
          const product = await repository.product(id);
          if (!product) throw new ShopError(404, "商品が見つかりません。");
          if (body.quantity > product.stock)
            throw new ShopError(
              409,
              `在庫は${product.stock}点です。数量を変更してください。`,
            );
          if (body.quantity === 0) await repository.deleteLine(owner, id);
          else await repository.putLine(owner, id, body.quantity);
        }
        return {
          status: 200,
          body: cartDTO(
            await repository.lines(owner),
            await repository.products(),
          ),
        };
      }
      throw new ShopError(404, "エンドポイントが見つかりません。");
    } catch (error) {
      if (!(error instanceof ShopError))
        console.error(
          "Shop request failed:",
          error instanceof Error ? error.message : "unknown",
        );
      return {
        status: error instanceof ShopError ? error.status : 500,
        body: {
          errors: [
            {
              message:
                error instanceof ShopError
                  ? error.message
                  : "処理に失敗しました。もう一度お試しください。",
            },
          ],
        },
      };
    }
  }
  return { handle };
}
