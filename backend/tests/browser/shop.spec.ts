import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("real API shopping and account cart isolation", async ({ page }) => {
  const password = process.env.DEMO_PASSWORD!;
  expect(password).toBeTruthy();
  await page.goto("/");
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.getByRole("textbox", { name: "商品を検索" }).fill("マグ");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("link", { name: "セラミック マグの詳細を見る" }).click();
  await page.getByRole("button", { name: "カートに追加", exact: true }).click();
  await expect(page.getByRole("link", { name: "カート 1点" })).toBeVisible();
  await page.getByRole("link", { name: "アカウント", exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("メールアドレス").fill("alice@example.test");
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(
    page.getByText("Aliceさんとしてログインしています。"),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "カート 0点" })).toBeVisible();
  await page.goto("/#/products/prd-003");
  await page.getByRole("button", { name: "カートに追加", exact: true }).click();
  await expect(page.getByRole("link", { name: "カート 1点" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "カート 1点" })).toBeVisible();
  await page.getByRole("link", { name: "カート 1点" }).click();
  await page.getByRole("button", { name: "セラミック マグを削除" }).click();
  await expect(
    page.getByRole("heading", { name: "カートは空です" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "アカウント", exact: true }).click();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ログイン", exact: true }),
  ).toBeVisible();
});
test("Payload admin sign-in page", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("payload"));
  await page.goto("http://localhost:3002/admin/login");
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});
