import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "node node_modules/next/dist/bin/next dev";

export default defineConfig({
  testDir: "./tests/e2e",
  // Generous timeouts: against `npm run dev` the first hit to a dynamic route
  // triggers on-demand compilation (~10s cold), which would otherwise flake.
  timeout: 60000,
  expect: {
    timeout: 20000
  },
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
