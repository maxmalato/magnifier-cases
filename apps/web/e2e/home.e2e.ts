import AxeBuilder from '@axe-core/playwright'
import { appName } from '@magnifier-cases/content'
import { expect, test } from '@playwright/test'
import { settle } from './helpers.ts'

test.describe('página inicial', () => {
  test('mostra o nome do jogo vindo de appName', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(appName)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(appName)
  })

  test('segue o idioma do aparelho e deixa trocar', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Play on this device' })).toBeVisible()
    await page.getByRole('button', { name: 'Português' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
    await expect(page.getByRole('button', { name: 'Jogar neste aparelho' })).toBeVisible()
    await context.close()
  })

  test('lobby recusa equipe sem pessoa e apelidos repetidos', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
    await page.getByRole('button', { name: 'Montar o mistério' }).click()
    await expect(page.getByRole('alert')).toHaveText('Todo detetive precisa de um apelido.')
    await page.locator('.seat').nth(0).getByRole('button', { name: 'Bot', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(
      'Pelo menos 1 detetive precisa ser uma pessoa.',
    )
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`sem violações de acessibilidade no tema ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await settle(page)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
})
