// Salas online com dois navegadores (Etapa 4): criar, entrar, opinar, jogar até o fim,
// desconexão com bot assumindo e volta do jogador.
import AxeBuilder from '@axe-core/playwright'
import { roomParams } from '@magnifier-cases/protocol'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { expectTargets, settle } from './helpers.ts'

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Criar sala online' }).click()
  await page.getByLabel('Apelido').fill(name)
  await page.getByRole('button', { name: 'Criar sala', exact: true }).click()
  const code = page.locator('.code')
  await expect(code).toBeVisible()
  return (await code.innerText()).replace('·', '')
}

async function joinRoom(browser: Browser, code: string, name: string) {
  const context = await browser.newContext({ locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto(`/?sala=${code}`)
  await page.getByLabel('Apelido').fill(name)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByText(`Esperando Ana começar a partida.`)).toBeVisible()
  return { context, page }
}

/** Joga a vez de quem estiver nela: interroga o primeiro suspeito disponível. */
async function interrogate(page: Page) {
  await page.getByRole('button', { name: 'Interrogar alguém' }).click()
  await page.locator('.item:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await page.getByRole('button', { name: 'OK' }).click()
}

test('criar, entrar, opinar e jogar até o fim', async ({ page: ana, browser }) => {
  test.setTimeout(120_000)
  const code = await createRoom(ana, 'Ana')
  const { page: bruno, context } = await joinRoom(browser, code, 'Bruno')
  await expect(ana.getByText('Bruno')).toBeVisible()
  await ana.getByRole('button', { name: 'Começar a partida' }).click()

  await expect(ana.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  await expect(bruno.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  // Bruno opina fora da vez; Ana vê a sugestão
  await expect(
    bruno.getByText('Vez de Ana. Toquem numa opção para dar uma sugestão.'),
  ).toBeVisible()
  await bruno.getByRole('button', { name: /Ir a outro lugar/ }).click()
  await expect(ana.getByText('Bruno: Ir a outro lugar')).toBeVisible()

  // Ana joga; os dois veem a pista; a sugestão some e a vez passa
  await ana.getByRole('button', { name: 'Interrogar alguém' }).click()
  await ana.locator('.item:not([disabled])').first().click()
  await ana.getByRole('button', { name: 'Confirmar' }).click()
  await expect(ana.getByText('O que ela mostra')).toBeVisible()
  await expect(bruno.getByText('O que ela mostra')).toBeVisible()
  await ana.getByRole('button', { name: 'OK' }).click()
  await bruno.getByRole('button', { name: 'OK' }).click()
  await expect(bruno.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
  await expect(ana.getByText('Bruno: Ir a outro lugar')).toHaveCount(0)

  // joga até o fim: quem tem a vez acusa uma dupla diferente até vencer ou o tempo acabar
  const end = /Mistério resolvido|Tempo esgotado/
  for (let round = 0; round < 40; round++) {
    if ((await ana.getByText(end).count()) > 0) break
    for (const page of [ana, bruno]) {
      const ok = page.getByRole('button', { name: 'OK' })
      if ((await ok.count()) > 0) await ok.click()
    }
    const heading = await ana.getByRole('heading', { level: 1 }).innerText()
    if (!heading.startsWith('Vez de')) continue
    const player = heading === 'Vez de Ana' ? ana : bruno
    await player.getByRole('button', { name: 'Acusar agora' }).click()
    const suspects = player.locator('fieldset').nth(0).locator('.opt:not([disabled])')
    const places = player.locator('fieldset').nth(1).locator('.opt:not([disabled])')
    const n = await suspects.count()
    await suspects.nth(round % n).click()
    await places.nth(Math.floor(round / n) % (await places.count())).click()
    const accuse = player.getByRole('button', { name: /^Acusar / })
    if (await accuse.isEnabled()) await accuse.click()
    else await player.getByRole('button', { name: 'Voltar' }).click()
    // espera a jogada chegar aos dois aparelhos (tela de erro ou revelação)
    await expect(
      ana
        .getByText(end)
        .or(ana.getByRole('button', { name: 'OK' }))
        .or(ana.getByRole('heading', { name: /Vez de/ })),
    ).toBeVisible()
  }
  await expect(ana.getByText(end)).toBeVisible()
  await expect(bruno.getByText(end)).toBeVisible()
  // só quem comanda a sala pede um novo mistério
  await expect(bruno.getByText('Esperando Ana pedir um novo mistério.')).toBeVisible()
  await ana.getByRole('button', { name: 'Novo mistério' }).click()
  await expect(bruno.getByText('Esperando Ana começar a partida.')).toBeVisible()
  await context.close()
})

test('desconexão: o bot assume e a pessoa volta pelo token', async ({ page: ana, browser }) => {
  test.setTimeout(90_000)
  const code = await createRoom(ana, 'Ana')
  const { page: bruno, context } = await joinRoom(browser, code, 'Bruno')
  await ana.getByRole('button', { name: 'Começar a partida' }).click()
  await interrogate(ana)
  // Bruno também viu a pista; fecha a tela dele e vê a própria vez
  await bruno.getByRole('button', { name: 'OK' }).click()
  await expect(bruno.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()

  // Bruno some na própria vez: aviso, e o bot assume depois do prazo (1,5 s no teste)
  await bruno.close()
  await expect(ana.getByText('Bruno desconectou.')).toBeVisible()
  await expect(ana.getByText('O bot assumiu a vez de Bruno.')).toBeVisible({ timeout: 10_000 })
  // o bot jogou a vez do Bruno; se abriu uma pista, a Ana fecha a tela dela
  const anaTurn = ana.getByRole('heading', { name: 'Vez de Ana' })
  const anaOk = ana.getByRole('button', { name: 'OK' })
  await expect(anaTurn.or(anaOk)).toBeVisible({ timeout: 10_000 })
  if (await anaOk.isVisible()) await anaOk.click()
  await expect(anaTurn).toBeVisible()

  // Bruno volta pelo token guardado no aparelho (mesmo navegador)
  const back = await context.newPage()
  await back.goto('/')
  await back.getByRole('button', { name: /Voltar para a sala/ }).click()
  await expect(back.getByRole('heading', { name: /Vez de/ })).toBeVisible()
  await expect(ana.getByText('Bruno voltou e joga na próxima vez.')).toBeVisible()
  const ok = ana.getByRole('button', { name: 'OK' })
  if (await ok.isVisible()) await ok.click()
  await interrogate(ana)
  // Bruno, de volta, também vê a pista da Ana e depois retoma a própria vez
  await back.getByRole('button', { name: 'OK' }).click()
  await expect(back.getByRole('heading', { name: 'Vez de Bruno' })).toBeVisible()
  await expect(back.getByRole('button', { name: 'Interrogar alguém' })).toBeEnabled()
  await expect(ana.getByText('Bruno voltou!')).toBeVisible()
  await context.close()
})

test('opinar tem limite visível: a contagem cai e, no fim, os botões ficam bloqueados com o motivo', async ({
  page: ana,
  browser,
}) => {
  const limit = roomParams.maxSuggestionChangesPerTurn
  const code = await createRoom(ana, 'Ana')
  const { page: bruno, context } = await joinRoom(browser, code, 'Bruno')
  await ana.getByRole('button', { name: 'Começar a partida' }).click()
  await expect(
    bruno.getByText(`Você ainda pode sugerir ${limit} vezes nesta jogada.`),
  ).toBeVisible()
  // Bruno troca de sugestão até esgotar (alternando entre duas opções)
  for (let i = 0; i < limit; i++) {
    const option = i % 2 === 0 ? /Ir a outro lugar/ : /Interrogar alguém/
    if (i % 2 === 0) await bruno.getByRole('button', { name: option }).click()
    else {
      await bruno.getByRole('button', { name: option }).click()
      await bruno.locator('.item:not([disabled])').first().click()
    }
    const left = limit - i - 1
    if (left > 0)
      await expect(
        bruno.getByText(
          left === 1
            ? 'Você ainda pode sugerir 1 vez nesta jogada.'
            : `Você ainda pode sugerir ${left} vezes nesta jogada.`,
        ),
      ).toBeVisible()
  }
  await expect(
    bruno.getByText(`Você já usou as ${limit} sugestões desta jogada.`, { exact: false }),
  ).toBeVisible()
  await expect(bruno.getByRole('button', { name: /Ir a outro lugar/ })).toBeDisabled()
  await expect(bruno.getByRole('button', { name: 'Interrogar alguém' })).toBeDisabled()
  await expect(bruno.getByRole('button', { name: 'Acusar agora' })).toBeDisabled()
  // tirar a sugestão continua possível; na jogada seguinte a contagem volta
  await expect(bruno.getByRole('button', { name: 'Tirar minha sugestão' })).toBeEnabled()
  await interrogate(ana)
  await bruno.getByRole('button', { name: 'OK' }).click()
  await interrogate(bruno)
  await ana.getByRole('button', { name: 'OK' }).click()
  await expect(
    bruno.getByText(`Você ainda pode sugerir ${limit} vezes nesta jogada.`),
  ).toBeVisible()
  await context.close()
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`telas online sem violações de acessibilidade (tema ${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    await page.getByRole('button', { name: 'Criar sala online' }).click()
    await settle(page)
    expect((await new AxeBuilder({ page }).analyze()).violations, 'criar sala').toEqual([])
    await expectTargets(page, 'criar sala')
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.getByRole('button', { name: 'Entrar com código' }).click()
    await settle(page)
    expect((await new AxeBuilder({ page }).analyze()).violations, 'entrar').toEqual([])
    await page.getByRole('button', { name: 'Voltar' }).click()
    await createRoom(page, 'Ana')
    await expect(page.getByRole('img', { name: /^QR code com o link da sala / })).toBeVisible()
    await expectTargets(page, 'lobby online')
    await settle(page)
    expect((await new AxeBuilder({ page }).analyze()).violations, 'lobby online').toEqual([])
  })
}

test('encerrar: só quem comanda a sala vê o botão, e todos veem a resposta', async ({
  page: ana,
  browser,
}) => {
  const code = await createRoom(ana, 'Ana')
  const { page: bruno, context } = await joinRoom(browser, code, 'Bruno')
  await ana.getByRole('button', { name: 'Começar a partida' }).click()
  await expect(bruno.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  await expect(bruno.getByRole('button', { name: 'Encerrar partida' })).toHaveCount(0)
  await ana.getByRole('button', { name: 'Encerrar partida' }).click()
  await expect(
    ana.getByText('O mistério termina para todos na sala.', { exact: false }),
  ).toBeVisible()
  await ana.getByRole('button', { name: 'Encerrar', exact: true }).click()
  for (const page of [ana, bruno]) {
    await expect(page.getByText('Partida encerrada')).toBeVisible()
    await expect(page.getByText('Vocês encerraram a partida. Esta era a resposta:')).toBeVisible()
  }
  // quem comanda pode pedir um novo mistério; Bruno espera
  await expect(ana.getByRole('button', { name: 'Novo mistério' })).toBeVisible()
  await expect(bruno.getByText('Esperando Ana pedir um novo mistério.')).toBeVisible()
  await context.close()
})
