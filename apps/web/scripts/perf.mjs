// Medições de desempenho (Etapa 6), fora do CI: simula um celular modesto com CPU 6 vezes mais
// lenta e rede 3G (1,6 Mb/s, 150 ms de latência) e mede o tamanho do pacote, a primeira
// pintura, a volta com o service worker e o tempo de resposta das telas do modo local.
// Uso: pnpm --filter @magnifier-cases/web build && pnpm --filter @magnifier-cases/web perf
// O tempo das telas inclui o clique do Playwright (alguns milissegundos a mais que o real).
import { chromium, devices } from '@playwright/test'
import { spawn } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const PORT = 4180
const URL = `http://localhost:${PORT}`
const CPU = 6
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: 200_000,
  uploadThroughput: 94_000,
}
const RUNS = 5

/** Tamanho comprimido (gzip) dos arquivos de uma extensão em dist/assets. */
function gzipSize(ext) {
  const dir = join(import.meta.dirname, '..', 'dist', 'assets')
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0)
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const s = (ms) => `${(ms / 1000).toFixed(2)} s`

async function throttle(page, network = true) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })
  if (network) {
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', NETWORK)
  }
  return cdp
}

async function fcp(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint')
          if (entry) resolve(entry.startTime)
        }).observe({ type: 'paint', buffered: true })
      }),
  )
}

async function timed(fn) {
  const start = performance.now()
  await fn()
  return performance.now() - start
}

const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: join(import.meta.dirname, '..'),
  stdio: 'ignore',
})
try {
  for (let i = 0; i < 50; i++) {
    if (
      await fetch(URL).then(
        (r) => r.ok,
        () => false,
      )
    )
      break
    await new Promise((r) => setTimeout(r, 200))
  }
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  )
  const results = { first: [], repeat: [], mystery: [], start: [], screen: [], confirm: [] }
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ ...devices['Pixel 7'], locale: 'pt-BR' })
    const page = await context.newPage()
    await throttle(page)
    await page.goto(`${URL}/?seed=${run + 1}&botDelay=0`)
    results.first.push(await fcp(page))
    // volta com o service worker já instalado
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
      timeout: 60_000,
    })
    await page.reload()
    results.repeat.push(await fcp(page))

    // telas do modo local (CPU lenta, sem rede)
    await page.getByRole('button', { name: 'Jogar neste aparelho' }).click()
    await page.locator('.seat').first().getByLabel('Apelido').fill('Ana')
    await page.getByRole('radio', { name: /Perito/ }).check()
    results.mystery.push(
      await timed(async () => {
        await page.getByRole('button', { name: 'Montar o mistério' }).click()
        await page.getByRole('button', { name: 'Começar a investigação' }).waitFor()
      }),
    )
    results.start.push(
      await timed(async () => {
        await page.getByRole('button', { name: 'Começar a investigação' }).click()
        await page.getByRole('button', { name: 'Interrogar alguém' }).waitFor()
      }),
    )
    results.screen.push(
      await timed(async () => {
        await page.getByRole('button', { name: 'Interrogar alguém' }).click()
        await page.locator('.item:not([disabled])').first().waitFor()
      }),
    )
    await page.locator('.item:not([disabled])').first().click()
    results.confirm.push(
      await timed(async () => {
        await page.getByRole('button', { name: 'Confirmar' }).click()
        await page.getByRole('button', { name: 'OK' }).waitFor()
      }),
    )
    await context.close()
  }
  await browser.close()

  console.log(`JavaScript (gzip): ${kb(gzipSize('.js'))}`)
  console.log(`CSS (gzip): ${kb(gzipSize('.css'))}`)
  console.log(`Mediana de ${RUNS} visitas (CPU ${CPU}×, 3G):`)
  console.log(`  primeira pintura, primeira visita: ${s(median(results.first))}`)
  console.log(`  primeira pintura, visita seguinte: ${s(median(results.repeat))}`)
  console.log(`  montar o mistério (Perito): ${s(median(results.mystery))}`)
  console.log(`  começar a investigação: ${s(median(results.start))}`)
  console.log(`  abrir a escolha de suspeito: ${s(median(results.screen))}`)
  console.log(`  confirmar e ver a pista: ${s(median(results.confirm))}`)
} finally {
  server.kill()
}
