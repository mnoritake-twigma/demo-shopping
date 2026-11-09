import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const endpoints = [
  ["native", "http://localhost:8080/api"],
  ["payload", "http://localhost:8081/api"],
];
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error("Load .env.docker before running tests");
function client(base) {
  let cookie = "";
  return async (path, method = "GET", body, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const next = response.headers.get("set-cookie");
    if (next) cookie = next.split(";")[0];
    return {
      status: response.status,
      body: await response.json(),
      cookie: next,
    };
  };
}
const call = async (c, path, method, body, status = 200, headers) => {
  const r = await c(path, method, body, headers);
  assert.equal(r.status, status, JSON.stringify(r.body));
  return r.body;
};
for (const [name, base] of endpoints)
  test(name + " API: contract, auth, ownership, persistence", async (t) => {
    const guest = client(base),
      alice = client(base),
      bob = client(base);
    await t.test("public queries and invalid inputs", async () => {
      const data = await call(guest, "/products");
      assert.equal(data.totalDocs, 8);
      assert.equal(data.docs.length, 8);
      assert.equal((await call(guest, "/products?q=マグ")).totalDocs, 1);
      assert.equal(
        (await call(guest, "/products?category=living")).totalDocs,
        2,
      );
      const prices = (await call(guest, "/products?sort=price")).docs.map(
        (p) => p.price,
      );
      assert.deepEqual(
        prices,
        [...prices].sort((a, b) => a - b),
      );
      assert.equal(
        (await call(guest, "/products?limit=2&page=2")).docs.length,
        2,
      );
      for (const query of [
        "limit=0",
        "page=-1",
        "sort=bad",
        "inStock=bad",
        "maxPrice=-1",
      ])
        await call(guest, "/products?" + query, "GET", undefined, 400);
      await call(guest, "/products/missing", "GET", undefined, 404);
      await call(guest, "/cart", "GET", undefined, 401);
    });
    await t.test("guest session cookie and unauthorized origins", async () => {
      const r = await guest("/session", "POST", {});
      assert.equal(r.status, 200);
      assert.match(r.cookie, /HttpOnly/);
      assert.match(r.cookie, /SameSite=Lax/);
      await call(guest, "/cart/items/prd-003", "PUT", { quantity: 1 });
      await call(guest, "/cart/items/prd-003", "PUT", { quantity: 2 }, 403, {
        Origin: "https://untrusted.example",
      });
      await call(
        guest,
        "/cart/items/prd-003",
        "PUT",
        { quantity: 2, userId: "usr-alice" },
        400,
      );
      await call(
        guest,
        "/cart/items/prd-003",
        "PUT",
        { quantity: 999999 },
        409,
      );
      await call(guest, "/cart/items/prd-006", "PUT", { quantity: 1 }, 409);
      assert.equal((await call(guest, "/cart")).items[0].quantity, 1);
    });
    await t.test(
      "member carts remain separate and use server pricing",
      async () => {
        await call(
          alice,
          "/auth/login",
          "POST",
          { email: "alice@example.test", password: "wrong" },
          401,
        );
        for (const [c, email] of [
          [alice, "alice@example.test"],
          [bob, "bob@example.test"],
        ]) {
          await call(c, "/auth/login", "POST", { email, password });
          for (const line of (await call(c, "/cart")).items)
            await call(c, "/cart/items/" + line.productId, "DELETE");
        }
        await call(alice, "/cart/items/prd-003", "PUT", { quantity: 2 });
        assert.equal((await call(bob, "/cart")).items.length, 0);
        await call(bob, "/cart/items/prd-003", "PUT", { quantity: 1 });
        const cart = await call(alice, "/cart");
        assert.equal(cart.subtotal, 4800);
        assert.equal(cart.shipping, 550);
        assert.equal(cart.total, 5350);
        await call(
          alice,
          "/cart/items/prd-003",
          "PUT",
          { quantity: 1, price: 1 },
          400,
        );
        await Promise.all([
          call(alice, "/cart/items/prd-001", "PUT", { quantity: 1 }),
          call(alice, "/cart/items/prd-002", "PUT", { quantity: 1 }),
        ]);
        assert.equal((await call(alice, "/cart")).items.length, 3);
        await call(alice, "/cart/items/prd-001", "DELETE");
        await call(alice, "/cart/items/prd-002", "DELETE");
        await call(alice, "/auth/logout", "POST", {});
        await call(alice, "/cart", "GET", undefined, 401);
        await call(alice, "/auth/login", "POST", {
          email: "alice@example.test",
          password,
        });
        assert.equal((await call(alice, "/cart")).total, 5350);
      },
    );
    if (process.env.RESTART_TEST === "1")
      await t.test(
        "API + database restart preserves member cart and session",
        async () => {
          const api = name === "native" ? "native-api" : "payload-api",
            db = name === "native" ? "native-db" : "payload-db";
          execFileSync(
            "docker",
            [
              "compose",
              "--env-file",
              ".env.docker",
              "--profile",
              "payload",
              "restart",
              db,
              api,
            ],
            { stdio: "pipe" },
          );
          let ok = false;
          for (let i = 0; i < 60; i++) {
            try {
              const r = await alice("/health");
              if (r.status === 200) {
                ok = true;
                break;
              }
            } catch {}
            await new Promise((r) => setTimeout(r, 1000));
          }
          assert.ok(ok, "service recovers");
          assert.equal((await call(alice, "/cart")).total, 5350);
        },
      );
    // Leave seeded members with empty carts, so the demo starts cleanly.
    await call(alice, "/cart/items/prd-003", "DELETE");
    await call(bob, "/cart/items/prd-003", "DELETE");
  });
test("same product DTOs, separate Payload administration and data", async () => {
  const native = client(endpoints[0][1]),
    validation = client(endpoints[1][1]);
  assert.deepEqual(
    await call(native, "/products?sort=price"),
    await call(validation, "/products?sort=price"),
  );
  assert.deepEqual(
    await call(native, "/categories"),
    await call(validation, "/categories"),
  );
  const root = "http://localhost:3002/api";
  const anon = await fetch(root + "/shop-users");
  assert.ok([401, 403].includes(anon.status));
  const login = await fetch(root + "/admins/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.PAYLOAD_ADMIN_EMAIL,
      password: process.env.PAYLOAD_ADMIN_PASSWORD,
    }),
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const headers = {
    Authorization: "JWT " + token,
    "Content-Type": "application/json",
  };
  const products = await (
    await fetch(root + "/products?where[externalId][equals]=prd-003", {
      headers,
    })
  ).json();
  const p = products.docs[0];
  try {
    const updated = await fetch(root + "/products/" + p.id, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ stock: p.stock + 1 }),
    });
    assert.equal(updated.status, 200);
    assert.equal(
      (await call(validation, "/products/prd-003")).stock,
      p.stock + 1,
    );
    assert.equal((await call(native, "/products/prd-003")).stock, p.stock);
  } finally {
    const restored = await fetch(root + "/products/" + p.id, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ stock: p.stock }),
    });
    assert.equal(restored.status, 200);
  }
});
