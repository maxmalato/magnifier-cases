import { appName } from '@magnifier-cases/content'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  // Arquivos públicos vêm direto de assets/logo (fonte única dos ícones e da logo).
  publicDir: dir('../../assets/logo'),
  plugins: [
    // Caminho explícito: o Vitest roda a partir da raiz do monorepo.
    svelte({ configFile: dir('./svelte.config.js') }),
    // O nome público só existe na constante appName (packages/content): o index.html usa
    // %APP_NAME% e recebe o nome aqui.
    {
      name: 'app-name',
      transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', appName),
    },
    // Cabeçalhos de segurança e de cache para a Cloudflare (arquivo _headers na raiz do site).
    {
      name: 'cloudflare-headers',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '_headers',
          source: readFileSync(dir('./cloudflare/_headers'), 'utf8'),
        })
      },
    },
    // PWA: instalável e com o modo de um aparelho funcionando sem internet depois do primeiro
    // acesso. O registro é um script gerado pelo plugin (sem workbox-window no pacote do jogo).
    // As salas (/api) nunca vêm do cache: online e mesa precisam de conexão.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        id: '/',
        name: appName,
        short_name: appName,
        description:
          'Jogo cooperativo de dedução para toda a família. A cooperative deduction game for the whole family.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#2b2230',
        theme_color: '#2b2230',
        categories: ['games', 'entertainment', 'kids'],
        icons: [
          { src: 'logo-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo-icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'logo-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // tudo o que o jogo precisa fica no aparelho, inclusive as fontes
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,webmanifest}'],
        // a logo horizontal não aparece no jogo: fica fora do cache offline
        globIgnores: ['**/logo-horizontal*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // a versão nova assume na hora (o jogo não guarda partida no cache)
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  // Salas online (Etapa 4): /api (HTTP e WebSocket) vai para o servidor local
  // (`pnpm --filter @magnifier-cases/server dev`, porta 8787). Em produção, o próprio Worker
  // serve o site e a API.
  server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
  preview: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
  test: {
    // Testes de unidade ficam em src/. Os testes E2E (e2e/*.e2e.ts) rodam pelo Playwright.
    include: ['src/**/*.test.ts'],
  },
})
