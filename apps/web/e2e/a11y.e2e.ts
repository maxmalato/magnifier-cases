// axe-core em todas as telas do modo de um aparelho, nos temas claro e escuro.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { accuse, mysteryOf, startGame, type Player } from './helpers.ts'

const PLAYERS: Player[] = [
  { kind: 'human', name: 'Ana' },
  { kind: 'human', name: 'Bruno' },
]

async function noViolations(page: Page, where: string) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, where).toEqual([])
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`telas sem violações de acessibilidade (tema ${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    const { solution, cast } = mysteryOf('investigator', PLAYERS)
    await page.goto('/?seed=42&botDelay=0')
    await noViolations(page, 'início')
    await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
    await noViolations(page, 'lobby')
    await page.getByRole('button', { name: 'Voltar' }).click()

    await startGame(page, 'investigator', PLAYERS)
    await noViolations(page, 'vez')
    await page.getByRole('button', { name: 'Interrogar alguém' }).click()
    await noViolations(page, 'escolher suspeito')
    await page.locator('.item:not([disabled])').first().click()
    await noViolations(page, 'confirmação')
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await noViolations(page, 'pista')
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('button', { name: 'Ir a outro lugar' }).click()
    await noViolations(page, 'escolher lugar')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByRole('button', { name: 'Abrir caderno' }).click()
    await noViolations(page, 'caderno')
    await page.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await page.getByRole('button', { name: 'Acusar agora' }).click()
    await noViolations(page, 'acusação')
    await page.getByRole('button', { name: 'Voltar' }).click()
    const wrongPlace = cast.places.find((p) => p !== solution.hideoutId) as string
    await accuse(page, solution.culpritId, wrongPlace)
    await noViolations(page, 'acusação errada')
    await page.getByRole('button', { name: 'OK' }).click()
    await accuse(page, solution.culpritId, solution.hideoutId)
    await expect(page.getByText('Mistério resolvido')).toBeVisible()
    await noViolations(page, 'revelação')
  })
}
