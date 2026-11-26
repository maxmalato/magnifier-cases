// PWA (Etapa 5): instalável (manifesto com nome e ícones) e com o modo de um aparelho
// funcionando sem internet depois do primeiro acesso.
import { appName } from '@magnifier-cases/content'
import { expect, test } from '@playwright/test'
import { startGame } from './helpers.ts'

test('manifesto instalável com o nome do jogo e os ícones', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const manifest = (await (await request.get(`/${href?.replace(/^\//, '')}`)).json()) as {
    name: string
    display: string
    icons: { sizes: string; purpose?: string }[]
  }
  expect(manifest.name).toBe(appName)
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
})

test('o modo de um aparelho funciona sem internet depois do primeiro acesso', async ({
  page,
  context,
}) => {
  await page.goto('/')
  // espera o service worker assumir a página (guarda tudo no aparelho)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      )
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(appName)
  await startGame(page, 'apprentice', [
    { kind: 'human', name: 'Ana' },
    { kind: 'human', name: 'Bruno' },
  ])
  await expect(page.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  await context.setOffline(false)
})
