import { fixtures, demoUsers } from "../../shared/seed.mjs";
import { db } from "./repository.js";
const { products, categories } = fixtures();
if (process.argv.includes("--reset")) {
  await db.$transaction([
    db.cartLine.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
  ]);
}
for (const c of categories)
  await db.category.upsert({ where: { id: c.id }, create: c, update: {} });
for (const p of products)
  await db.product.upsert({
    where: { id: p.id },
    create: { ...p, createdAt: new Date(p.createdAt) },
    update: {},
  });
for (const user of demoUsers())
  await db.user.upsert({ where: { id: user.id }, create: user, update: {} });
console.log(
  "Existing backend seeded (existing records preserved unless --reset).",
);
await db.$disconnect();
