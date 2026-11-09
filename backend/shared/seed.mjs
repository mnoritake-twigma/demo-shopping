import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "./shop.mjs";
export function fixtures() {
  return {
    products: JSON.parse(
      readFileSync(
        resolve(process.env.SEED_DIR ?? "../../docs", "seed-products.json"),
      ),
    ),
    categories: JSON.parse(
      readFileSync(
        resolve(process.env.SEED_DIR ?? "../../docs", "seed-categories.json"),
      ),
    ),
  };
}
export function demoUsers() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("DEMO_PASSWORD must contain at least 12 characters");
  return ["alice", "bob"].map((name) => ({
    id: "usr-" + name,
    email: `${name}@example.test`,
    name: name === "alice" ? "Alice" : "Bob",
    kind: "member",
    passwordHash: hashPassword(password),
  }));
}
