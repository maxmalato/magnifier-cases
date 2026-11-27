// "Como jogar": partida de treino guiada, com mistério fixo. Segue o roteiro tocando só no que
// está destacado, confere a recusa fora do roteiro e a volta para a partida em andamento.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { expectTargets, settle, startGame } from './helpers.ts'

test.use({ locale: 'pt-BR' })

const coach = (page: Page) => page.locator('.coach')
const guided = (page: Page, selector: string) => page.locator(`${selector}.guided`)

async function noViolations(page: Page, where: string) {
  await settle(page)
  expect((await new AxeBuilder({ page }).analyze()).violations, where).toEqual([])
}

/** Um interrogatório do roteiro: opção destacada, suspeito destacado, confirmar e OK. */
async function interrogate(page: Page) {
  await guided(page, '.option').click()
  await guided(page, '.item').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await coach(page).getByRole('button', { name: 'OK' }).click()
}

test('o treino ensina uma partida inteira, passo a passo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como jogar' }).click()
  await expect(coach(page).getByText('Passo 1 de 14')).toBeVisible()
  await expect(coach(page).getByText('Toda pista é verdadeira.', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vez de Detetive' })).toBeVisible()
  // durante o treino, o botão "Como jogar" some e não há "Encerrar partida"
  await expect(page.getByRole('button', { name: 'Como jogar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Encerrar partida' })).toHaveCount(0)
  await coach(page).getByRole('button', { name: 'Continuar' }).click()
  await expect(
    coach(page).getByText('Cada ação gasta 30 min do relógio.', { exact: false }),
  ).toBeVisible()
  await coach(page).getByRole('button', { name: 'Continuar' }).click()

  await expect(coach(page).getByText('Vamos começar!', { exact: false })).toBeVisible()
  await interrogate(page)
  await interrogate(page)
  await interrogate(page)

  // caderno: abrir, voltar e continuar
  await expect(coach(page).getByText('Toquem em Abrir caderno', { exact: false })).toBeVisible()
  await guided(page, '.btn').filter({ hasText: 'Abrir caderno' }).click()
  await guided(page, '.btn').filter({ hasText: 'Voltar ao jogo' }).click()
  await coach(page).getByRole('button', { name: 'Continuar' }).click()

  // ir ao lugar da pista e investigar
  await guided(page, '.option').click()
  await guided(page, '.tile').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await expect(coach(page).getByText('Chegaram!', { exact: false })).toBeVisible()
  await guided(page, '.option').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await coach(page).getByRole('button', { name: 'OK' }).click()

  // acusar a única dupla que sobrou
  await expect(coach(page).getByText('Só sobrou uma dupla', { exact: false })).toBeVisible()
  await guided(page, '.btn').filter({ hasText: 'Acusar agora' }).click()
  await guided(page, '.opt').nth(0).click()
  await guided(page, '.opt').nth(1).click()
  await guided(page, '.btn')
    .filter({ hasText: /^Acusar / })
    .click()

  await expect(page.locator('main').getByText('Mistério resolvido', { exact: true })).toBeVisible()
  await expect(coach(page).getByText('Passo 14 de 14')).toBeVisible()
  await coach(page).getByRole('button', { name: 'Sair do treino' }).click()
  await expect(page.getByRole('button', { name: 'Jogar neste aparelho' })).toBeVisible()
})

test('fora do roteiro, o treino avisa e não gasta tempo', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Como jogar' }).click()
  await coach(page).getByRole('button', { name: 'Continuar' }).click()
  await coach(page).getByRole('button', { name: 'Continuar' }).click()
  await guided(page, '.option').click()
  // escolhe um suspeito que não está destacado
  await page.locator('.item:not(.guided):not([disabled])').first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
  await expect(coach(page).getByText('No treino, sigam o botão destacado.')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '12:30' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Vez de Detetive' })).toBeVisible()
})

test('abrir o treino no meio de uma partida e sair volta para ela', async ({ page }) => {
  await startGame(page, 'apprentice', [
    { kind: 'human', name: 'Ana' },
    { kind: 'human', name: 'Bruno' },
  ])
  await page.getByRole('button', { name: 'Interrogar alguém' }).click()
  await page.locator('.item:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
  await page.getByRole('button', { name: 'Como jogar' }).click()
  await expect(page.getByRole('heading', { name: 'Vez de Detetive' })).toBeVisible()
  await coach(page).getByRole('button', { name: 'Sair do treino' }).click()
  await expect(page.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '13:00' })).toBeVisible()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`treino sem violações de acessibilidade e com alvos de 44 px (tema ${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    await page.getByRole('button', { name: 'Como jogar' }).click()
    await noViolations(page, 'treino: começo')
    await expectTargets(page, 'treino: começo')
    await coach(page).getByRole('button', { name: 'Continuar' }).click()
    await coach(page).getByRole('button', { name: 'Continuar' }).click()
    await guided(page, '.option').click()
    await noViolations(page, 'treino: escolher suspeito')
    await guided(page, '.item').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click()
    await noViolations(page, 'treino: pista')
    await expectTargets(page, 'treino: pista')
  })
}
