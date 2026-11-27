// Mesa (Etapa 5): a tela grande mostra o jogo e os celulares são o controle. Roda contra o
// servidor local da Cloudflare (projeto "online"). A tela da mesa só existe em tela grande.
import AxeBuilder from '@axe-core/playwright'
import { devices, expect, test, type Browser, type Page } from '@playwright/test'
import { accuseUntilEnd, expectTargets, settle } from './helpers.ts'

const TV = {
  viewport: { width: 1280, height: 720 },
  screen: { width: 1280, height: 720 },
  locale: 'pt-BR',
}

/** axe nos temas claro e escuro (a mesa segue o tema do aparelho). */
async function noViolations(page: Page, where: string) {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await settle(page)
    expect(
      (await new AxeBuilder({ page }).analyze()).violations,
      `${where} (${colorScheme})`,
    ).toEqual([])
  }
}

async function phone(browser: Browser, code: string, name: string) {
  const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto(`/?sala=${code}`)
  await page.getByLabel('Apelido').fill(name)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  return { context, page }
}

test('mesa e dois celulares jogam até o fim', async ({ browser }) => {
  test.setTimeout(120_000)
  const tvContext = await browser.newContext(TV)
  const tv = await tvContext.newPage()
  await tv.goto('/')
  await tv.getByRole('button', { name: 'Abrir a mesa (tela grande)' }).click()
  const code = (await tv.locator('.code').innerText()).replace('·', '')
  // QR code com o link da sala, para os celulares entrarem pela câmera
  await expect(tv.getByRole('img', { name: /^QR code com o link da sala / })).toBeVisible()
  await noViolations(tv, 'lobby da mesa')
  await expectTargets(tv, 'lobby da mesa')

  const { page: ana, context: anaContext } = await phone(browser, code, 'Ana')
  const { page: bruno, context: brunoContext } = await phone(browser, code, 'Bruno')
  await expect(tv.locator('.players .chip', { hasText: 'Ana' })).toBeVisible()
  await expect(tv.locator('.players .chip', { hasText: 'Bruno' })).toBeVisible()
  // quem entrou primeiro comanda a sala
  await ana.getByRole('button', { name: 'Começar a partida' }).click()

  await expect(tv.getByText('decidindo agora')).toBeVisible()
  await expect(tv.getByText('Ana escolhe a ação no celular', { exact: false })).toBeVisible()
  await expect(tv.getByText('Nenhuma pista ainda.', { exact: false })).toBeVisible()
  await noViolations(tv, 'partida na mesa')
  await expectTargets(tv, 'partida na mesa')
  await expectTargets(bruno, 'celular de quem sugere')

  // Bruno sugere; a mesa mostra a sugestão
  await bruno.getByRole('button', { name: /Ir a outro lugar/ }).click()
  await expect(tv.getByText('Bruno: Ir a outro lugar')).toBeVisible()

  // Ana interroga; a mesa mostra a pista mais recente e o caderno compacto
  await ana.getByRole('button', { name: 'Interrogar alguém' }).click()
  await ana.locator('.item:not([disabled])').first().click()
  await ana.getByRole('button', { name: 'Confirmar' }).click()
  await expect(tv.getByText(/Pista 1 · .* · achada por Ana/i)).toBeVisible()
  await expect(tv.getByText('pistas no caderno')).toBeVisible()
  await expect(tv.getByText('Bruno escolhe a ação no celular', { exact: false })).toBeVisible()

  // joga até o fim acusando duplas diferentes
  const end = /Mistério resolvido|Tempo esgotado/
  await accuseUntilEnd([ana, bruno], async () => (await tv.getByText(end).count()) > 0)
  await expect(tv.getByText(end)).toBeVisible()
  await expect(tv.getByText('As pistas que levavam até a resposta')).toBeVisible()
  await noViolations(tv, 'revelação na mesa')
  await Promise.all([tvContext.close(), anaContext.close(), brunoContext.close()])
})

test('encerrar pelo celular de quem comanda: a mesa mostra a resposta', async ({ browser }) => {
  const tvContext = await browser.newContext(TV)
  const tv = await tvContext.newPage()
  await tv.goto('/')
  await tv.getByRole('button', { name: 'Abrir a mesa (tela grande)' }).click()
  const code = (await tv.locator('.code').innerText()).replace('·', '')
  const { page: ana, context: anaContext } = await phone(browser, code, 'Ana')
  const { page: bruno, context: brunoContext } = await phone(browser, code, 'Bruno')
  // só começa depois que os dois entraram (a partida precisa de 2 detetives)
  await expect(tv.locator('.players .chip', { hasText: 'Bruno' })).toBeVisible()
  await ana.getByRole('button', { name: 'Começar a partida' }).click()
  await expect(tv.getByText('decidindo agora')).toBeVisible()
  // a mesa não tem o botão; Bruno também não (quem comanda é Ana)
  await expect(tv.getByRole('button', { name: 'Encerrar partida' })).toHaveCount(0)
  await expect(bruno.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible()
  await expect(bruno.getByRole('button', { name: 'Encerrar partida' })).toHaveCount(0)
  await ana.getByRole('button', { name: 'Encerrar partida' }).click()
  await ana.getByRole('dialog').getByRole('button', { name: 'Encerrar', exact: true }).click()
  await expect(tv.getByText('Partida encerrada')).toBeVisible()
  await expect(tv.getByText('As pistas que levavam até a resposta')).toBeVisible()
  await noViolations(tv, 'mesa depois de encerrar')
  await Promise.all([tvContext.close(), anaContext.close(), brunoContext.close()])
})

test('em celular a mesa não aparece e o endereço da mesa mostra um aviso', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Jogar neste aparelho' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir a mesa (tela grande)' })).toHaveCount(0)
  await page.goto('/?mesa')
  await expect(
    page.getByText('A tela da mesa só abre em telas grandes', { exact: false }),
  ).toBeVisible()
  // celular deitado também não conta: vale o menor lado da tela física
  const landscape = await browser.newContext({
    viewport: { width: 844, height: 390 },
    screen: { width: 844, height: 390 },
    locale: 'pt-BR',
  })
  const wide = await landscape.newPage()
  await wide.goto('/')
  await expect(wide.getByRole('button', { name: 'Jogar neste aparelho' })).toBeVisible()
  await expect(wide.getByRole('button', { name: 'Abrir a mesa (tela grande)' })).toHaveCount(0)
  await Promise.all([context.close(), landscape.close()])
})
