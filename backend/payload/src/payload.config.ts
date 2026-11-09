import { buildConfig, type CollectionConfig, type Field } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dirname = path.dirname(fileURLToPath(import.meta.url));
const text = (name: string, extra: object = {}): Field => ({
  name,
  type: "text",
  required: true,
  ...extra,
});
const number = (name: string): Field => ({
  name,
  type: "number",
  required: true,
  min: 0,
});
const adminOnly = ({ req }: any) => Boolean(req.user?.collection === "admins");
const access = {
  read: adminOnly,
  create: adminOnly,
  update: adminOnly,
  delete: adminOnly,
};
const external = text("externalId", { unique: true, index: true });
const collections: CollectionConfig[] = [
  {
    slug: "admins",
    auth: true,
    access,
    fields: [],
    admin: { useAsTitle: "email" },
  },
  {
    slug: "categories",
    access,
    fields: [external, text("name"), text("label")],
    admin: { useAsTitle: "label" },
  },
  {
    slug: "products",
    access,
    admin: { useAsTitle: "name" },
    fields: [
      external,
      text("slug", { unique: true }),
      text("name"),
      text("subtitle"),
      text("description"),
      text("category"),
      number("price"),
      text("currency"),
      number("stock"),
      text("image"),
      text("imageAlt"),
      text("material"),
      text("dimensions"),
      text("color"),
      { name: "featured", type: "checkbox", defaultValue: false },
      { name: "publishedAt", type: "date", required: true },
    ],
  },
  {
    slug: "shop-users",
    access,
    admin: { useAsTitle: "name" },
    fields: [
      external,
      text("email", { required: false, unique: true }),
      text("name"),
      {
        name: "kind",
        type: "select",
        options: ["guest", "member"],
        required: true,
      },
      text("passwordHash", {
        required: false,
        hidden: true,
        access: { read: () => false },
      }),
    ],
  },
  {
    slug: "shop-sessions",
    access: { ...access, read: () => false },
    admin: { hidden: true },
    fields: [
      text("tokenHash", { unique: true }),
      text("userId"),
      { name: "expiresAt", type: "date", required: true },
    ],
  },
  {
    slug: "cart-lines",
    access,
    fields: [
      text("key", { unique: true }),
      text("userId", { index: true }),
      text("productId"),
      number("quantity"),
    ],
  },
];
export default buildConfig({
  secret: process.env.PAYLOAD_SECRET ?? "",
  admin: { user: "admins", importMap: { baseDir: dirname } },
  collections,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL },
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  cors: (
    process.env.ALLOWED_ORIGINS ?? "http://localhost:8081,http://localhost:3002"
  ).split(","),
  csrf: (
    process.env.ALLOWED_ORIGINS ?? "http://localhost:8081,http://localhost:3002"
  ).split(","),
});
