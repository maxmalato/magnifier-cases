import { defineConfig, devices } from '@playwright/test'

// Caminho opcional de um Chromium já instalado (ex.: ambientes sem download de navegador).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const ONLINE = /(online|table)\.e2e\.ts/

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // idioma principal do jogo; o teste da página inicial cobre o inglês
    locale: 'pt-BR',
    trace: 'off',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'desktop', testIgnore: ONLINE, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testIgnore: ONLINE, use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet',
      testIgnore: ONLINE,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      // Salas online: vários navegadores contra o servidor local da Cloudflare, que serve o
      // site (apps/web/dist) e a API na mesma origem.
      name: 'online',
      testMatch: ONLINE,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:8787' },
    },
  ],
  webServer: [
    {
      command: 'pnpm build && pnpm preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      // Worker + Durable Objects no workerd, com prazos curtos para o teste não esperar 20 s
      // pelo bot. Usa o apps/web/dist do build acima.
      command:
        'pnpm --filter @magnifier-cases/server exec wrangler dev --port 8787 --ip 127.0.0.1 ' +
        '--var TAKEOVER_MS:1500 --var BOT_STEP_MS:60 --persist-to .wrangler/e2e',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: !process.env.CI,
      env: { WRANGLER_SEND_METRICS: 'false' },
      timeout: 120_000,
    },
  ],
})
