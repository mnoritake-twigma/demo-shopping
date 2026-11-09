import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "backend/tests/browser",
  fullyParallel: false,
  workers: 1,
  use: { trace: "retain-on-failure" },
  projects: ["native", "payload"].flatMap((backend) =>
    ["desktop", "mobile"].map((device) => ({
      name: backend + "-" + device,
      use: {
        ...(device === "mobile"
          ? devices["iPhone 13"]
          : devices["Desktop Chrome"]),
        defaultBrowserType: "chromium" as const,
        baseURL: backend === "native"
          ? (process.env.NATIVE_BROWSER_URL ?? "http://localhost:8080")
          : (process.env.PAYLOAD_BROWSER_URL ?? "http://localhost:8081"),
      },
    })),
  ),
  reporter: "list",
});
