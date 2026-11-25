import { appName } from '@magnifier-cases/content'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
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
    // Etapa 5: vite-plugin-pwa (instalável e offline no modo local).
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
