module.exports = {
  testDir: ".",
  testMatch: "browser-audit.spec.js",
  timeout: 30000,
  use: { headless: true, channel: "chrome" },
  webServer: {
    command: "node tools/serve-local.mjs",
    cwd: "..",
    url: "http://127.0.0.1:4179/",
    reuseExistingServer: true,
    timeout: 30000,
  },
};
