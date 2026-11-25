import { expect, test } from '@playwright/test'
import { accuse, mysteryOf, shortName, startGame, type Player } from './helpers.ts'

const TWO_PEOPLE: Player[] = [
  { kind: 'human', name: 'Ana' },
  { kind: 'human', name: 'Bruno' },
]

test.describe('partida em um aparelho', () => {
  test('vitória: acusar a dupla certa encerra o mistério na hora', async ({ page }) => {
    const { solution } = mysteryOf('apprentice', TWO_PEOPLE)
    await startGame(page, 'apprentice', TWO_PEOPLE)
    await expect(page.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
    await accuse(page, solution.culpritId, solution.hideoutId)
    await expect(page.getByText('Mistério resolvido')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      shortName(solution.culpritId),
    )
    await expect(page.getByText(/As pistas que levavam/)).toBeVisible()
    // novo mistério volta ao briefing; início volta à tela inicial
    await page.getByRole('button', { name: 'Voltar ao início' }).click()
    await expect(page.getByRole('button', { name: 'Jogar neste aparelho' })).toBeVisible()
  })

  test('erro de acusação: custa tempo, não diz qual metade e bloqueia a dupla', async ({
    page,
  }) => {
    const { solution, cast } = mysteryOf('apprentice', TWO_PEOPLE)
    const wrongPlace = cast.places.find((p) => p !== solution.hideoutId) as string
    await startGame(page, 'apprentice', TWO_PEOPLE)
    await accuse(page, solution.culpritId, wrongPlace)
    await expect(page.getByRole('heading', { name: 'Não foi essa dupla!' })).toBeVisible()
    await expect(page.getByText('Pode ser o suspeito, o lugar ou os dois.')).toBeVisible()
    await expect(page.getByText('O relógio avançou 30 min.')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()
    await expect(page.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
    // a mesma dupla não pode ser acusada de novo
    await page.getByRole('button', { name: 'Acusar agora' }).click()
    await page
      .locator('fieldset')
      .nth(0)
      .getByRole('button', { name: shortName(solution.culpritId), exact: true })
      .click()
    await page
      .locator('fieldset')
      .nth(1)
      .getByRole('button', { name: shortName(wrongPlace), exact: true })
      .click()
    await expect(page.getByText('Já acusaram essa dupla. Escolham outra.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Acusar / })).toBeDisabled()
  })

  test('tempo esgotado: revela a solução sem punição', async ({ page }) => {
    const { solution, cast, params } = mysteryOf('apprentice', TWO_PEOPLE)
    const wrong = cast.places.filter((p) => p !== solution.hideoutId)
    const suspects = cast.suspects.filter((s) => s !== solution.culpritId)
    await startGame(page, 'apprentice', TWO_PEOPLE)
    // no Aprendiz o erro custa 1 ação: errar actionsTotal vezes esgota o relógio
    for (let i = 0; i < params.actionsTotal; i++) {
      await accuse(
        page,
        suspects[i % suspects.length] as string,
        wrong[Math.floor(i / suspects.length)] as string,
      )
      if (i < params.actionsTotal - 1) await page.getByRole('button', { name: 'OK' }).click()
    }
    await expect(page.getByText('Tempo esgotado')).toBeVisible()
    await expect(page.getByText('A festa começou e o bolo não apareceu!')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      shortName(solution.culpritId),
    )
    await expect(page.getByText(/Sem problema/)).toBeVisible()
  })

  test('investigar e interrogar pedem confirmação e abrem a pista; o caderno guarda tudo', async ({
    page,
  }) => {
    const { cast } = mysteryOf('investigator', TWO_PEOPLE)
    await startGame(page, 'investigator', TWO_PEOPLE)
    // investigar exige estar num lugar
    await expect(page.getByRole('button', { name: /Vão a um lugar primeiro/ })).toBeDisabled()
    const place = shortName(cast.places[0] as string)
    await page.getByRole('button', { name: new RegExp(`^${place}`) }).click()
    await expect(page.getByRole('dialog')).toContainText('Isso gasta 30 min do relógio.')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: new RegExp(`^${place}`) }).click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText(/levou a equipe/)).toBeVisible()
    await page.getByRole('button', { name: /^Investigar / }).click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('O que ela mostra')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()
    // o lugar investigado não pode ser investigado de novo
    await expect(page.getByRole('button', { name: /Este lugar já foi investigado/ })).toBeDisabled()
    await page.getByRole('button', { name: 'Interrogar alguém' }).click()
    await page.locator('.item:not([disabled])').first().click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Interrogatório')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('button', { name: 'Abrir caderno' }).click()
    await expect(page.getByRole('heading', { name: 'Caderno do detetive' })).toBeVisible()
    await expect(page.locator('.clues li')).toHaveCount(2)
  })

  test('o bot joga sozinho a vez dele', async ({ page }) => {
    const players: Player[] = [{ kind: 'human', name: 'Ana' }, { kind: 'bot' }]
    await startGame(page, 'apprentice', players)
    await page.getByRole('button', { name: 'Interrogar alguém' }).click()
    await page.locator('.item:not([disabled])').first().click()
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
    // a vez volta para a Ana depois que o Bot 1 joga (fecha a tela de resultado, se houver)
    const ok = page.getByRole('button', { name: 'OK' })
    const anaTurn = page.getByRole('heading', { name: 'Vez de Ana' })
    await expect(
      ok.or(anaTurn).or(page.getByText(/Mistério resolvido|Tempo esgotado/)),
    ).toBeVisible()
    if (await ok.isVisible()) {
      await expect(page.getByText(/Bot 1/).first()).toBeVisible()
      await ok.click()
    }
    await expect(anaTurn.or(page.getByText(/Mistério resolvido|Tempo esgotado/))).toBeVisible()
  })
})
