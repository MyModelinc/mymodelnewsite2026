const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

// Serve the repo root (parent of this e2e/ folder) as a static site, exactly like
// production. WebKit is the engine that matters: it is what mobile Safari (and every
// iOS browser, including "Chrome" on iPhone) actually runs, so it reproduces the
// class of failure that blanked the pages.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:8080' },
  webServer: {
    command: 'python3 -m http.server 8080',
    cwd: path.resolve(__dirname, '..'),
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    { name: 'Desktop WebKit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
});
