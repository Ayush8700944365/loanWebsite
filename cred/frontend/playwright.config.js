import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const testMongoUri = process.env.TEST_MONGO_URI;
if (!testMongoUri) throw new Error('Real API Playwright suite requires TEST_MONGO_URI pointing to an isolated local MongoDB test service.');
const mongoUrl = new URL(testMongoUri);
if (!['127.0.0.1', 'localhost', '::1'].includes(mongoUrl.hostname)) throw new Error('Refusing to run browser integration tests against non-local MongoDB.');
const e2eDbName = 'realcred_pw_e2e_disposable';
mongoUrl.pathname = `/${e2eDbName}`;
const isolatedMongoUri = mongoUrl.toString();
process.env.PLAYWRIGHT_MONGO_URI = isolatedMongoUri;
process.env.PLAYWRIGHT_E2E_DB_NAME = e2eDbName;
const storagePath = path.join(os.tmpdir(), e2eDbName);

const backendPort = 5017;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node ../backend/src/server.js',
      url: `http://127.0.0.1:${backendPort}/api/health`,
      cwd: process.cwd(),
      env: {
        MONGO_URI: isolatedMongoUri,
        MONGO_DB_NAME: e2eDbName,
        JWT_SECRET: 'playwright-isolated-test-secret-2026',
        CLIENT_URL: 'http://127.0.0.1:4173',
        PORT: String(backendPort),
        NODE_ENV: 'test',
        DOCUMENT_STORAGE_PATH: storagePath,
        PARTNER_PII_ENCRYPTION_KEY: 'e'.repeat(64),
        PARTNER_PII_ENCRYPTION_KEYS: JSON.stringify({ e2e: 'e'.repeat(64) }),
        PARTNER_PII_ACTIVE_KEY_ID: 'e2e',
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: { VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}/api` },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
