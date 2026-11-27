// axe-core em todas as telas do modo de um aparelho, nos temas claro e escuro.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { accuse, expectTargets, mysteryOf, settle, startGame, type Player } from './helpers.ts'

const PLAYERS: Player[] = [
  { kind: 'human', name: 'Ana' },
  { kind: 'human', name: 'Bruno' },
]

async function noViolations(page: Page, where: string) {
  await settle(page)
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

// ---------- Revisão de acessibilidade (Etapa 6) ----------

test('alvos de toque de pelo menos 44 px em todas as telas do modo local', async ({ page }) => {
  const { solution, cast } = mysteryOf('apprentice', PLAYERS)
  await page.goto('/?seed=42&botDelay=0')
  await expectTargets(page, 'início')
  await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
  await expectTargets(page, 'lobby')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await startGame(page, 'apprentice', PLAYERS)
  await expectTargets(page, 'vez')
  await page.getByRole('button', { name: 'Interrogar alguém' }).click()
  await expectTargets(page, 'escolher suspeito')
  await page.locator('.item:not([disabled])').first().click()
  await expectTargets(page, 'confirmação')
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expectTargets(page, 'pista')
  await page.getByRole('button', { name: 'OK' }).click()
  await page.getByRole('button', { name: 'Ir a outro lugar' }).click()
  await expectTargets(page, 'escolher lugar')
  await page.getByRole('button', { name: 'Voltar' }).click()
  await page.getByRole('button', { name: 'Abrir caderno' }).click()
  await expectTargets(page, 'caderno')
  await page.getByRole('button', { name: 'Voltar ao jogo' }).click()
  await page.getByRole('button', { name: 'Acusar agora' }).click()
  await expectTargets(page, 'acusação')
  await page.getByRole('button', { name: 'Voltar' }).click()
  const wrongPlace = cast.places.find((p) => p !== solution.hideoutId) as string
  await accuse(page, solution.culpritId, wrongPlace)
  await expectTargets(page, 'acusação errada')
  await page.getByRole('button', { name: 'OK' }).click()
  await accuse(page, solution.culpritId, solution.hideoutId)
  await expect(page.getByText('Mistério resolvido')).toBeVisible()
  await expectTargets(page, 'revelação')
})

/** Aperta Tab até o foco chegar no alvo (no máximo `max` vezes). */
async function tabTo(page: Page, target: ReturnType<Page['locator']>, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

test('uma jogada inteira só com o teclado', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'teclado físico: desktop')
  await startGame(page, 'apprentice', PLAYERS)
  await expect(page.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  const interrogate = page.getByRole('button', { name: 'Interrogar alguém' })
  await tabTo(page, interrogate)
  // o foco fica visível (contorno desenhado)
  expect(await interrogate.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await tabTo(page, page.locator('.item:not([disabled])').first())
  await page.keyboard.press('Enter')
  const confirm = page.getByRole('button', { name: 'Confirmar' })
  await tabTo(page, confirm)
  await page.keyboard.press('Enter')
  // a tela da pista leva o foco ao OK
  await expect(page.getByRole('button', { name: 'OK' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
})

test('o botão Som liga e desliga e fica lembrado no aparelho', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Som', exact: true })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Som', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  // também na partida (está no topo de todas as telas)
  await startGame(page, 'apprentice', PLAYERS)
  await expect(page.getByRole('button', { name: 'Som', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test.describe('reduzir movimento', () => {
  test.use({ reducedMotion: 'reduce' })

  test('as animações ficam desligadas', async ({ page }) => {
    await startGame(page, 'apprentice', PLAYERS)
    await page.getByRole('button', { name: 'Interrogar alguém' }).click()
    await page.locator('.item:not([disabled])').first().click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    for (const el of await page.locator('.anim-pop, .anim-stamp, .anim-tick').all()) {
      const { duration, delay } = await el.evaluate((node) => {
        const style = getComputedStyle(node)
        return { duration: style.animationDuration, delay: style.animationDelay }
      })
      expect(parseFloat(duration)).toBeLessThan(0.01)
      expect(parseFloat(delay)).toBe(0)
    }
  })
})

test.describe('tela estreita (320 px, zoom de 400%)', () => {
  test.use({ viewport: { width: 320, height: 640 } })

  test('as telas cabem sem rolagem lateral', async ({ page }) => {
    const noSideScroll = async (where: string) =>
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        where,
      ).toBeLessThanOrEqual(320)
    await page.goto('/?seed=42&botDelay=0')
    await noSideScroll('início')
    await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
    await noSideScroll('lobby')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByRole('button', { name: 'Criar sala online' }).click()
    await noSideScroll('criar sala')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await startGame(page, 'investigator', PLAYERS)
    await noSideScroll('vez')
    await page.getByRole('button', { name: 'Interrogar alguém' }).click()
    await noSideScroll('escolher suspeito')
    await page.locator('.item:not([disabled])').first().click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await noSideScroll('pista')
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('button', { name: 'Abrir caderno' }).click()
    await noSideScroll('caderno')
    await page.getByRole('button', { name: 'Voltar ao jogo' }).click()
    await page.getByRole('button', { name: 'Acusar agora' }).click()
    await noSideScroll('acusação')
  })
})
