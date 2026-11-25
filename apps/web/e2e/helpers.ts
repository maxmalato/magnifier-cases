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
