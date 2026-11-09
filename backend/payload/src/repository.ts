import { getPayload } from "payload";
import config from "./payload.config";
export const getDB = () => getPayload({ config });
// Local API intentionally bypasses collection access; shop authorization happens in shared/shop.mjs.
async function all(collection: any, where?: any) {
  const p = await getDB();
  return (
    await p.find({
      collection,
      where,
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: collection === "shop-users",
    })
  ).docs as any[];
}
async function one(collection: any, where: any) {
  return (await all(collection, where))[0] ?? null;
}
const eq = (key: string, value: string) => ({ [key]: { equals: value } });
const byExternal = (collection: string, id: string) =>
  one(collection, eq("externalId", id));
const userDTO = (u: any) =>
  u
    ? {
        id: u.externalId,
        name: u.name,
        email: u.email,
        kind: u.kind,
        passwordHash: u.passwordHash,
      }
    : null;
const productDTO = (p: any) =>
  p
    ? Object.fromEntries(
        [
          "slug",
          "name",
          "subtitle",
          "description",
          "category",
          "price",
          "currency",
          "stock",
          "image",
          "imageAlt",
          "material",
          "dimensions",
          "color",
          "featured",
        ]
          .map((k) => [k, p[k]])
          .concat([
            ["id", p.externalId],
            ["createdAt", p.publishedAt],
          ]),
      )
    : null;
async function create(collection: any, data: any) {
  return (await getDB()).create({ collection, data, overrideAccess: true });
}
async function remove(collection: any, where: any) {
  return (await getDB()).delete({ collection, where, overrideAccess: true });
}
export const repository = {
  health: async () => {
    await all("categories");
  },
  products: async () => (await all("products")).map(productDTO),
  product: async (id: string) => productDTO(await byExternal("products", id)),
  categories: async () =>
    (await all("categories"))
      .map((c) => ({ id: c.externalId, name: c.name, label: c.label }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  user: async (id: string) => userDTO(await byExternal("shop-users", id)),
  userByEmail: async (email: string) =>
    userDTO(await one("shop-users", eq("email", email))),
  createGuest: async (id: string) =>
    userDTO(
      await create("shop-users", {
        externalId: id,
        name: "ゲスト",
        kind: "guest",
      }),
    ),
  session: (hash: string) => one("shop-sessions", eq("tokenHash", hash)),
  createSession: (hash: string, userId: string, expiresAt: Date) =>
    create("shop-sessions", {
      tokenHash: hash,
      userId,
      expiresAt: expiresAt.toISOString(),
    }),
  deleteSession: (hash: string) =>
    remove("shop-sessions", eq("tokenHash", hash)),
  lines: async (userId: string) =>
    (await all("cart-lines", eq("userId", userId))).map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    })),
  putLine: async (userId: string, productId: string, quantity: number) => {
    const key = userId + ":" + productId;
    const found = await one("cart-lines", eq("key", key));
    if (found)
      return (await getDB()).update({
        collection: "cart-lines",
        id: found.id,
        data: { quantity },
        overrideAccess: true,
      });
    try {
      return await create("cart-lines", { key, userId, productId, quantity });
    } catch (error) {
      const retry = await one("cart-lines", eq("key", key));
      if (!retry) throw error;
      return (await getDB()).update({
        collection: "cart-lines",
        id: retry.id,
        data: { quantity },
        overrideAccess: true,
      });
    }
  },
  deleteLine: (userId: string, productId: string) =>
    remove("cart-lines", eq("key", userId + ":" + productId)),
};
