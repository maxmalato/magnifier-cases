// Ajudantes dos testes de ponta a ponta. A solução é calculada com o próprio motor, com a mesma
// semente (?seed=) e os mesmos assentos da partida: o teste sabe a resposta sem olhar a tela.
import { partyCake } from '@magnifier-cases/content'
import { difficultyOf, newGame, type LevelId } from '@magnifier-cases/engine'
import { expect, type Page } from '@playwright/test'

export const SEED = 42

export interface Player {
  readonly kind: 'human' | 'bot'
  readonly name?: string
}

/** Solução e elenco do mistério que a tela vai mostrar. */
export function mysteryOf(level: LevelId, players: readonly Player[], seed = SEED) {
  const state = newGame({
    params: difficultyOf(level),
    theme: partyCake,
    seats: players.map((_, i) => `seat-${i + 1}`),
    seed,
  })
  return { solution: state.solution, cast: state.cast, params: state.params }
}

/** Do início até a tela da vez, com o nível e os detetives pedidos. */
export async function startGame(
  page: Page,
  level: LevelId,
  players: readonly Player[],
  options: { seed?: number; botDelay?: number } = {},
) {
  await page.goto(`/?seed=${options.seed ?? SEED}&botDelay=${options.botDelay ?? 0}`)
  await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
  // o lobby começa com 2 detetives (pessoa e bot)
  for (let i = 2; i < players.length; i++)
    await page.getByRole('button', { name: 'Adicionar detetive' }).click()
  const seats = page.locator('.seat')
  for (const [i, player] of players.entries()) {
    const seat = seats.nth(i)
    await seat
      .getByRole('button', { name: player.kind === 'human' ? 'Pessoa' : 'Bot', exact: true })
      .click()
    if (player.kind === 'human')
      await seat.getByLabel('Apelido').fill(player.name ?? `Pessoa ${i + 1}`)
  }
  await page.getByRole('radio', { name: new RegExp(levelName[level]) }).check()
  await page.getByRole('button', { name: 'Montar o mistério' }).click()
  await expect(page.getByRole('heading', { name: 'O bolo da festa sumiu!' })).toBeVisible()
  await page.getByRole('button', { name: 'Começar a investigação' }).click()
}

export const levelName: Record<LevelId, string> = {
  apprentice: 'Aprendiz',
  investigator: 'Investigador',
  expert: 'Perito',
  legend: 'Lenda',
}

/** Nome curto em PT-BR (o que aparece nos botões da acusação). */
export function shortName(id: string): string {
  const names: Record<string, string> = {
    'baker-ze': 'Seu Zé',
    'miss-lucia': 'Dona Lúcia',
    'dog-biscuit': 'Biscoito',
    'mail-tiao': 'Tião',
    'teacher-rita': 'Profª Rita',
    'cat-cleo': 'Cleo',
    'gardener-nando': 'Vovô Nando',
    'skater-bia': 'Bia',
    'vet-caio': 'Dr. Caio',
    'parrot-pipa': 'Pipa',
    bakery: 'Padaria',
    school: 'Escola',
    market: 'Mercado',
    'post-office': 'Correio',
    'lucia-backyard': 'Quintal da Lúcia',
    bandstand: 'Coreto',
    library: 'Biblioteca',
    fountain: 'Chafariz',
    'ball-field': 'Campinho',
    fair: 'Feira',
  }
  return names[id] ?? id
}

/** Na tela de acusação, escolhe a dupla e acusa. */
export async function accuse(page: Page, suspectId: string, placeId: string) {
  await page.getByRole('button', { name: 'Acusar agora' }).click()
  const [suspectSet, placeSet] = [page.locator('fieldset').nth(0), page.locator('fieldset').nth(1)]
  await suspectSet.getByRole('button', { name: shortName(suspectId), exact: true }).click()
  await placeSet.getByRole('button', { name: shortName(placeId), exact: true }).click()
  await page.getByRole('button', { name: /^Acusar / }).click()
}

/**
 * Espera as animações de entrada terminarem (as que se repetem para sempre, como o anel de
 * quem joga, não contam). O axe mede o contraste do estado final, não do meio da animação.
 */
export async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  )
}

/** Controles visíveis menores que 44 × 44 px (rádio e caixa contam pelo rótulo clicável). */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector =
      'button, a[href], select, input:not([type="radio"]):not([type="checkbox"]), label:has(> input[type="radio"]), label:has(> input[type="checkbox"])'
    const problems: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (el.closest('dialog:not([open])')) continue
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (rect.width === 0 || style.visibility === 'hidden') continue
      if (rect.width < 43.5 || rect.height < 43.5) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim()
        problems.push(`${name.slice(0, 40)} (${Math.round(rect.width)}×${Math.round(rect.height)})`)
      }
    }
    return problems
  })
}

export async function expectTargets(page: Page, where: string) {
  expect(await smallTargets(page), where).toEqual([])
}

/** Acusa uma dupla diferente a cada volta. "skipped": a dupla já tinha sido acusada. */
async function accuseRound(player: Page, round: number): Promise<'accused' | 'skipped' | false> {
  const quick = { timeout: 3000 }
  try {
    await player.getByRole('button', { name: 'Acusar agora' }).click(quick)
    const suspects = player.locator('fieldset').nth(0).locator('.opt:not([disabled])')
    const places = player.locator('fieldset').nth(1).locator('.opt:not([disabled])')
    await suspects.first().waitFor(quick)
    const n = await suspects.count()
    await suspects.nth(round % n).click(quick)
    await places.nth(Math.floor(round / n) % (await places.count())).click(quick)
    const accuse = player.getByRole('button', { name: /^Acusar / })
    if (await accuse.isEnabled()) {
      await accuse.click(quick)
      return 'accused'
    }
    await player.getByRole('button', { name: 'Voltar' }).click(quick)
    return 'skipped'
  } catch {
    // outra tela cobriu a da vez no meio (o resultado da jogada anterior): volta e tenta de novo
    const back = player.getByRole('button', { name: 'Voltar' })
    if (await back.isVisible()) await back.click().catch(() => undefined)
    return false
  }
}

/**
 * Online e mesa: quem tem a vez acusa uma dupla diferente até a partida acabar. Quem joga é
 * achado pela própria tela (só quem tem a vez vê "A equipe está…"), nunca pela tela de outra
 * pessoa, que pode estar atrasada.
 */
export async function accuseUntilEnd(players: readonly Page[], ended: () => Promise<boolean>) {
  const end = /Mistério resolvido|Tempo esgotado/
  let round = 0
  for (let tries = 0; tries < 400 && !(await ended()); tries++) {
    for (const page of players) {
      const ok = page.getByRole('button', { name: 'OK' })
      if ((await ok.count()) > 0) await ok.click().catch(() => undefined)
    }
    let player: Page | null = null
    for (const page of players) {
      if (await page.getByText(/^A equipe está /).isVisible()) player = page
    }
    if (!player) {
      await players[0]?.waitForTimeout(100)
      continue
    }
    const result = await accuseRound(player, round)
    if (result) round++
    if (result === 'accused') {
      // espera a resposta da sala: a tela de erro (OK) ou a revelação
      await expect(player.getByRole('button', { name: 'OK' }).or(player.getByText(end)).first())
        .toBeVisible({ timeout: 10_000 })
        .catch(() => undefined)
    }
  }
}
