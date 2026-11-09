import { getDB } from "./repository";
import { fixtures, demoUsers } from "../../shared/seed.mjs";
const p = await getDB();
if (process.argv.includes("--reset"))
  for (const collection of [
    "cart-lines",
    "shop-sessions",
    "shop-users",
    "products",
    "categories",
  ] as const)
    await p.delete({ collection, where: {}, overrideAccess: true });
async function insert(collection: any, data: any, key = "externalId") {
  const existing = await p.find({
    collection,
    where: { [key]: { equals: data[key] } },
    limit: 1,
    overrideAccess: true,
  });
  if (!existing.docs.length)
    await p.create({ collection, data, overrideAccess: true });
}
const { products, categories } = fixtures();
for (const { id, ...data } of categories)
  await insert("categories", { ...data, externalId: id });
for (const { id, createdAt, ...data } of products)
  await insert("products", { ...data, externalId: id, publishedAt: createdAt });
for (const { id, ...data } of demoUsers())
  await insert("shop-users", { ...data, externalId: id });
const email = process.env.PAYLOAD_ADMIN_EMAIL,
  password = process.env.PAYLOAD_ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error(
    "Payload admin credentials required (password >=12 characters)",
  );
await insert("admins", { email, password }, "email");
console.log("Payload demo data seeded.");
await p.destroy();
// Payload keeps background handles alive; all seed writes above have completed.
process.exit(0);
