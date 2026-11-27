// Publicação (Etapa 7): o site servido pelo Worker (wrangler dev, como na Cloudflare) traz os
// cabeçalhos de segurança, e o jogo roda inteiro sob a política de conteúdo (CSP), sem nada
// bloqueado. Origem: village-flood, apps/web/e2e/security.e2e.ts.
import { expect, test } from '@playwright/test'
import { startGame } from './helpers.ts'

test.use({ locale: 'pt-BR' })

test('cabeçalhos de segurança e de cache', async ({ request }) => {
  const home = await request.get('/')
  const headers = home.headers()
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('no-referrer')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect((await request.get('/sw.js')).headers()['cache-control']).toBe('no-cache')
  // o arquivo de configuração não é servido como arquivo
  expect(await (await request.get('/_headers')).text()).not.toContain('Content-Security-Policy')
  // a API responde e não expõe nada além do protocolo
  expect(await (await request.get('/api/health')).json()).toEqual({
    ok: true,
    protocol: 'magnifier-cases/v1',
  })
})

test('o jogo roda sob a CSP: um aparelho, sala online, QR code, sons e service worker', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(String(e)))

  await startGame(page, 'apprentice', [{ kind: 'human', name: 'Ana' }, { kind: 'bot' }])
  await page.getByRole('button', { name: 'Interrogar alguém' }).click()
  await page.locator('.item:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('O que ela mostra')).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Criar sala online' }).click()
  await page.getByLabel('Apelido').fill('Ana')
  await page.getByRole('button', { name: 'Criar sala', exact: true }).click()
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar bot' }).click()
  await page.getByRole('button', { name: 'Começar a partida' }).click()
  await expect(page.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)

  expect(problems).toEqual([])
})
