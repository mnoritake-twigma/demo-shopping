import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const productDTO = (p: any) => ({ ...p, createdAt: p.createdAt.toISOString() });
export const repository = {
  health: async () => {
    await db.$queryRaw`SELECT 1`;
  },
  products: async () =>
    (await db.product.findMany({ orderBy: { id: "asc" } })).map(productDTO),
  product: async (id: string) => {
    const p = await db.product.findUnique({ where: { id } });
    return p ? productDTO(p) : null;
  },
  categories: () => db.category.findMany({ orderBy: { id: "asc" } }),
  user: (id: string) => db.user.findUnique({ where: { id } }),
  userByEmail: (email: string) => db.user.findUnique({ where: { email } }),
  createGuest: (id: string) =>
    db.user.create({ data: { id, name: "ゲスト", kind: "guest" } }),
  session: (tokenHash: string) =>
    db.session.findUnique({ where: { tokenHash } }),
  createSession: (tokenHash: string, userId: string, expiresAt: Date) =>
    db.session.create({ data: { tokenHash, userId, expiresAt } }),
  deleteSession: (tokenHash: string) =>
    db.session.deleteMany({ where: { tokenHash } }),
  lines: (userId: string) =>
    db.cartLine.findMany({
      where: { userId },
      select: { productId: true, quantity: true },
    }),
  putLine: (userId: string, productId: string, quantity: number) =>
    db.cartLine.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity },
      update: { quantity },
    }),
  deleteLine: (userId: string, productId: string) =>
    db.cartLine.deleteMany({ where: { userId, productId } }),
};
