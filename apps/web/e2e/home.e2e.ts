import AxeBuilder from '@axe-core/playwright'
import { appName } from '@magnifier-cases/content'
import { expect, test } from '@playwright/test'

test.describe('página inicial (Etapa 0)', () => {
  test('mostra o nome do jogo vindo de appName', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(appName)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(appName)
  })

  test('segue o idioma do aparelho', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByText('Under construction. Come back soon!')).toBeVisible()
    await context.close()
  })

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`sem violações de acessibilidade no tema ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
})
